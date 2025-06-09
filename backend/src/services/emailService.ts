import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for others
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verify transporter connection once during setup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email service connection failed:', error);
  } else {
    console.log('✅ Email service connected successfully');
  }
});

export async function sendEmail(to: string, message: string) {
  try {
    const info = await transporter.sendMail({
      from: `"Dheenotifications" <${process.env.SMTP_USER}>`,
      to,
      subject: 'Notification',
      text: message,
      html: `<p>${message}</p>`,
    });

    console.log(`📧 Email sent to ${to}: ${info.messageId}`);
  } catch (err) {
    console.error(`❌ Failed to send email to ${to}:`, err);
  }
}
//check if the environment variables are set