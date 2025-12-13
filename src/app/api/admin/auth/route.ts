import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { password } = await request.json();

        // In a real app, use an environment variable (process.env.ADMIN_PASSWORD)
        // For this local MVP, we use a fixed simpler code.
        const VALID_PASSWORD = process.env.ADMIN_PASSWORD || "missionto1600!";

        if (password === VALID_PASSWORD) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ success: false, message: "Invalid password" }, { status: 401 });
        }
    } catch (error) {
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
