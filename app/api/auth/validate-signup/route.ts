import { NextResponse } from 'next/server';
import { isTestModeEnabled, validateProfileData } from '@/utils/auth/test-accounts';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, profileData } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        if (isTestModeEnabled()) {
            const validation = validateProfileData(email, profileData || {});

            if (!validation.valid) {
                // Return 403 Forbidden for disallowed signups
                return NextResponse.json({
                    error: validation.message || 'Signup restricted to test accounts only.'
                }, { status: 403 });
            }
        }

        return NextResponse.json({ valid: true });
    } catch (error: any) {
        console.error('Validate Signup Error:', error);
        return NextResponse.json({
            error: error.message || 'Failed to validate signup'
        }, { status: 500 });
    }
}
