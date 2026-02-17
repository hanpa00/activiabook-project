import { NextResponse } from 'next/server'
import { sendWelcomeEmail } from '@/lib/email'

export async function POST(req: Request) {
    try {
        const { email, name } = await req.json()
        console.log(`Attempting to send welcome email to ${email} (${name})...`)

        if (!email || !name) {
            return NextResponse.json({ error: 'Email and name are required' }, { status: 400 })
        }

        const info = await sendWelcomeEmail(email, name)
        console.log(`Welcome email sent successfully to ${email}. Message ID: ${info.messageId}`)

        return NextResponse.json({ success: true, messageId: info.messageId })
    } catch (error: any) {
        console.error('Error in signup-welcome API:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
