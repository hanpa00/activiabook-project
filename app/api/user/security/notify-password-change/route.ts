
import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"
import { sendPasswordChangedEmail } from "@/lib/email"

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Send notification email
        if (user.email) {
            await sendPasswordChangedEmail(user.email)
        }

        return NextResponse.json({ message: "Notification email sent" })
    } catch (e: any) {
        console.error("Notify Password Change Error:", e)
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
