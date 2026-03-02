
import { createClient, createAdminClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { email, password, mode = 'restore', profileData } = body

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
        }

        const normalizedEmail = email.toLowerCase().trim()
        const supabase = await createClient()

        // 1. Check reactivation status to decide if we need authentication
        const { data: statusData, error: statusError } = await supabase.rpc('get_user_reactivation_status', { email_to_check: normalizedEmail })
        if (statusError) throw statusError

        const status = statusData[0] || {}
        const needsAuth = mode === 'restore' && !!status.can_reactivate

        if (needsAuth) {
            // 2a. Authenticate with old password for active "Restore"
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: normalizedEmail,
                password,
            })

            if (authError) {
                console.error("Authentication failed during restoration:", authError)
                return NextResponse.json({ error: "Invalid password for existing account" }, { status: 401 })
            }
        } else {
            // 2b. Bypass authentication for "Fresh Start" or expired period, but overwrite password
            const adminSupabase = await createAdminClient()

            // Get user ID from email using admin client or RPC
            const { data: { users }, error: listError } = await adminSupabase.auth.admin.listUsers()
            if (listError) throw listError

            const user = users.find(u => u.email === normalizedEmail)
            if (user) {
                // Overwrite the old password with the new one entered on the signup page
                const { error: updateError } = await adminSupabase.auth.admin.updateUserById(
                    user.id,
                    { password: password }
                )
                if (updateError) {
                    console.error("Failed to overwrite password via admin:", updateError)
                    throw new Error("Failed to update account credentials")
                }
            }
        }

        // 3. Call RPC V3 to handle reactivation and profile update
        // We reactivation with reset_data if it was a fresh start OR if the period expired
        const shouldReset = mode === 'fresh' || !status.can_reactivate

        const { data: reactivateData, error: reactivateError } = await supabase.rpc('reactivate_user_account_v3', {
            email_to_reactivate: normalizedEmail,
            reset_data: shouldReset,
            p_first_name: profileData?.firstName,
            p_last_name: profileData?.lastName,
            p_company_name: profileData?.companyName,
            p_address_line: profileData?.addressLine,
            p_city: profileData?.city,
            p_state: profileData?.state,
            p_zip_code: profileData?.zipCode,
            p_country: profileData?.country,
            p_line_phone: profileData?.linePhone,
            p_cell_phone: profileData?.cellPhone
        })

        if (reactivateError) throw reactivateError

        if (!reactivateData) {
            return NextResponse.json({ error: "Reactivation logic failed" }, { status: 400 })
        }

        // 4. Ensure the user is signed in with the correct password (new or old)
        // If we bypassed auth, we should sign in now so the session is established
        if (!needsAuth) {
            const { error: finalSignInError } = await supabase.auth.signInWithPassword({
                email: normalizedEmail,
                password,
            })
            if (finalSignInError) throw finalSignInError
        }

        return NextResponse.json({ success: true })
    } catch (e: any) {
        console.error("Reactivate Account Error:", e)
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
