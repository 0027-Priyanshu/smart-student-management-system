import nodemailer from 'nodemailer';
import { RepoService } from './repo.service';

export interface SendReminderParams {
  studentName: string;
  enrollmentNo: string;
  email: string;
  phone: string;
  pendingAmount?: number;
  dueDate?: string;
  method: 'Email' | 'SMS' | 'Both';
  sentBy?: string;
}

export type DeliveryStatus = 'SENT' | 'SIMULATED' | 'NOT_CONFIGURED' | 'FAILED';

export interface DeliveryReport {
  referenceId: string;
  timestamp: string;
  studentName: string;
  enrollmentNo: string;
  emailStatus: DeliveryStatus;
  smsStatus: DeliveryStatus;
  emailError: string | null;
  smsError: string | null;
  emailMessageId: string | null;
  smsSid: string | null;
  recipientEmail: string;
  recipientPhone: string;
  sentBy: string;
}

export class NotificationService {
  
  // 1. Send Email via Nodemailer SMTP (or Simulated if env credentials missing)
  static async sendEmail(to: string, subject: string, htmlContent: string, textContent: string): Promise<{
    success: boolean;
    status: DeliveryStatus;
    messageId?: string;
    error?: string;
  }> {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT) || 587;
    const smtpUser = process.env.SMTP_USER || process.env.SMTP_USERNAME;
    const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
    const emailFrom = process.env.EMAIL_FROM || `EduManager AI <noreply@edumanager.edu>`;

    // If real SMTP is configured in .env, send real email
    if (smtpHost && smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass
          },
          tls: {
            rejectUnauthorized: false
          }
        });

        const info = await transporter.sendMail({
          from: emailFrom,
          to,
          subject,
          text: textContent,
          html: htmlContent
        });

        return {
          success: true,
          status: 'SENT',
          messageId: info.messageId
        };
      } catch (err: any) {
        console.error('❌ Nodemailer Transmission Error:', err.message);
        return {
          success: false,
          status: 'FAILED',
          error: err.message || 'SMTP transmission failure.'
        };
      }
    }

    // Explicit Simulated Mode
    console.log(`✉️ [SIMULATED EMAIL DISPATCH] To: ${to} | Subject: ${subject}`);
    return {
      success: true,
      status: 'SIMULATED',
      messageId: `SIMULATED_EMAIL_${Date.now()}`
    };
  }

  // 2. Send SMS via Twilio / Gateway (or Simulated if env credentials missing)
  static async sendSms(toPhone: string, messageText: string): Promise<{
    success: boolean;
    status: DeliveryStatus;
    smsSid?: string;
    error?: string;
  }> {
    const twilioSid = process.env.TWILIO_ACCOUNT_SID || process.env.SMS_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN || process.env.SMS_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER || process.env.SMS_FROM;

    if (twilioSid && twilioToken && twilioPhone) {
      try {
        const cleanNumber = toPhone.startsWith('+') ? toPhone : `+91${toPhone.replace(/\D/g, '')}`;
        
        const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            From: twilioPhone,
            To: cleanNumber,
            Body: messageText
          })
        });

        const data: any = await response.json();
        if (response.ok && data.sid) {
          return { success: true, status: 'SENT', smsSid: data.sid };
        } else {
          return { success: false, status: 'FAILED', error: data.message || 'SMS Gateway rejected transmission.' };
        }
      } catch (err: any) {
        return { success: false, status: 'FAILED', error: err.message || 'SMS transmission request failed.' };
      }
    }

    // Explicit Simulated Mode
    const cleanNumber = toPhone.startsWith('+') ? toPhone : `+91${toPhone.replace(/\D/g, '')}`;
    console.log(`📱 [SIMULATED SMS DISPATCH] To: ${cleanNumber} | Body: ${messageText}`);
    return {
      success: true,
      status: 'SIMULATED',
      smsSid: `SIMULATED_SMS_${Date.now()}`
    };
  }

  // 3. Orchestrate Full End-to-End Reminder Dispatch
  static async dispatchReminder(params: SendReminderParams): Promise<DeliveryReport> {
    const refId = `MSG-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const timestamp = new Date().toISOString();

    const subject = `Academic Notification - ${params.enrollmentNo}`;
    const textContent = `Subject: Academic Notification\n\nHello ${params.studentName},\n\nThis is an official academic notification regarding your student profile.\n\nEnrollment Number: ${params.enrollmentNo}\nDate: ${params.dueDate || new Date().toISOString().split('T')[0]}\n\nThank you,\nEduManager Administration`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8fafc; color: #1e293b;">
        <div style="max-width: 550px; margin: 0 auto; background: white; border-radius: 12px; padding: 25px; border: 1px solid #e2e8f0;">
          <h2 style="color: #2563eb; margin-top: 0;">EduManager Academic Alert</h2>
          <p>Hello <strong>${params.studentName}</strong>,</p>
          <p>This is an official notification regarding your academic status and class updates.</p>
          <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; font-size: 14px; margin: 15px 0;">
            <p style="margin: 5px 0;"><strong>Enrollment Number:</strong> <code>${params.enrollmentNo}</code></p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${params.dueDate || new Date().toISOString().split('T')[0]}</p>
          </div>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #64748b;">EduManager Administration System</p>
        </div>
      </div>
    `;

    let emailStatus: DeliveryStatus = 'NOT_CONFIGURED';
    let smsStatus: DeliveryStatus = 'NOT_CONFIGURED';
    let emailError: string | null = null;
    let smsError: string | null = null;
    let emailMessageId: string | null = null;
    let smsSid: string | null = null;

    // Dispatch Email
    if (params.method === 'Email' || params.method === 'Both') {
      const emailRes = await this.sendEmail(params.email, subject, htmlContent, textContent);
      emailStatus = emailRes.status;
      if (emailRes.success) {
        emailMessageId = emailRes.messageId || null;
      } else {
        emailError = emailRes.error || 'Email delivery failed.';
      }
    }

    // Dispatch SMS
    if (params.method === 'SMS' || params.method === 'Both') {
      const smsRes = await this.sendSms(params.phone, `EduManager Academic Alert: Hello ${params.studentName}, please check your student portal for academic updates.`);
      smsStatus = smsRes.status;
      if (smsRes.success) {
        smsSid = smsRes.smsSid || null;
      } else {
        smsError = smsRes.error || 'SMS delivery failed.';
      }
    }

    return {
      referenceId: refId,
      timestamp,
      studentName: params.studentName,
      enrollmentNo: params.enrollmentNo,
      emailStatus,
      smsStatus,
      emailError,
      smsError,
      emailMessageId,
      smsSid,
      recipientEmail: params.email,
      recipientPhone: params.phone,
      sentBy: params.sentBy || 'System Admin'
    };
  }

  // 4. System Notification Event Hooks
  static async triggerAttendanceAlert(studentEmail: string, ...args: any[]): Promise<void> {
    console.log(`[NotificationService] Attendance event logged for ${studentEmail}:`, args);
  }

  static async sendStudentRegistrationNotification(studentEmail: string, ...args: any[]): Promise<void> {
    console.log(`[NotificationService] Registration event for ${studentEmail}:`, args);
  }

  static async sendCourseAssignmentNotification(studentEmail: string, ...args: any[]): Promise<void> {
    console.log(`[NotificationService] Course assignment event for ${studentEmail}:`, args);
  }

  static async triggerMarksPublishedAlert(studentEmail: string, ...args: any[]): Promise<void> {
    console.log(`[NotificationService] Marks published event for ${studentEmail}:`, args);
  }
}
