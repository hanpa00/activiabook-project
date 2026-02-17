
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .order('name')

        if (error) throw error
        return NextResponse.json(data)
    } catch (error) {
        console.error('Fetch Customers Error:', error)
        return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // Quota Check
        const { data: quota } = await supabase
            .from('user_quotas')
            .select('max_customers')
            .eq('user_id', user.id)
            .single()

        if (quota && quota.max_customers !== -1) {
            const { count } = await supabase
                .from('customers')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)

            if (count !== null && count >= quota.max_customers) {
                return NextResponse.json({ error: 'Customer quota exceeded' }, { status: 403 })
            }
        }

        const body = await req.json()
        const {
            name, first_name, last_name, email, address_line, city, state, zip_code, country, phone, cell_phone, notes
        } = body

        if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

        const { data, error } = await supabase
            .from('customers')
            .insert({
                name,
                user_id: user.id,
                first_name,
                last_name,
                email,
                address_line,
                city,
                state,
                zip_code,
                country,
                phone,
                cell_phone,
                notes
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error) {
        console.error('Create Customer Error:', error)
        return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
    }
}

export async function PUT(req: Request) {
    try {
        const supabase = await createClient()
        const body = await req.json()
        const {
            id, name, first_name, last_name, email, address_line, city, state, zip_code, country, phone, cell_phone, notes
        } = body

        if (!id || !name) return NextResponse.json({ error: 'ID and Name are required' }, { status: 400 })

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data, error } = await supabase
            .from('customers')
            .update({
                name,
                first_name,
                last_name,
                email,
                address_line,
                city,
                state,
                zip_code,
                country,
                phone,
                cell_phone,
                notes
            })
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single()

        if (error) throw error
        return NextResponse.json(data)
    } catch (error) {
        console.error('Update Customer Error:', error)
        return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    try {
        const supabase = await createClient()
        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { error } = await supabase
            .from('customers')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id)

        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Delete Customer Error:', error)
        return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 })
    }
}
