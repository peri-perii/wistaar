import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export const sendEmailVerification = async (email: string, token: string) => {
  const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  
  const mailOptions = {
    from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: 'Verify your Wistaar email',
    html: `
      <h2>Welcome to Wistaar! 📚</h2>
      <p>Please verify your email address to start reading amazing books.</p>
      <p><a href="${verificationLink}" style="background-color: #7c3aed; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a></p>
      <p>Or copy this link: ${verificationLink}</p>
      <p>This link expires in 24 hours.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✉️  Email verification sent to:', email);
  } catch (err) {
    console.error('❌ Failed to send email verification:', err);
    throw err;
  }
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  
  const mailOptions = {
    from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: 'Reset your Wistaar password',
    html: `
      <h2>Password Reset Request</h2>
      <p>You requested a password reset for your Wistaar account.</p>
      <p><a href="${resetLink}" style="background-color: #7c3aed; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
      <p>Or copy this link: ${resetLink}</p>
      <p>This link expires in 24 hours.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✉️  Password reset email sent to:', email);
  } catch (err) {
    console.error('❌ Failed to send password reset email:', err);
    throw err;
  }
};

export const sendWelcomeEmail = async (email: string, name?: string) => {
  const mailOptions = {
    from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: 'Welcome to Wistaar Reading Studio!',
    html: `
      <h2>Welcome to Wistaar! 📚</h2>
      <p>Hi ${name || 'reader'},</p>
      <p>We're excited to have you join our community of book lovers and indie authors.</p>
      <p>Start exploring amazing books today: <a href="${process.env.FRONTEND_URL}">Visit Wistaar</a></p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✉️  Welcome email sent to:', email);
  } catch (err) {
    console.error('❌ Failed to send welcome email:', err);
  }
};

export const sendEarningsNotification = async (email: string, amount: number, bookTitle: string) => {
  const mailOptions = {
    from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: `New earnings from "${bookTitle}"`,
    html: `
      <h2>💰 New Earnings Alert</h2>
      <p>Great news! You earned <strong>₹${amount.toFixed(2)}</strong> from <strong>${bookTitle}</strong>.</p>
      <p><a href="${process.env.FRONTEND_URL}/dashboard/earnings" style="background-color: #7c3aed; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Dashboard</a></p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('❌ Failed to send earnings notification:', err);
  }
};
