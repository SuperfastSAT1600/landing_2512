import { NextRequest, NextResponse } from 'next/server';

const CRM_USERS: { code: string; name: string }[] = [
    { code: 'dlalswo', name: '이민재' },
    { code: 'rladndud', name: '김우영' },
    { code: 'rlaskawns', name: '김남준' },
    { code: 'rlawodus', name: '김재연' },
    { code: 'qoqudbs', name: '배병윤' },
    { code: 'qkrrmsdn', name: '박근우' },
    { code: 'alsrud', name: '민경' },
];

export async function POST(request: NextRequest) {
    try {
        const { password } = await request.json();

        const VALID_PASSWORD = process.env.ADMIN_PASSWORD;
        if (!VALID_PASSWORD) {
            console.error("Auth blocked: ADMIN_PASSWORD is not set.");
            return NextResponse.json({ success: false, message: "Server configuration error" }, { status: 500 });
        }

        if (password === VALID_PASSWORD) {
            return NextResponse.json({ success: true, apiKey: process.env.ADMIN_SECRET_KEY, userName: '관리자' });
        }

        const crmUser = CRM_USERS.find(u => u.code === password);
        if (crmUser) {
            return NextResponse.json({ success: true, apiKey: process.env.ADMIN_SECRET_KEY, userName: crmUser.name });
        }

        return NextResponse.json({ success: false, message: "Invalid password" }, { status: 401 });
    } catch (error) {
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
