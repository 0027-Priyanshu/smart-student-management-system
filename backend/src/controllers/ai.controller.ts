import { Request, Response, NextFunction } from 'express';
import PDFDocument from 'pdfkit';
import { RepoService } from '../services/repo.service';
import { 
  generateStudentSummary, 
  generateRecommendations, 
  generateAcademicInsights, 
  adminChatAssistant 
} from '../services/ai.service';

export class AIController {
  static async getStudentSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const student = await RepoService.findStudentById(req.params.studentId);
      if (!student) {
        return res.status(404).json({ error: 'Student profile not found' });
      }

      const courseCodes = student.enrolledCourses?.map((c: any) => c.code) || [];
      const results = await RepoService.findResults(req.params.studentId);
      
      let totalGradePoints = 0;
      let totalCredits = 0;
      results.forEach(r => {
        const courseCredits = r.courseId?.credits || 3;
        totalGradePoints += r.gpa * courseCredits;
        totalCredits += courseCredits;
      });
      const gpa = totalCredits > 0 ? totalGradePoints / totalCredits : 0.0;

      const attendanceLogs = await RepoService.findAttendance({ studentId: req.params.studentId });
      const totalDays = attendanceLogs.length;
      const presentDays = attendanceLogs.filter(a => a.status === 'Present' || a.status === 'Late').length;
      const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 100.0;

      const summary = await generateStudentSummary(
        student.name,
        student.grade,
        gpa,
        parseFloat(attendanceRate.toFixed(1)),
        courseCodes
      );

