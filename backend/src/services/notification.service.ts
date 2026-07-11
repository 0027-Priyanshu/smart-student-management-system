import { sendEmail } from './email.service';

export class NotificationService {
  /**
   * 1. Send student registration notification
   */
  static async sendStudentRegistrationNotification(
    studentEmail: string,
    studentName: string,
    enrollmentNo: string
  ): Promise<boolean> {
    const subject = 'Welcome to EduManager - Registration Confirmation';
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
        <h2 style="color: #8a5cf6;">Welcome to EduManager!</h2>
        <p>Dear <strong>${studentName}</strong>,</p>
        <p>Your student profile account has been successfully registered in the system.</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Enrollment Number:</strong> ${enrollmentNo}</p>
          <p style="margin: 5px 0 0 0;"><strong>Username / Email:</strong> ${studentEmail}</p>
        </div>
        <p>You can now log in to access your course registry, gradebook, attendance visualizers, and the AI companion.</p>
        <p style="margin-top: 30px; font-size: 11px; color: #9ca3af;">EduManager Academic Administration Office</p>
      </div>
    `;
    return await sendEmail(studentEmail, subject, html);
  }

  /**
   * 2. Send course assignment confirmation
   */
  static async sendCourseAssignmentNotification(
    studentEmail: string,
    studentName: string,
    courseName: string,
    courseCode: string
  ): Promise<boolean> {
    const subject = `Course Enrollment Confirmation: ${courseCode}`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
        <h2 style="color: #06b6d4;">Course Enrollment Confirmed</h2>
        <p>Dear <strong>${studentName}</strong>,</p>
        <p>You have been officially enrolled in a new course for the current semester:</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Course Code:</strong> ${courseCode}</p>
          <p style="margin: 5px 0 0 0;"><strong>Course Name:</strong> ${courseName}</p>
        </div>
        <p>Please review your updated gradebook and class tracker for scheduled lecture updates.</p>
        <p style="margin-top: 30px; font-size: 11px; color: #9ca3af;">EduManager Academic Registry Office</p>
      </div>
    `;
    return await sendEmail(studentEmail, subject, html);
  }

  /**
   * 3. Hook: Attendance Alerts (Stubbed)
   */
  static async triggerAttendanceAlert(
    studentEmail: string,
    studentName: string,
    date: string,
    courseName: string,
    status: string
  ): Promise<void> {
    console.log(`[Stub Notification Hook] Triggering attendance alert email to ${studentEmail} for course "${courseName}" on ${date} (Status: ${status})`);
  }

  /**
   * 4. Hook: Marks Published (Stubbed)
   */
  static async triggerMarksPublishedAlert(
    studentEmail: string,
    studentName: string,
    courseName: string,
    grade: string,
    gpa: number
  ): Promise<void> {
    console.log(`[Stub Notification Hook] Triggering marks published email to ${studentEmail} for course "${courseName}" (Grade: ${grade}, GPA: ${gpa})`);
  }

  /**
   * 5. Hook: Fee Reminders (Stubbed)
   */
  static async triggerFeeReminderAlert(
    studentEmail: string,
    studentName: string,
    amountDue: number,
    dueDate: string
  ): Promise<void> {
    console.log(`[Stub Notification Hook] Triggering fee reminder email to ${studentEmail} for amount $${amountDue} due on ${dueDate}`);
  }
}
