
import { NextResponse } from "next/server"

export async function POST() {
    // Currently, ActiviaBook calculates balances dynamically from journal entries.
    // There are no stored aggregates to rebuild.
    // This endpoint accepts the request to signal "system maintenance" or cache clearing if needed in future.
    // The frontend will handle React Query invalidation upon success.

    return NextResponse.json({ success: true, message: "Calculations refreshed" })
}
