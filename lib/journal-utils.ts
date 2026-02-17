import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Generates the next sequential reference number for a journal entry.
 * Format: JE-XXXXX (e.g., JE-00001)
 */
export async function generateReferenceNumber(
    supabase: SupabaseClient,
    customerId: string
): Promise<string> {
    // Fetch the latest reference number for this customer that starts with 'JE-'
    const { data, error } = await supabase
        .from('journal_entries')
        .select('reference_number')
        .eq('customer_id', customerId)
        .ilike('reference_number', 'JE-%')
        .order('reference_number', { ascending: false })
        .limit(1)

    if (error) {
        console.error('Error fetching latest reference number:', error)
        return 'JE-00001' // Fallback
    }

    if (!data || data.length === 0) {
        return 'JE-00001'
    }

    const latestRef = data[0].reference_number
    const match = latestRef.match(/JE-(\d+)/)

    if (!match) {
        return 'JE-00001'
    }

    const currentNumber = parseInt(match[1], 10)
    const nextNumber = currentNumber + 1

    // Pad with leading zeros to 5 digits
    const paddedNumber = nextNumber.toString().padStart(5, '0')
    return `JE-${paddedNumber}`
}
