const nodemailer = require('nodemailer');
require('dotenv').config();

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || 'shokriali@gmail.com',
        pass: process.env.SMTP_PASS || 'orslxvkgfzqfpgjx'
      }
    });

    this.frontendUrl = process.env.FRONTEND_URL || 'https://modiryar.teraxr.com';
  }

  // Send email verification
  async sendVerificationEmail(email, name, verificationToken) {
    const verificationUrl = `${this.frontendUrl}/verify-email?token=${verificationToken}`;
    
    const mailOptions = {
      from: `"Modiryar" <${process.env.SMTP_USER || 'shokriali@gmail.com'}>`,
      to: email,
      subject: 'تأیید ایمیل - Modiryar',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">Modiryar</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">سیستم مدیریت جلسات</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">سلام ${name} عزیز!</h2>
            
            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              از ثبت نام شما در Modiryar متشکریم. برای تکمیل فرآیند ثبت نام، لطفاً ایمیل خود را تأیید کنید.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 25px; 
                        font-weight: bold; 
                        font-size: 16px;
                        display: inline-block;">
                تأیید ایمیل
              </a>
            </div>
            
            <p style="color: #999; font-size: 14px; line-height: 1.5;">
              اگر دکمه بالا کار نمی‌کند، می‌توانید لینک زیر را کپی کرده و در مرورگر خود باز کنید:
            </p>
            
            <p style="background: #e9ecef; padding: 15px; border-radius: 5px; word-break: break-all; font-family: monospace; font-size: 12px; color: #495057;">
              ${verificationUrl}
            </p>
            
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              این ایمیل به صورت خودکار ارسال شده است. لطفاً به آن پاسخ ندهید.
            </p>
          </div>
        </div>
      `
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('Verification email sent:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Error sending verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  // Send password reset email
  async sendPasswordResetEmail(email, name, resetToken) {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: `"Modiryar" <${process.env.SMTP_USER || 'shokriali@gmail.com'}>`,
      to: email,
      subject: 'بازیابی رمز عبور - Modiryar',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">Modiryar</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">سیستم مدیریت جلسات</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">سلام ${name} عزیز!</h2>
            
            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              درخواست بازیابی رمز عبور برای حساب کاربری شما دریافت شده است. برای تنظیم رمز عبور جدید، روی دکمه زیر کلیک کنید.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 25px; 
                        font-weight: bold; 
                        font-size: 16px;
                        display: inline-block;">
                بازیابی رمز عبور
              </a>
            </div>
            
            <p style="color: #999; font-size: 14px; line-height: 1.5;">
              اگر دکمه بالا کار نمی‌کند، می‌توانید لینک زیر را کپی کرده و در مرورگر خود باز کنید:
            </p>
            
            <p style="background: #e9ecef; padding: 15px; border-radius: 5px; word-break: break-all; font-family: monospace; font-size: 12px; color: #495057;">
              ${resetUrl}
            </p>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="color: #856404; margin: 0; font-size: 14px;">
                <strong>نکته امنیتی:</strong> این لینک فقط برای مدت محدودی معتبر است. اگر شما این درخواست را نکرده‌اید، لطفاً این ایمیل را نادیده بگیرید.
              </p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              این ایمیل به صورت خودکار ارسال شده است. لطفاً به آن پاسخ ندهید.
            </p>
          </div>
        </div>
      `
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('Password reset email sent:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  // Test email connection
  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('Email service connection verified');
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();
