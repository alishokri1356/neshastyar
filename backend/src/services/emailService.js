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

    this.frontendUrl = process.env.FRONTEND_URL || 'https://modiryar.online';
  }

  // Send email verification
  async sendVerificationEmail(email, name, verificationToken) {
    const verificationUrl = `${this.frontendUrl}/verify-email?token=${verificationToken}`;
    
    const mailOptions = {
      from: `"Modiryar" <${process.env.SMTP_USER || 'shokriali@gmail.com'}>`,
      to: email,
      subject: 'تأیید ایمیل - Modiryar',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; direction: rtl;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">Modiryar</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">سیستم مدیریت جلسات</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; direction: rtl;">
            <h2 style="color: #333; margin-top: 0; text-align: right;">سلام ${name} عزیز!</h2>
            
            <p style="color: #666; line-height: 1.6; font-size: 16px; text-align: right;">
              از ثبت نام شما در Modiryar متشکریم. برای تکمیل فرآیند ثبت نام، لطفاً ایمیل خود را تأیید کنید.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${verificationUrl}" style="height:50px;v-text-anchor:middle;width:200px;" arcsize="50%" stroke="f" fillcolor="#667eea">
                <w:anchorlock/>
                <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">تأیید ایمیل</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-->
              <a href="${verificationUrl}" 
                 style="background-color: #667eea; border: 2px solid #667eea; border-radius: 25px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; line-height: 50px; text-align: center; text-decoration: none; width: 200px; -webkit-text-size-adjust: none; mso-hide: all;">
                تأیید ایمیل
              </a>
              <!--<![endif]-->
            </div>
            
            <p style="color: #999; font-size: 14px; line-height: 1.5; text-align: right;">
              اگر دکمه بالا کار نمی‌کند، می‌توانید لینک زیر را کپی کرده و در مرورگر خود باز کنید:
            </p>
            
            <p style="background: #e9ecef; padding: 15px; border-radius: 5px; word-break: break-all; font-family: monospace; font-size: 12px; color: #495057; text-align: right; direction: ltr;">
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
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; direction: rtl;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">Modiryar</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">سیستم مدیریت جلسات</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; direction: rtl;">
            <h2 style="color: #333; margin-top: 0; text-align: right;">سلام ${name} عزیز!</h2>
            
            <p style="color: #666; line-height: 1.6; font-size: 16px; text-align: right;">
              درخواست بازیابی رمز عبور برای حساب کاربری شما دریافت شده است. برای تنظیم رمز عبور جدید، روی دکمه زیر کلیک کنید.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${resetUrl}" style="height:50px;v-text-anchor:middle;width:200px;" arcsize="50%" stroke="f" fillcolor="#dc3545">
                <w:anchorlock/>
                <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">بازیابی رمز عبور</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-->
              <a href="${resetUrl}" 
                 style="background-color: #dc3545; border: 2px solid #dc3545; border-radius: 25px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; line-height: 50px; text-align: center; text-decoration: none; width: 200px; -webkit-text-size-adjust: none; mso-hide: all;">
                بازیابی رمز عبور
              </a>
              <!--<![endif]-->
            </div>
            
            <p style="color: #999; font-size: 14px; line-height: 1.5; text-align: right;">
              اگر دکمه بالا کار نمی‌کند، می‌توانید لینک زیر را کپی کرده و در مرورگر خود باز کنید:
            </p>
            
            <p style="background: #e9ecef; padding: 15px; border-radius: 5px; word-break: break-all; font-family: monospace; font-size: 12px; color: #495057; text-align: right; direction: ltr;">
              ${resetUrl}
            </p>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="color: #856404; margin: 0; font-size: 14px; text-align: right;">
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

  // Send meeting summary email
  async sendMeetingSummaryEmail(email, name, meetingTitle, summary) {
    // Parse and format the summary
    const formattedSummary = this.formatSummaryForEmail(summary);
    
    const mailOptions = {
      from: `"Modiryar" <${process.env.SMTP_USER || 'shokriali@gmail.com'}>`,
      to: email,
      subject: `خلاصه جلسه: ${meetingTitle}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; direction: rtl;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">Modiryar</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">سیستم مدیریت جلسات</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; direction: rtl;">
            <h2 style="color: #333; margin-top: 0; text-align: right;">سلام ${name} عزیز!</h2>
            
            <p style="color: #666; line-height: 1.6; font-size: 16px; text-align: right;">
              خلاصه جلسه "<strong>${meetingTitle}</strong>" برای شما ارسال شده است.
            </p>
            
            <div style="background: white; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0;">
              ${formattedSummary}
            </div>
            
            <div style="background: #e3f2fd; border: 1px solid #2196f3; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="color: #1976d2; margin: 0; font-size: 14px; text-align: right;">
                <strong>نکته:</strong> این خلاصه از سیستم Modiryar برای شما ارسال شده است. برای مشاهده جزئیات بیشتر و مدیریت جلسات خود، به پنل کاربری خود مراجعه کنید.
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
      console.log('Meeting summary email sent:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Error sending meeting summary email:', error);
      throw new Error('Failed to send meeting summary email');
    }
  }

  // Format summary for email display
  formatSummaryForEmail(summary) {
    try {
      // Try to parse as JSON first
      const jsonData = JSON.parse(summary);
      
      let html = '<h3 style="color: #333; margin-top: 0; text-align: right; border-bottom: 2px solid #667eea; padding-bottom: 10px;">خلاصه جلسه</h3>';
      
      // Subject
      if (jsonData.Subject) {
        html += `
          <div style="margin-bottom: 20px;">
            <h4 style="color: #555; margin: 0 0 10px 0; text-align: right; font-size: 16px;">موضوع:</h4>
            <p style="color: #333; line-height: 1.6; font-size: 15px; text-align: right; margin: 0; font-weight: bold;">${jsonData.Subject}</p>
          </div>
        `;
      }
      
      // Summary
      if (jsonData.Summary) {
        html += `
          <div style="margin-bottom: 20px;">
            <h4 style="color: #555; margin: 0 0 10px 0; text-align: right; font-size: 16px;">خلاصه:</h4>
            <p style="color: #333; line-height: 1.8; font-size: 15px; text-align: right; margin: 0; white-space: pre-wrap;">${jsonData.Summary}</p>
          </div>
        `;
      }
      
      // People in meetings
      if (jsonData["People in meetings"] && jsonData["People in meetings"].length > 0) {
        html += `
          <div style="margin-bottom: 20px;">
            <h4 style="color: #555; margin: 0 0 10px 0; text-align: right; font-size: 16px;">افراد حاضر در جلسه:</h4>
            <div style="text-align: right;">
              ${jsonData["People in meetings"].map(person => 
                `<span style="display: inline-block; background: #f0f0f0; padding: 5px 10px; margin: 2px; border-radius: 15px; font-size: 14px; color: #555;">${person}</span>`
              ).join('')}
            </div>
          </div>
        `;
      }
      
      // Bullet Points
      if (jsonData["Bolet Points"] && jsonData["Bolet Points"].length > 0) {
        html += `
          <div style="margin-bottom: 20px;">
            <h4 style="color: #555; margin: 0 0 10px 0; text-align: right; font-size: 16px;">نکات کلیدی:</h4>
            <ul style="color: #333; line-height: 1.8; font-size: 15px; text-align: right; margin: 0; padding-right: 20px;">
              ${jsonData["Bolet Points"].map(point => 
                `<li style="margin-bottom: 8px;">${point}</li>`
              ).join('')}
            </ul>
          </div>
        `;
      }
      
      // Tags
      if (jsonData.Tags && jsonData.Tags.length > 0) {
        html += `
          <div style="margin-bottom: 20px;">
            <h4 style="color: #555; margin: 0 0 10px 0; text-align: right; font-size: 16px;">برچسب‌های پیشنهادی:</h4>
            <div style="text-align: right;">
              ${jsonData.Tags.map(tag => 
                `<span style="display: inline-block; background: #e3f2fd; color: #1976d2; padding: 5px 10px; margin: 2px; border-radius: 15px; font-size: 14px; border: 1px solid #bbdefb;">${tag}</span>`
              ).join('')}
            </div>
          </div>
        `;
      }
      
      return html;
      
    } catch (error) {
      // If it's not JSON, treat as plain text
      return `
        <h3 style="color: #333; margin-top: 0; text-align: right; border-bottom: 2px solid #667eea; padding-bottom: 10px;">خلاصه جلسه</h3>
        <div style="color: #333; line-height: 1.8; font-size: 15px; text-align: right; white-space: pre-wrap;">${summary}</div>
      `;
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
