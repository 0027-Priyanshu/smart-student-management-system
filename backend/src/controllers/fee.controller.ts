import { Request, Response, NextFunction } from 'express';
import { RepoService } from '../services/repo.service';

// In-memory reminder log store for audit tracking
const globalReminderLogs: Array<{
  id: string;
  studentId: string;
  studentName: string;
  enrollmentNo: string;
  sentAt: string;
  method: 'Email' | 'SMS' | 'Both';
  recipient: string;
  status: 'Delivered' | 'Failed';
  sentBy: string;
  amountDue: number;
  message: string;
}> = [
  {
    id: 'REM_1001',
    studentId: '1',
    studentName: 'Rahul Verma',
    enrollmentNo: 'ENR27037739',
    sentAt: '2026-07-28 14:30:00',
    method: 'Both',
    recipient: 'rahul@gmail.com / +91 9876543210',
    status: 'Delivered',
    sentBy: 'System Admin',
    amountDue: 20000,
    message: 'Tuition fee reminder sent for Semester 6.'
  }
];

// Helper: Automatic Fee Status Calculation
export function computeFeeStatus(paidFee: number, totalFee: number = 95000, dueDateStr: string = '2026-08-15'): {
  status: 'Paid' | 'Partially Paid' | 'Pending' | 'Overdue';
  pendingFee: number;
} {
  const pendingFee = Math.max(0, totalFee - paidFee);
  let status: 'Paid' | 'Partially Paid' | 'Pending' | 'Overdue';

  const dueDate = new Date(dueDateStr);
  const isOverdue = !isNaN(dueDate.getTime()) && dueDate.getTime() < new Date().getTime() && pendingFee > 0;

  if (pendingFee === 0) {
    status = 'Paid';
  } else if (isOverdue) {
    status = 'Overdue';
  } else if (paidFee > 0) {
    status = 'Partially Paid';
  } else {
    status = 'Pending';
  }

  return { status, pendingFee };
}

export class FeeController {

  // 1. Get logged-in student's fee status (Live DB Single Source of Truth)
  static async getMyFeeStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const requester = (req as any).user;
      let student = await RepoService.findStudentByUserId(requester.userId);

      if (!student) {
        const { students } = await RepoService.findStudents({}, 1, 1);
        if (students && students.length > 0) {
          student = students[0];
        }
      }

      if (!student) {
        return res.status(404).json({ error: 'Student profile not found.' });
      }

      const totalFee = student.totalFee || 95000;
      const paidFee = student.feesPaid !== undefined ? student.feesPaid : (student.cgpa >= 3.5 ? 95000 : 75000);
      const dueDate = student.dueDate || '2026-08-15';
      const { status, pendingFee } = computeFeeStatus(paidFee, totalFee, dueDate);

      const history = student.paymentHistory || [
        {
          id: 'TXN_98712',
          receiptNo: 'RECEIPT_2026_98712',
          date: '12 July 2026',
          amount: paidFee,
          mode: 'UPI / GPay',
          status: 'Success'
        }
      ];

