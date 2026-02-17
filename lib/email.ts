import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '54325'),
    secure: false,
    auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    } : undefined,
    tls: {
        rejectUnauthorized: false // Inbucket uses self-signed keys if TLS is active
    }
})

export async function sendWelcomeEmail(to: string, name: string) {
    const from = process.env.EMAIL_FROM || 'welcome@activiabook.com'
    const fromName = process.env.EMAIL_FROM_NAME || process.env.NEXT_PUBLIC_APP_NAME || 'ActiviaBook'
    const appName = process.env.NEXT_PUBLIC_APP_NAME || 'ActiviaBook'

    const info = await transporter.sendMail({
        from: `"${fromName}" <${from}>`,
        to,
        subject: `Welcome to ${appName}! 📚`,
        text: `Hi ${name},\n\nThank you for signing up for ${appName}! We're excited to have you on board.\n\nYou can now start managing your customers, accounts, and journals with ease.\n\nBest regards,\nThe ${appName} Team`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h1 style="color: #4f46e5;">Welcome to ${appName}! 📚</h1>
                <p>Hi <strong>${name}</strong>,</p>
                <p>Thank you for signing up for <strong>${appName}</strong>! We're excited to have you on board.</p>
                <p>You can now start managing your customers, accounts, and journals with ease.</p>
                <div style="margin: 30px 0;">
                    <a href="${process.env.SITE_URL || 'http://localhost:3000'}/dashboard" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Go to Dashboard</a>
                </div>
                <p style="color: #64748b; font-size: 14px;">Best regards,<br>The ${appName} Team</p>
            </div>
        `,
    })

    console.log('Message sent: %s', info.messageId)
    return info
}

export async function sendSecurityCodeEmail(to: string, code: string) {
    const from = process.env.EMAIL_FROM || 'security@activiabook.com'
    const fromName = process.env.EMAIL_FROM_NAME || process.env.NEXT_PUBLIC_APP_NAME || 'ActiviaBook'
    const appName = process.env.NEXT_PUBLIC_APP_NAME || 'ActiviaBook'

    const info = await transporter.sendMail({
        from: `"${fromName}" <${from}>`,
        to,
        subject: `${code} is your ${appName} security code`,
        text: `Your security code is: ${code}\n\nThis code will expire in 10 minutes. If you did not request this code, please ignore this email.`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h1 style="color: #4f46e5;">Security Verification</h1>
                <p>Hello,</p>
                <p>You are receiving this email because a password change was requested for your account on <strong>${appName}</strong>.</p>
                <div style="margin: 30px 0; text-align: center; padding: 20px; background-color: #f8fafc; border-radius: 6px;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4f46e5;">${code}</span>
                </div>
                <p>This code will expire in <strong>10 minutes</strong>. If you did not request this code, please ignore this email or contact support if you have concerns.</p>
                <p style="color: #64748b; font-size: 14px;">Best regards,<br>The ${appName} Security Team</p>
            </div>
        `,
    })

    console.log('Security code sent: %s', info.messageId)
    return info
}

export async function sendAccountClosureEmail(to: string, userEmail: string) {
    const from = process.env.EMAIL_FROM || 'support@activiabook.com'
    const fromName = process.env.EMAIL_FROM_NAME || process.env.NEXT_PUBLIC_APP_NAME || 'ActiviaBook'
    const appName = process.env.NEXT_PUBLIC_APP_NAME || 'ActiviaBook'
    const reactivationDeadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    })

    const info = await transporter.sendMail({
        from: `"${fromName}" <${from}>`,
        to,
        subject: `Your ${appName} Account Has Been Closed`,
        text: `Your account has been closed. You can reactivate it within 30 days by signing in with your credentials. After ${reactivationDeadline}, all your data will be permanently deleted. If you did not request this action, please contact support immediately.`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h1 style="color: #dc2626;">Account Closed</h1>
                <p>Hello,</p>
                <p>Your <strong>${appName}</strong> account associated with <strong>${userEmail}</strong> has been closed.</p>

<!--
                <div style="margin: 20px 0; padding: 15px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                    <p style="margin: 0; color: #92400e;"><strong>⏰ Important:</strong> You have until <strong>${reactivationDeadline}</strong> to reactivate your account. After this date, all your data will be permanently deleted.</p>
                </div>
                <h3 style="color: #4f46e5; margin-top: 25px;">What Happens Next?</h3>
                <ul style="color: #64748b; line-height: 1.8;">
                    <li><strong>30-Day Grace Period:</strong> Your account and data remain accessible. You can sign in and reactivate your account at any time.</li>
                    <li><strong>After 30 Days:</strong> Your account and all associated data will be permanently deleted and cannot be recovered.</li>
                </ul>
                <h3 style="color: #4f46e5;">Reactivate Your Account</h3>
                <p>To reactivate your account, simply visit the login page and sign in with your credentials within the next 30 days:</p>
                <div style="margin: 20px 0;">
                    <a href="${process.env.SITE_URL || 'http://localhost:3000'}/login" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Sign In</a>
                </div>
-->
                <p style="color: #64748b; font-size: 14px; margin-top: 30px;">If you did not request this action or have questions about your account closure, please contact our support team at ${process.env.EMAIL_FROM} immediately.</p>
                <p style="color: #64748b; font-size: 14px;">Best regards,<br>The ${appName} Support Team</p>
            </div>
        `,
    })

    console.log('Account closure email sent: %s', info.messageId)
    return info
}
