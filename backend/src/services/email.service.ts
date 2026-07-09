import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  }
});

const isSmtpConfigured = process.env.SMTP_USER && process.env.SMTP_PASS;

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (isSmtpConfigured) {
    try {
      await transporter.sendMail({
        from: '"EduManager System" <no-reply@edumanager.com>',
        to,
        subject,
        html
      });
      console.log(`✉️ Email sent successfully to ${to}`);
      return true;
    } catch (error) {
      console.error('Failed to send email via SMTP, falling back to log console:', error);
    }
  }

  // Fallback console log with nice formatting
  console.log('\n┌────────────────────────────────────────────────────────┐');
  console.log(`│ 📬 SIMULATED OUTBOX: EMAIL SENT                        │`);
  console.log(`│ TO:      ${to.padEnd(46)} │`);
  console.log(`│ SUBJECT: ${subject.padEnd(46)} │`);
  console.log('├────────────────────────────────────────────────────────┤');
  // Strip simple HTML tags for cleaner log viewing
  const cleanBody = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  console.log(`│ BODY:    ${cleanBody.substring(0, 45).padEnd(46)}... │`);
  console.log('└────────────────────────────────────────────────────────┘\n');
  return true;
}