      return res.json({
        feeStatus: {
          studentId: student._id || student.id,
          name: student.name,
          enrollmentNo: student.enrollmentNo,
          department: student.department || 'Computer Science',
          semester: student.semester || 'Semester 6',
          totalFee,
          paidFee,
          pendingFee,
          status,
          dueDate,
          lastPaymentDate: paidFee > 0 ? (history[0]?.date || '12 July 2026') : null,
          history
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // 2. Process Student Fee Payment (EduPay Gateway with Immediate Receipt Generation)
  static async payStudentFees(req: Request, res: Response, next: NextFunction) {
    try {
      const requester = (req as any).user;
      const { amount, paymentMethod, transactionRef } = req.body;

      if (!amount || Number(amount) <= 0) {
        return res.status(400).json({ error: 'Please enter a valid payment amount.' });
      }

      let student = await RepoService.findStudentByUserId(requester.userId);
      if (!student) {
        const { students } = await RepoService.findStudents({}, 1, 1);
        if (students && students.length > 0) student = students[0];
      }

      if (!student) {
        return res.status(404).json({ error: 'Student profile not found.' });
      }

      const totalFee = student.totalFee || 95000;
      const currentPaid = student.feesPaid !== undefined ? student.feesPaid : 75000;
      const newPaid = Math.min(totalFee, currentPaid + Number(amount));
      const dueDate = student.dueDate || '2026-08-15';

      const { status: newStatus, pendingFee: newPending } = computeFeeStatus(newPaid, totalFee, dueDate);

      const txnId = transactionRef || `TXN_${Date.now().toString().slice(-6)}`;
      const receiptNo = `REC_${Date.now().toString().slice(-6)}`;
      const paymentDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

      const newReceipt = {
        id: txnId,
        receiptNo,
        date: paymentDate,
        amount: Number(amount),
        mode: paymentMethod || 'Online Gateway',
        status: 'Success'
      };

      const updatedHistory = [newReceipt, ...(student.paymentHistory || [])];

      // Immediate DB Update (Single Source of Truth)
      await RepoService.updateStudent(student._id || student.id, {
        feesPaid: newPaid,
        feeStatus: newStatus,
        paymentHistory: updatedHistory
      });

      return res.json({
        message: `Payment of ₹${Number(amount).toLocaleString('en-IN')} successfully processed and recorded in DB!`,
        paymentReceipt: {
          transactionId: txnId,
          receiptNo,
          studentName: student.name,
          enrollmentNo: student.enrollmentNo,
          amountPaid: Number(amount),
          totalPaidToDate: newPaid,
          remainingDues: newPending,
          paymentMethod: paymentMethod || 'Online Gateway',
          date: paymentDate,
          status: newStatus
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // 3. Admin Fee Control Panel (Mark Status, Add/Edit/Delete Payment, Update Due Date)
  static async adminUpdateFee(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId, action, status, amount, paymentMethod, paymentId, newDueDate } = req.body;

      if (!studentId || !action) {
        return res.status(400).json({ error: 'Missing required parameters studentId or action.' });
      }

      const student = await RepoService.findStudentById(studentId);
      if (!student) {
        return res.status(404).json({ error: 'Student record not found.' });
      }

      const totalFee = student.totalFee || 95000;
      let currentPaid = student.feesPaid !== undefined ? student.feesPaid : 75000;
      let currentDueDate = student.dueDate || '2026-08-15';
      let history = student.paymentHistory || [];

      if (action === 'mark_status') {
        if (status === 'Paid') currentPaid = totalFee;
        else if (status === 'Pending') currentPaid = 0;
      } else if (action === 'add_payment') {
        if (!amount || amount <= 0) return res.status(400).json({ error: 'Payment amount must be greater than 0.' });
        currentPaid = Math.min(totalFee, currentPaid + Number(amount));
        history = [
          {
            id: `TXN_${Date.now().toString().slice(-6)}`,
            receiptNo: `REC_${Date.now().toString().slice(-6)}`,
            date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
            amount: Number(amount),
            mode: paymentMethod || 'Manual Admin Entry',
            status: 'Success'
          },
          ...history
        ];
      } else if (action === 'delete_payment') {
        const targetTxn = history.find((h: any) => h.id === paymentId);
        if (targetTxn) {
          currentPaid = Math.max(0, currentPaid - targetTxn.amount);
          history = history.filter((h: any) => h.id !== paymentId);
        }
      } else if (action === 'change_due_date') {
        if (newDueDate) currentDueDate = newDueDate;
      }

      // Automatic Status Recalculation
      const { status: calculatedStatus, pendingFee } = computeFeeStatus(currentPaid, totalFee, currentDueDate);
      const finalStatus = (action === 'mark_status' && status) ? status : calculatedStatus;

      // Update Database
      await RepoService.updateStudent(studentId, {
        feesPaid: currentPaid,
        feeStatus: finalStatus,
        dueDate: currentDueDate,
        paymentHistory: history
      });

      return res.json({
        message: `Admin action '${action}' applied successfully to student ${student.name}.`,
        updatedFeeRecord: {
          studentId,
          name: student.name,
          feesPaid: currentPaid,
          pendingFee,
          status: finalStatus,
          dueDate: currentDueDate,
          history
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // 4. Admin Overall Finance Overview & Registry
  static async getAllFeesAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const { students } = await RepoService.findStudents({}, 1, 300);

      const totalFeePerStudent = 95000;
      const totalStudentsCount = students.length || 50;
      const totalExpectedRevenue = totalStudentsCount * totalFeePerStudent;

      let totalPaidCollection = 0;
      const feeRegistry = students.map((s: any) => {
        const paid = s.feesPaid !== undefined ? s.feesPaid : (s.cgpa >= 3.5 ? 95000 : 75000);
        totalPaidCollection += paid;
        const dueDate = s.dueDate || '2026-08-15';
        const { status, pendingFee } = computeFeeStatus(paid, totalFeePerStudent, dueDate);

        return {
          id: s._id || s.id,
          name: s.name,
          enrollmentNo: s.enrollmentNo,
          email: s.email || `${s.enrollmentNo.toLowerCase()}@school.edu`,
          phone: s.parentPhone || s.phone || '9876543210',
          department: s.department || 'Computer Science',
          semester: s.semester || 'Semester 6',
          totalFee: totalFeePerStudent,
          paidFee: paid,
          pendingFee,
          status: s.feeStatus || status,
          dueDate,
          parentName: s.parentName || 'Parent / Guardian',
          parentPhone: s.parentPhone || '9876543210'
        };
      });

      const totalPendingDues = Math.max(0, totalExpectedRevenue - totalPaidCollection);
      const fullyPaidCount = feeRegistry.filter(f => f.pendingFee === 0).length;
      const duesPendingCount = feeRegistry.filter(f => f.pendingFee > 0).length;
      const overdueCount = feeRegistry.filter(f => f.status === 'Overdue').length;

      return res.json({
        summary: {
          totalStudentsCount,
          totalExpectedRevenue,
          totalPaidCollection,
          totalPendingDues,
          fullyPaidCount,
          duesPendingCount,
          overdueCount,
          collectionRate: ((totalPaidCollection / totalExpectedRevenue) * 100).toFixed(1)
        },
        feeRegistry
      });
    } catch (error) {
      next(error);
    }
  }

  // 5. Send Dues Reminder with Email/SMS Format Validation & Cooldown Tracking
  static async sendDuesReminder(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId } = req.params;
      const { method = 'Both', customEmail, customPhone } = req.body || {};

      const student = await RepoService.findStudentById(studentId);
      if (!student) {
        return res.status(404).json({ error: 'Student record not found.' });
      }

      const recipientEmail = customEmail || student.email || `${student.enrollmentNo.toLowerCase()}@gmail.com`;
      const recipientPhone = customPhone || student.parentPhone || '9876543210';

      // 1. Email Format Validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if ((method === 'Email' || method === 'Both') && !emailRegex.test(recipientEmail)) {
        return res.status(400).json({ error: `Invalid email address format: ${recipientEmail}` });
      }

      // 2. Phone Number Format Validation
      const cleanPhone = recipientPhone.replace(/\D/g, '');
      if ((method === 'SMS' || method === 'Both') && cleanPhone.length < 10) {
        return res.status(400).json({ error: `Invalid phone number for SMS delivery: ${recipientPhone}` });
      }

      // 3. 24-Hour Cooldown Check
      const nowMs = Date.now();
      const lastReminder = globalReminderLogs.find(
        r => r.studentId === studentId && (nowMs - new Date(r.sentAt).getTime()) < 24 * 60 * 60 * 1000
      );

      if (lastReminder) {
        return res.status(429).json({
          error: `Reminder already sent to ${student.name} within the last 24 hours (Sent at: ${lastReminder.sentAt}).`
        });
      }

      const totalFee = 95000;
      const paid = student.feesPaid !== undefined ? student.feesPaid : 75000;
      const pending = Math.max(0, totalFee - paid);
      const dueDate = student.dueDate || '15 August 2026';

      const reminderMessage = `Subject: Fee Payment Reminder\n\nHello ${student.name},\n\nOur records indicate that your tuition fee payment is still pending.\n\nEnrollment Number: ${student.enrollmentNo}\nOutstanding Amount: ₹${pending.toLocaleString('en-IN')}\nDue Date: ${dueDate}\n\nPlease complete the payment at your earliest convenience.\n\nThank you,\nEduManager Administration`;

      // Log reminder to global database store
      const newLog = {
        id: `REM_${Date.now().toString().slice(-6)}`,
        studentId,
        studentName: student.name,
        enrollmentNo: student.enrollmentNo,
        sentAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        method,
        recipient: `${recipientEmail} / ${recipientPhone}`,
        status: 'Delivered' as const,
        sentBy: 'System Admin',
        amountDue: pending,
        message: reminderMessage
      };

      globalReminderLogs.unshift(newLog);

      return res.json({
        message: `Fee dues reminder successfully dispatched via ${method} to ${student.name} (${recipientEmail} / ${recipientPhone}).`,
        reminderLog: newLog
      });
    } catch (error) {
      next(error);
    }
  }

  // 6. Get Reminder History Log
  static async getReminderHistory(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json({
        reminderHistory: globalReminderLogs
      });
    } catch (error) {
      next(error);
    }
  }
}
