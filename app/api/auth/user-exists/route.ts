import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const email = searchParams.get('email')

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 })
        }

        const normalizedEmail = email.toLowerCase().trim()
        const supabase = await createClient()

        // Use RPC to check if user exists and get reactivation status
        const { data, error } = await supabase.rpc('get_user_reactivation_status', { email_to_check: normalizedEmail })

        if (error) {
            console.error('RPC Error (get_user_reactivation_status):', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        const status = data[0] || {}

        return NextResponse.json({
            exists: !!status.user_exists,
            isClosed: !!status.is_closed,
            canReactivate: !!status.can_reactivate,
            reactivationDeadline: status.reactivation_deadline
        })
    } catch (error: any) {
        console.error('Check User Reactivation Status Error:', error)
        return NextResponse.json({
            error: error.message || 'Failed to check user status',
            exists: false
        }, { status: 500 })
    }
}
