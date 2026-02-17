
import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

        if (profileError && profileError.code !== 'PGRST116') {
            throw profileError
        }

        if (profile?.deleted_at) {
            return NextResponse.json({ error: "Account closed" }, { status: 403 })
        }

        return NextResponse.json({
            ...(profile || { id: user.id }),
            email: user.email
        })
    } catch (e: any) {
        console.error("Fetch Profile Error:", e)
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}

export async function PATCH(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()
        const {
            first_name,
            last_name,
            company_name,
            address_line,
            city,
            state,
            zip_code,
            country,
            line_phone,
            cell_phone
        } = body

        const { data, error } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                first_name,
                last_name,
                company_name,
                address_line,
                city,
                state,
                zip_code,
                country,
                line_phone,
                cell_phone
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (e: any) {
        console.error("Update Profile Error:", e)
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
