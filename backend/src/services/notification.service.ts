import nodemailer from 'nodemailer';

export interface SendReminderParams {
  studentName: string;
  enrollmentNo: string;
  email: string;
  phone: string;
  pendingAmount: number;
  dueDate: string;
  method: 'Email' | 'SMS' | 'Both';
  sentBy?: string;
}

export interface DeliveryReport {
  referenceId: string;
  timestamp: string;
  studentName: string;
  enrollmentNo: string;
  emailStatus: 'Delivered' | 'Failed' | 'Not Configured';
  smsStatus: 'Delivered' | 'Failed' | 'Not Configured';
  emailError: string | null;
  smsError: string | null;
  emailMessageId: string | null;
  smsSid: string | null;
  recipientEmail: string;
  recipientPhone: string;
  sentBy: string;
}

export class NotificationService {
  
  // 1. Send Email via Nodemailer SMTP
  static async sendEmail(to: string, subject: string, htmlContent: string, textContent: string): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT) || 587;
    const smtpUser = process.env.SMTP_USER || process.env.SMTP_USERNAME;
    const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
    const emailFrom = process.env.EMAIL_FROM || `EduManager AI <noreply@edumanager.edu>`;

    // If SMTP is not configured in .env, capture explicit configuration error
    if (!smtpHost || !smtpUser || !smtpPass) {
      console.warn('⚠️ SMTP Configuration Warning: SMTP_HOST/SMTP_USER not set in environment variables.');
      return {
        success: false,
        error: 'SMTP service credentials (SMTP_HOST / SMTP_USER) are not configured in the backend environment (.env file).'
      };
    }

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
        messageId: info.messageId
      };
    } catch (err: any) {
      console.error('❌ Nodemailer Transmission Error:', err);
      return {
        success: false,
        error: err.message || 'SMTP transmission failure.'
      };
    }
  }

  // 2. Send SMS via SMS Provider / Gateway Interface
  static async sendSms(toPhone: string, messageText: string): Promise<{
    success: boolean;
    smsSid?: string;
    error?: string;
  }> {
    const twilioSid = process.env.TWILIO_ACCOUNT_SID || process.env.SMS_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN || process.env.SMS_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER || process.env.SMS_FROM;

    if (!twilioSid || !twilioToken || !twilioPhone) {
      return {
        success: false,
        error: 'SMS Gateway credentials (TWILIO_ACCOUNT_SID / SMS_ACCOUNT_SID) are not configured in the backend environment (.env file).'
      };
    }

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
        return { success: true, smsSid: data.sid };
      } else {
        return { success: false, error: data.message || 'SMS Gateway API rejected request.' };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'SMS transmission request failed.' };
    }
  }

  // 3. Orchestrate Full End-to-End Reminder Dispatch
  static async dispatchReminder(params: SendReminderParams): Promise<DeliveryReport> {
    const refId = `MSG-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const timestamp = new Date().toISOString();

    const subject = `Fee Payment Reminder - ${params.enrollmentNo}`;
    const textContent = `Subject: Fee Payment Reminder\n\nHello ${params.studentName},\n\nOur records indicate that your tuition fee payment is still pending.\n\nEnrollment Number: ${params.enrollmentNo}\nOutstanding Amount: ₹${params.pendingAmount.toLocaleString('en-IN')}\nDue Date: ${params.dueDate}\n\nPlease complete the payment at your earliest convenience.\n\nThank you,\nEduManager Administration`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8fafc; color: #1e293b;">
        <div style="max-width: 550px; margin: 0 auto; background: white; border-radius: 12px; padding: 25px; border: 1px solid #e2e8f0;">
          <h2 style="color: #2563eb; margin-top: 0;">EduManager AI Fee Reminder</h2>
          <p>Hello <strong>${params.studentName}</strong>,</p>
          <p>Our records indicate that your tuition fee payment is currently outstanding.</p>
          <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; font-size: 14px; margin: 15px 0;">
            <p style="margin: 5px 0;"><strong>Enrollment Number:</strong> <code>${params.enrollmentNo}</code></p>
            <p style="margin: 5px 0;"><strong>Outstanding Amount:</strong> <span style="color: #ef4444; font-weight: bold;">₹${params.pendingAmount.toLocaleString('en-IN')}</span></p>
            <p style="margin: 5px 0;"><strong>Due Date:</strong> ${params.dueDate}</p>
          </div>
          <p>Please complete your fee payment through the EduPay Student Portal.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #64748b;">EduManager Administration System</p>
        </div>
      </div>
    `;

    let emailStatus: 'Delivered' | 'Failed' | 'Not Configured' = 'Not Configured';
    let smsStatus: 'Delivered' | 'Failed' | 'Not Configured' = 'Not Configured';
    let emailError: string | null = null;
    let smsError: string | null = null;
    let emailMessageId: string | null = null;
    let smsSid: string | null = null;

    // Dispatch Email
    if (params.method === 'Email' || params.method === 'Both') {
      const emailRes = await this.sendEmail(params.email, subject, htmlContent, textContent);
      if (emailRes.success) {
        emailStatus = 'Delivered';
        emailMessageId = emailRes.messageId || `MSG_EMAIL_${Date.now()}`;
      } else {
        emailStatus = 'Failed';
        emailError = emailRes.error || 'Email delivery failed.';
      }
    }

    // Dispatch SMS
    if (params.method === 'SMS' || params.method === 'Both') {
      const smsRes = await this.sendSms(params.phone, `EduManager AI Fee Reminder: Hello ${params.studentName}, your pending tuition fee is ₹${params.pendingAmount.toLocaleString('en-IN')} (Due: ${params.dueDate}). Please pay via EduPay.`);
      if (smsRes.success) {
        smsStatus = 'Delivered';
        smsSid = smsRes.smsSid || `SMS_SID_${Date.now()}`;
      } else {
        smsStatus = 'Failed';
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

  // 4. Auxiliary System Notification Triggers (Backwards Compatibility)
  static async triggerAttendanceAlert(...args: any[]): Promise<void> {
    console.log(`[NotificationService] Low attendance alert triggered:`, args[0]);
  }

  static async sendStudentRegistrationNotification(...args: any[]): Promise<void> {
    console.log(`[NotificationService] Welcome registration notification triggered:`, args[0]);
  }

  static async triggerFeeReminderAlert(...args: any[]): Promise<void> {
    console.log(`[NotificationService] Fee reminder alert triggered:`, args[0]);
  }

  static async sendCourseAssignmentNotification(...args: any[]): Promise<void> {
    console.log(`[NotificationService] Course assignment notification triggered:`, args[0]);
  }

  static async triggerMarksPublishedAlert(...args: any[]): Promise<void> {
    console.log(`[NotificationService] Marks published alert triggered:`, args[0]);
  }
}
