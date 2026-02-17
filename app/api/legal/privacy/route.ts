import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
    try {
        const filePath = path.join(process.cwd(), 'data', 'legal', 'privacy.txt')
        const content = fs.readFileSync(filePath, 'utf8')
        return new NextResponse(content, {
            headers: { 'Content-Type': 'text/plain' }
        })
    } catch (error) {
        console.error('Error reading privacy policy:', error)
        return NextResponse.json({ error: 'Privacy policy not found' }, { status: 404 })
    }
}
