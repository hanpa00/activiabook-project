import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'


export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await req.json() // Original Entry ID

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    // 1. Fetch Original Entry
    const { data: originalEntry, error: fetchError } = await supabase
      .from('journal_entries')
      .select('*, journal_lines(*)')
      .eq('id', id)
      .single()

    if (fetchError || !originalEntry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    if (originalEntry.status !== 'POSTED') {
      return NextResponse.json({ error: 'Only POSTED entries can be voided' }, { status: 400 })
    }

    // 2. Prepare Void Entry
    const voidDescription = `VOID: ${originalEntry.description || ''}`.trim()
    const { data: voidEntry, error: createError } = await supabase
      .from('journal_entries')
      .insert({
        user_id: user.id,
        date: new Date().toISOString(), // Void date is today
        description: voidDescription,
        status: 'POSTED', // Void entries are posted immediately? Or Draft? Usually Posted to lock it.
        reference_number: `VOID-${originalEntry.reference_number || originalEntry.id.slice(0, 8)}`
      })
      .select()
      .single()

    if (createError) throw createError

    // 3. Create Reversed Lines
    const reversedLines = originalEntry.journal_lines.map((line: any) => ({
      entry_id: voidEntry.id,
      account_id: line.account_id,
      description: line.description,
      debit: line.credit,   // SWAP
      credit: line.debit    // SWAP
    }))

    const { error: linesError } = await supabase
      .from('journal_lines')
      .insert(reversedLines)

    if (linesError) {
      await supabase.from('journal_entries').delete().eq('id', voidEntry.id)
      throw linesError
    }

    // 4. Update Original to ARCHIVED? Or just leave it as POSTED? 
    // Requirement says: "Entries in 'DRAFT' status can be fully updated or deleted... POSTED status are Read-Only... Void button... creates new Journal Entry".
    // It doesn't say we change only the status of original. But commonly we might mark it Reverted.
    // Requirement says "Add a status column ... Enum: 'DRAFT', 'POSTED', 'ARCHIVED'".
    // Probably we should mark original as ARCHIVED? Or just leave it and have the Void entry offset it. 
    // Usually Void implies the original is nullified. Archiving it might be good.
    // I will mark original as 'ARCHIVED' to indicate it's been handled.
    
    // Actually, "Void" usually means "Reversed". I'll stick to just creating the reversal entry.
    // The requirement says "Add a 'Void' button... creates a new Journal Entry...". It doesn't explicitly say "Archive" the old one, but we have an ARCHIVED status. 
    // I'll leave the original as POSTED for audit trail, the Reversal is the fix. ARCHIVED might be for soft-deletes.
    
    return NextResponse.json({ success: true, voidEntryId: voidEntry.id })

  } catch (error: any) {
    console.error('Void Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to void entry' }, { status: 500 })
  }
}
