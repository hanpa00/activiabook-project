
import { createClient, createAdminClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"
import { sendSecurityCodeEmail } from "@/lib/email"

export async function POST() {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Generate a 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString()
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now

        // Store the code in the database
        const adminSupabase = await createAdminClient()
        const { error: dbError } = await adminSupabase
            .from('verification_codes')
            .insert({
                user_id: user.id,
                code: code,
                expires_at: expiresAt.toISOString()
            })

        if (dbError) throw dbError

        // Send the email
        await sendSecurityCodeEmail(user.email!, code)

        return NextResponse.json({ message: "Verification code sent" })
    } catch (e: any) {
        console.error("Send Code Error:", e)
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
