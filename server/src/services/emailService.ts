import sgMail from '@sendgrid/mail';
import nodemailer, { Transporter } from 'nodemailer';
import { logger } from '../utils/logger';

type EmailProvider = 'sendgrid' | 'smtp' | 'none';

export class EmailService {
  private static instance: EmailService;
  private provider: EmailProvider = 'none';
  private smtpTransporter?: Transporter;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  // Reinitialize configuration (useful for reloading env vars without restart)
  public reinitialize(): void {
    this.provider = 'none';
    this.smtpTransporter = undefined;
    this.initialize();
  }

  private initialize(): void {
    // Try SendGrid first
    const sendgridKey = process.env.SENDGRID_API_KEY;
    if (sendgridKey) {
      sgMail.setApiKey(sendgridKey);
      this.provider = 'sendgrid';
      logger.info('✅ Email service configured with SendGrid');
      return;
    }

    // Try SMTP as fallback
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      this.smtpTransporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          member: smtpUser,
          pass: smtpPass,
        },
      });
      this.provider = 'smtp';
      logger.info('✅ Email service configured with SMTP');
      return;
    }

    logger.warn('⚠️  Email service not configured - set SENDGRID_API_KEY or SMTP credentials');
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    if (this.provider === 'none') {
      logger.warn('📧 Email service not configured - logging reset token instead');
      console.log(`📧 Password Reset Token for ${email}: ${resetToken}`);
      return false;
    }

    try {
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5174'}/reset-password?token=${resetToken}`;

      if (this.provider === 'sendgrid') {
        const msg = {
          to: email,
          from: {
            email: process.env.FROM_EMAIL || 'noreply@peerbond.com',
            name: process.env.FROM_NAME || 'PeerBond Support'
          },
          subject: 'Reset Your PeerBond Password',
          html: this.getPasswordResetEmailTemplate(resetToken, resetUrl),
          text: this.getPasswordResetEmailText(resetToken, resetUrl)
        };

        await sgMail.send(msg);
        logger.info(`✅ Password reset email sent to ${email} via SendGrid`);
        return true;
      } else if (this.provider === 'smtp' && this.smtpTransporter) {
        const mailOptions = {
          from: `${process.env.FROM_NAME || 'PeerBond Support'} <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
          to: email,
          subject: 'Reset Your PeerBond Password',
          html: this.getPasswordResetEmailTemplate(resetToken, resetUrl),
          text: this.getPasswordResetEmailText(resetToken, resetUrl)
        };

        logger.info(`📧 Sending password reset email to ${email} from ${mailOptions.from}`);
        const info = await this.smtpTransporter.sendMail(mailOptions);
        logger.info(`✅ Password reset email sent to ${email} via SMTP - MessageID: ${info.messageId}`);
        return true;
      }

      return false;

    } catch (error) {
      logger.error('❌ Failed to send password reset email:', error);

      // Fallback: log token if email fails
      console.log(`📧 Email failed - Reset Token for ${email}: ${resetToken}`);
      return false;
    }
  }

  async sendWelcomeEmail(email: string, firstName: string): Promise<boolean> {
    if (this.provider === 'none') {
      logger.info(`📧 Welcome email would be sent to ${firstName} <${email}>`);
      return false;
    }

    try {
      if (this.provider === 'sendgrid') {
        const msg = {
          to: email,
          from: {
            email: process.env.FROM_EMAIL || 'noreply@peerbond.com',
            name: process.env.FROM_NAME || 'PeerBond Support'
          },
          subject: 'Welcome to PeerBond!',
          html: this.getWelcomeEmailTemplate(firstName),
          text: `Welcome to PeerBond, ${firstName}! We're excited to have you join our supportive community.`
        };

        await sgMail.send(msg);
        logger.info(`✅ Welcome email sent to ${email} via SendGrid`);
        return true;
      } else if (this.provider === 'smtp' && this.smtpTransporter) {
        const mailOptions = {
          from: `${process.env.FROM_NAME || 'PeerBond Support'} <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
          to: email,
          subject: 'Welcome to PeerBond!',
          html: this.getWelcomeEmailTemplate(firstName),
          text: `Welcome to PeerBond, ${firstName}! We're excited to have you join our supportive community.`
        };

        await this.smtpTransporter.sendMail(mailOptions);
        logger.info(`✅ Welcome email sent to ${email} via SMTP`);
        return true;
      }

      return false;

    } catch (error) {
      logger.error('❌ Failed to send welcome email:', error);
      return false;
    }
  }

  private getPasswordResetEmailTemplate(resetToken: string, resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your PeerBond Password</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3B82F6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .reset-code { background: #1f2937; color: #f9fafb; font-size: 24px; font-weight: bold; padding: 15px; text-align: center; letter-spacing: 3px; border-radius: 6px; margin: 20px 0; font-family: monospace; }
          .button { display: inline-block; background: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 14px; color: #6b7280; border-radius: 0 0 8px 8px; }
          .warning { background: #fef3cd; border: 1px solid #facc15; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔐 Password Reset Request</h1>
        </div>

        <div class="content">
          <p>Hello,</p>

          <p>We received a request to reset your PeerBond password. Use the code below to reset your password:</p>

          <div class="reset-code">${resetToken}</div>

          <p>Or click this button to reset your password automatically:</p>

          <a href="${resetUrl}" class="button">Reset My Password</a>

          <div class="warning">
            <strong>⚠️ Important:</strong>
            <ul>
              <li>This code expires in <strong>1 hour</strong></li>
              <li>If you didn't request this reset, please ignore this email</li>
              <li>Never share this code with anyone</li>
            </ul>
          </div>

          <p>If you're having trouble with the button above, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #3B82F6;">${resetUrl}</p>
        </div>

        <div class="footer">
          <p>This email was sent by PeerBond. If you have questions, please contact our support team.</p>
          <p>© 2025 PeerBond. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }

  private getPasswordResetEmailText(resetToken: string, resetUrl: string): string {
    return `
Password Reset Request

Hello,

We received a request to reset your PeerBond password.

Your reset code is: ${resetToken}

Or visit this link: ${resetUrl}

Important:
- This code expires in 1 hour
- If you didn't request this reset, please ignore this email
- Never share this code with anyone

If you have questions, please contact our support team.

© 2025 PeerBond. All rights reserved.
    `.trim();
  }

  private getWelcomeEmailTemplate(firstName: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to PeerBond!</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .button { display: inline-block; background: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 14px; color: #6b7280; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🌟 Welcome to PeerBond!</h1>
        </div>

        <div class="content">
          <p>Hi ${firstName},</p>

          <p>Welcome to PeerBond! We're excited to have you join our supportive community where people connect, share experiences, and grow together.</p>

          <p>Here's what you can do next:</p>
          <ul>
            <li>🏠 <strong>Explore your dashboard</strong> - Get familiar with your personal space</li>
            <li>👥 <strong>Join a group</strong> - Connect with others who share similar experiences</li>
            <li>💬 <strong>Start conversations</strong> - Share your thoughts and support others</li>
            <li>📊 <strong>Track your progress</strong> - Monitor your journey and celebrate milestones</li>
          </ul>

          <a href="${process.env.FRONTEND_URL || 'http://localhost:5174'}/app" class="button">Get Started</a>

          <p>Remember, you're not alone on this journey. Our community is here to support you every step of the way.</p>

          <p>If you have any questions or need help getting started, don't hesitate to reach out to our support team.</p>

          <p>Welcome aboard!</p>
          <p><strong>The PeerBond Team</strong></p>
        </div>

        <div class="footer">
          <p>This email was sent by PeerBond. If you have questions, please contact our support team.</p>
          <p>© 2025 PeerBond. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }

  // Test email functionality
  async sendTestEmail(to: string): Promise<boolean> {
    if (this.provider === 'none') {
      logger.warn('📧 Email service not configured for testing');
      return false;
    }

    try {
      if (this.provider === 'sendgrid') {
        const msg = {
          to,
          from: {
            email: process.env.FROM_EMAIL || 'noreply@peerbond.com',
            name: process.env.FROM_NAME || 'PeerBond Support'
          },
          subject: 'PeerBond Email Test',
          html: '<p>This is a test email from PeerBond. Email service is working correctly! ✅</p>',
          text: 'This is a test email from PeerBond. Email service is working correctly!'
        };

        await sgMail.send(msg);
        logger.info(`✅ Test email sent to ${to} via SendGrid`);
        return true;
      } else if (this.provider === 'smtp' && this.smtpTransporter) {
        const mailOptions = {
          from: `${process.env.FROM_NAME || 'PeerBond Support'} <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
          to,
          subject: 'PeerBond Email Test',
          html: '<p>This is a test email from PeerBond. Email service is working correctly! ✅</p>',
          text: 'This is a test email from PeerBond. Email service is working correctly!'
        };

        await this.smtpTransporter.sendMail(mailOptions);
        logger.info(`✅ Test email sent to ${to} via SMTP`);
        return true;
      }

      return false;

    } catch (error) {
      logger.error('❌ Failed to send test email:', error);
      return false;
    }
  }
}

export const emailService = EmailService.getInstance();