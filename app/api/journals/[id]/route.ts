
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { generateReferenceNumber } from '@/lib/journal-utils'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    try {
        const supabase = await createClient()
        const cookieStore = await cookies()
        const customerId = cookieStore.get('activiabook_customer_id')?.value

        if (!customerId) {
            return NextResponse.json({ error: 'Customer selection required' }, { status: 400 })
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: entry, error } = await supabase
            .from('journal_entries')
            .select(`
                *,
                journal_lines (
                    *,
                    chart_of_accounts (
                        code,
                        name
                    )
                )
            `)
            .eq('id', id)
            .eq('user_id', user.id)
            .eq('customer_id', customerId)
            .single()

        if (error) throw error
        return NextResponse.json(entry)
    } catch (error) {
        console.warn("Journal API Error:", error)
        return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    try {
        const supabase = await createClient()
        const cookieStore = await cookies()
        const customerId = cookieStore.get('activiabook_customer_id')?.value

        if (!customerId) {
            return NextResponse.json({ error: 'Customer selection required' }, { status: 400 })
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await req.json()
        const { status, date, description, reference_number, lines } = body

        // 0. Fetch Current Entry to Verify Status and Customer
        const { data: currentEntry, error: fetchError } = await supabase
            .from('journal_entries')
            .select('status, user_id, date, customer_id, reference_number')
            .eq('id', id)
            .eq('customer_id', customerId)
            .single()

        if (fetchError || !currentEntry) {
            return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
        }

        if (currentEntry.user_id !== user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (currentEntry.status === 'POSTED') {
            if (lines || description || (date && date !== currentEntry.date)) {
                return NextResponse.json({ error: 'Cannot modify a POSTED entry. Please Void it instead.' }, { status: 400 })
            }
        }

        // 1. Status Update Only (Post Entry/Void)
        if (status && !lines) {
            let refNum = currentEntry.reference_number
            if (status === 'POSTED' && !refNum) {
                refNum = await generateReferenceNumber(supabase, customerId)
            }

            const { error } = await supabase
                .from('journal_entries')
                .update({ status, reference_number: refNum })
                .eq('id', id)
                .eq('user_id', user.id)
                .eq('customer_id', customerId)
            if (error) throw error
            return NextResponse.json({ success: true })
        }

        // 2. Full Update (Save Changes)
        let formattedDate = date && date.includes('T') ? date.split('T')[0] : date

        const updatePayload: any = {
            date: formattedDate,
            description,
            reference_number
        }

        if (status && currentEntry.status === 'DRAFT') {
            updatePayload.status = status
            if (status === 'POSTED' && !updatePayload.reference_number) {
                updatePayload.reference_number = await generateReferenceNumber(supabase, customerId)
            }
        }

        const { error: entryError } = await supabase
            .from('journal_entries')
            .update(updatePayload)
            .eq('id', id)
            .eq('user_id', user.id)
            .eq('customer_id', customerId)

        if (entryError) throw entryError

        // 3. Handle Lines Update
        if (lines && Array.isArray(lines)) {
            const { error: deleteError } = await supabase
                .from('journal_lines')
                .delete()
                .eq('entry_id', id)

            if (deleteError) throw deleteError

            const linesToInsert = lines.map((line: any) => ({
                entry_id: id,
                account_id: line.accountId,
                description: line.description || description,
                debit: line.debit || 0,
                credit: line.credit || 0
            }))

            if (linesToInsert.length > 0) {
                const { error: insertError } = await supabase
                    .from('journal_lines')
                    .insert(linesToInsert)
                if (insertError) throw insertError
            }
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("Journal PATCH Error:", error)
        return NextResponse.json({ error: error.message || 'Failed to update entry' }, { status: 500 })
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    try {
        const supabase = await createClient()
        const cookieStore = await cookies()
        const customerId = cookieStore.get('activiabook_customer_id')?.value

        if (!customerId) {
            return NextResponse.json({ error: 'Customer selection required' }, { status: 400 })
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: entry, error: fetchError } = await supabase
            .from('journal_entries')
            .select('status, customer_id')
            .eq('id', id)
            .eq('user_id', user.id)
            .eq('customer_id', customerId)
            .single()

        if (fetchError || !entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

        await supabase.from('journal_lines').delete().eq('entry_id', id)

        const { error } = await supabase
            .from('journal_entries')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id)
            .eq('customer_id', customerId)

        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Failed to delete' }, { status: 500 })
    }
}

