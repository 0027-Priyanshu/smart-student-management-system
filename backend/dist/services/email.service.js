"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
    }
});
const isSmtpConfigured = process.env.SMTP_USER && process.env.SMTP_PASS;
async function sendEmail(to, subject, html) {
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
        }
        catch (error) {
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