      return res.json({ summary });
    } catch (error) {
      next(error);
    }
  }

  static async getStudentRecommendations(req: Request, res: Response, next: NextFunction) {
    try {
      const student = await RepoService.findStudentById(req.params.studentId);
      if (!student) {
        return res.status(404).json({ error: 'Student profile not found' });
      }

      const results = await RepoService.findResults(req.params.studentId);
      let totalGradePoints = 0;
      let totalCredits = 0;
      
      const marksData = results.map(r => {
        const courseCredits = r.courseId?.credits || 3;
        totalGradePoints += r.gpa * courseCredits;
        totalCredits += courseCredits;
        
        return {
          courseName: r.courseId?.name || 'Course',
          internal: r.internal,
          external: r.external,
          assignment: r.assignment,
          practical: r.practical
        };
      });
      const gpa = totalCredits > 0 ? totalGradePoints / totalCredits : 0.0;

      const attendanceLogs = await RepoService.findAttendance({ studentId: req.params.studentId });
      const totalDays = attendanceLogs.length;
      const presentDays = attendanceLogs.filter(a => a.status === 'Present' || a.status === 'Late').length;
      const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 100.0;

      const analysis = await generateRecommendations(
        student.name,
        gpa,
        parseFloat(attendanceRate.toFixed(1)),
        marksData
      );

      return res.json(analysis);
    } catch (error) {
      next(error);
    }
  }

  static async getAcademicInsights(req: Request, res: Response, next: NextFunction) {
    try {
      const { students } = await RepoService.findStudents({}, 1, 1000);
      const totalStudents = students.length;
      
      const departmentCounts: { [key: string]: number } = {};
      let totalGpaSum = 0;
      let studentWithGradesCount = 0;

      for (const student of students) {
        departmentCounts[student.department] = (departmentCounts[student.department] || 0) + 1;
        
        const results = await RepoService.findResults(student._id || student.id);
        if (results.length > 0) {
          let totalGradePoints = 0;
          let totalCredits = 0;
          results.forEach(r => {
            const courseCredits = r.courseId?.credits || 3;
            totalGradePoints += r.gpa * courseCredits;
            totalCredits += courseCredits;
          });
          const gpa = totalCredits > 0 ? totalGradePoints / totalCredits : 0.0;
          totalGpaSum += gpa;
          studentWithGradesCount++;
        }
      }

      const avgGpa = studentWithGradesCount > 0 ? totalGpaSum / studentWithGradesCount : 3.0;

      const attendanceLogs = await RepoService.findAttendance({});
      const totalDays = attendanceLogs.length;
      const presentDays = attendanceLogs.filter(a => a.status === 'Present' || a.status === 'Late').length;
      const avgAttendance = totalDays > 0 ? (presentDays / totalDays) * 100 : 85.0;

      const insights = await generateAcademicInsights(
        totalStudents,
        avgGpa,
        avgAttendance,
        departmentCounts
      );

      // Detect weak students dynamically (GPA < 2.5 or Attendance < 75%)
      const weakStudents: any[] = [];
      for (const student of students) {
        // Attendance check
        const sAttendanceLogs = await RepoService.findAttendance({ studentId: student._id || student.id });
        const sTotalDays = sAttendanceLogs.length;
        const sPresentDays = sAttendanceLogs.filter(a => a.status === 'Present' || a.status === 'Late').length;
        const sAttendanceRate = sTotalDays > 0 ? (sPresentDays / sTotalDays) * 100 : 100.0;

        // GPA check
        const sResults = await RepoService.findResults(student._id || student.id);
        let sTotalGradePoints = 0;
        let sTotalCredits = 0;
        sResults.forEach(r => {
          const courseCredits = r.courseId?.credits || 3;
          sTotalGradePoints += r.gpa * courseCredits;
          sTotalCredits += courseCredits;
        });
        const sGpa = sTotalCredits > 0 ? sTotalGradePoints / sTotalCredits : 4.0; // default to perfect if no results marked

        if (sGpa < 2.5 || sAttendanceRate < 75) {
          weakStudents.push({
            id: student._id || student.id,
            name: student.name,
            email: student.email,
            enrollmentNo: student.enrollmentNo,
            department: student.department,
            gpa: parseFloat(sGpa.toFixed(2)),
            attendance: parseFloat(sAttendanceRate.toFixed(1)),
            reason: sGpa < 2.5 && sAttendanceRate < 75 
              ? 'Low GPA & Low Attendance' 
              : sGpa < 2.5 
              ? 'Low GPA (< 2.5)' 
              : 'Low Attendance (< 75%)'
          });
        }
      }

      return res.json({ 
        insights,
        metrics: {
          totalStudents,
          avgGpa: parseFloat(avgGpa.toFixed(2)),
          avgAttendance: parseFloat(avgAttendance.toFixed(1)),
          departmentCounts
        },
        weakStudents
      });
    } catch (error) {
      next(error);
    }
  }

  static async chat(req: Request, res: Response, next: NextFunction) {
    try {
      const { message, history } = req.body;
      const reply = await adminChatAssistant(message, history || []);
      return res.json({ reply });
    } catch (error) {
      next(error);
    }
  }

  static async downloadReportPDF(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.params.studentId;
      const student = await RepoService.findStudentById(studentId);
      if (!student) {
        return res.status(404).json({ error: 'Student profile not found' });
      }

      // Fetch stats
      const results = await RepoService.findResults(studentId);
      let totalGradePoints = 0;
      let totalCredits = 0;
      const marksData = results.map(r => {
        const courseCredits = r.courseId?.credits || 3;
        totalGradePoints += r.gpa * courseCredits;
        totalCredits += courseCredits;
        return {
          code: r.courseId?.code || 'CS',
          name: r.courseId?.name || 'Course',
          internal: r.internal,
          external: r.external,
          assignment: r.assignment,
          practical: r.practical,
          grade: r.grade,
          gpa: r.gpa
        };
      });
      const gpa = totalCredits > 0 ? totalGradePoints / totalCredits : 0.0;

      const attendanceLogs = await RepoService.findAttendance({ studentId });
      const totalDays = attendanceLogs.length;
      const presentDays = attendanceLogs.filter(a => a.status === 'Present' || a.status === 'Late').length;
      const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 100.0;

      const summary = await generateStudentSummary(
        student.name,
        student.grade,
        gpa,
        parseFloat(attendanceRate.toFixed(1)),
        student.enrolledCourses?.map((c: any) => c.code) || []
      );

      const analysis = await generateRecommendations(
        student.name,
        gpa,
        parseFloat(attendanceRate.toFixed(1)),
        marksData
      );

      const doc = new PDFDocument({ margin: 40 });
      res.setHeader('Content-Disposition', `attachment; filename="${student.name.replace(/\s+/g, '_')}_AI_Report.pdf"`);
      res.setHeader('Content-Type', 'application/pdf');
      doc.pipe(res);

      // Report Header Branding
      doc.fillColor('#1f2937').fontSize(24).text('EDUMANAGER SMART INSIGHTS', { bold: true } as any);
      doc.fillColor('#8a5cf6').fontSize(12).text('Artificial Intelligence Performance Report', { bold: true } as any);
      doc.moveDown(1.5);

      // Student Profile Information Box
      doc.fillColor('#111827').fontSize(14).text('STUDENT PROFILE', { underline: true });
      doc.fontSize(10).fillColor('#374151');
      doc.text(`Name: ${student.name}`, 40, 110);
      doc.text(`Enrollment No: ${student.enrollmentNo}`, 40, 125);
      doc.text(`Department: ${student.department}`, 40, 140);
      doc.text(`Semester: ${student.semester}`, 40, 155);

      doc.text(`Current Cumulative GPA: ${gpa.toFixed(2)}`, 300, 110);
      doc.text(`Overall Attendance Rate: ${attendanceRate.toFixed(1)}%`, 300, 125);
      doc.text(`Academic Level: ${student.grade}`, 300, 140);
      doc.moveDown(4.5);

      // AI Summary Section
      doc.fillColor('#8a5cf6').fontSize(14).text('AI SUMMARY OVERVIEW', { underline: true });
      doc.moveDown(0.5);
      doc.fillColor('#111827').fontSize(10).text(summary, { lineGap: 4 });
      doc.moveDown(2);

      // Performance Breakdown Tables
      doc.fillColor('#8a5cf6').fontSize(14).text('COURSE PERFORMANCE BREAKDOWN', { underline: true });
      doc.moveDown(0.5);

      // Headers
      doc.fillColor('#111827').fontSize(10);
      doc.text('Code', 40, 310, { width: 60, bold: true } as any);
      doc.text('Course Name', 100, 310, { width: 220, bold: true } as any);
      doc.text('Internal', 330, 310, { width: 50, bold: true } as any);
      doc.text('External', 390, 310, { width: 50, bold: true } as any);
      doc.text('Grade', 450, 310, { width: 40, bold: true } as any);
      doc.text('GPA', 500, 310, { width: 40, bold: true } as any);

      doc.moveTo(40, 325).lineTo(550, 325).strokeColor('#e5e7eb').stroke();

      let tableY = 335;
      marksData.forEach(item => {
        doc.fillColor('#374151').fontSize(9);
        doc.text(item.code, 40, tableY);
        doc.text(item.name, 100, tableY, { width: 220 });
        doc.text(item.internal.toString(), 330, tableY);
        doc.text(item.external.toString(), 390, tableY);
        doc.text(item.grade, 450, tableY);
        doc.text(item.gpa.toFixed(1), 500, tableY);
        tableY += 20;
      });

      doc.moveDown(3);

      // Recommendations Section
      doc.fillColor('#8a5cf6').fontSize(14).text('AI PREDICTIVE RECOMMENDATIONS', { underline: true });
      doc.moveDown(0.5);

      if (analysis.weakSubjects.length > 0) {
        doc.fillColor('#ef4444').fontSize(10).text(`Detected Critical Weak Areas: ${analysis.weakSubjects.join(', ')}`, { bold: true } as any);
        doc.moveDown(0.5);
      }

      doc.fillColor('#111827').fontSize(10);
      analysis.recommendations.forEach((rec, idx) => {
        doc.text(`${idx + 1}. ${rec}`, { lineGap: 3 });
        doc.moveDown(0.5);
      });

      // Footer
      doc.moveDown(4);
      doc.moveTo(40, 720).lineTo(550, 720).strokeColor('#e5e7eb').stroke();
      doc.fontSize(8).fillColor('#9ca3af').text('Report powered by Google Gemini AI Engine. Confidential Student Academic Record.', 40, 730, { align: 'center' });

      doc.end();
    } catch (error) {
      next(error);
    }
  }
}
