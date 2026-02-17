
import { createClient, createAdminClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { code, newPassword } = await req.json()

        if (!code || !newPassword) {
            return NextResponse.json({ error: "Code and new password are required" }, { status: 400 })
        }

        // Verify the code
        const adminSupabase = await createAdminClient()
        const { data: verification, error: verifyError } = await adminSupabase
            .from('verification_codes')
            .select('*')
            .eq('user_id', user.id)
            .eq('code', code)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (verifyError || !verification) {
            return NextResponse.json({ error: "Invalid or expired verification code" }, { status: 400 })
        }

        // Update the password
        const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword
        })

        if (updateError) throw updateError

        // Delete the used code (optional but good practice)
        await adminSupabase
            .from('verification_codes')
            .delete()
            .eq('id', verification.id)

        return NextResponse.json({ message: "Password updated successfully" })
    } catch (e: any) {
        console.error("Change Password Error:", e)
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
