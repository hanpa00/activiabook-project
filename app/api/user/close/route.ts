
import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"
import { sendAccountClosureEmail } from "@/lib/email"

export async function POST() {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Get user's profile to have their name if available
        const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', user.id)
            .single()

        // Soft delete the profile
        const { error: profileError } = await supabase
            .from('profiles')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', user.id)

        if (profileError) {
            throw profileError
        }

        // Send account closure confirmation email
        if (user.email) {
            try {
                await sendAccountClosureEmail(user.email, user.email)
            } catch (emailError) {
                console.error("Failed to send account closure email:", emailError)
                // Don't fail the entire request if email fails, just log it
            }
        }

        // Sign out the user
        await supabase.auth.signOut()

        return NextResponse.json({ success: true })
    } catch (e: any) {
        console.error("Close Account Error:", e)
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
