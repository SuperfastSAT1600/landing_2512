import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { password } = await request.json();

        const VALID_PASSWORD = process.env.ADMIN_PASSWORD;
        if (!VALID_PASSWORD) {
            console.error("Auth blocked: ADMIN_PASSWORD is not set.");
            return NextResponse.json({ success: false, message: "Server configuration error" }, { status: 500 });
        }

        if (password === VALID_PASSWORD) {
            return NextResponse.json({ success: true, apiKey: process.env.ADMIN_SECRET_KEY });
        } else {
            return NextResponse.json({ success: false, message: "Invalid password" }, { status: 401 });
        }
    } catch (error) {
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
