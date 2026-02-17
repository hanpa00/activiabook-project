
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { journalEntrySchema } from '@/lib/validators'
import { cookies } from 'next/headers'
import { generateReferenceNumber } from '@/lib/journal-utils'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const cookieStore = await cookies()
    const customerId = cookieStore.get('activiabook_customer_id')?.value

    if (!customerId) {
      return NextResponse.json({ error: 'Customer selection required' }, { status: 400 })
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Quota Check
    const { data: quota } = await supabase.from('user_quotas').select('max_journal_entries').eq('user_id', user.id).single()
    if (quota && quota.max_journal_entries !== -1) {
      const { count } = await supabase
        .from('journal_entries')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', customerId)

      if (count !== null && count >= quota.max_journal_entries) {
        return NextResponse.json({ error: 'Journal entry quota exceeded' }, { status: 403 })
      }
    }

    const body = await req.json()
    const validation = journalEntrySchema.safeParse({
      ...body,
      date: new Date(body.date)
    })

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.format() }, { status: 400 })
    }

    const { date, description, lines } = validation.data
    let { reference_number } = validation.data
    const status = body.status || 'DRAFT'

    if (status === 'POSTED' && !reference_number) {
      reference_number = await generateReferenceNumber(supabase, customerId)
    }

    // 1. Create Entry
    const { data: entry, error: entryError } = await supabase
      .from('journal_entries')
      .insert({
        user_id: user.id,
        customer_id: customerId,
        date: date.toISOString(),
        description,
        reference_number,
        status
      })
      .select()
      .single()

    if (entryError) throw entryError

    // 2. Create Lines
    const linesWithEntryId = lines.map((line: any) => ({
      entry_id: entry.id,
      account_id: line.accountId,
      description: line.description || description,
      debit: line.debit,
      credit: line.credit
    }))

    const { error: linesError } = await supabase
      .from('journal_lines')
      .insert(linesWithEntryId)

    if (linesError) {
      await supabase.from('journal_entries').delete().eq('id', entry.id)
      throw linesError
    }

    return NextResponse.json({ success: true, id: entry.id })
  } catch (error: any) {
    console.error('Save Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to save entry' }, { status: 500 })
  }
}
