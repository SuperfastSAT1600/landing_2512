import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const statusFilePath = path.join(process.cwd(), 'src/data/enrollment-page-status.json');

function readStatus(): Record<string, string> {
    try {
        return JSON.parse(readFileSync(statusFilePath, 'utf-8'));
    } catch {
        return {};
    }
}

export async function GET() {
    return NextResponse.json(readStatus());
}

export async function PATCH(req: NextRequest) {
    const { slug, status } = await req.json();
    if (!slug || !['active', 'paused'].includes(status)) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const current = readStatus();
    current[slug] = status;
    writeFileSync(statusFilePath, JSON.stringify(current, null, 2));
    return NextResponse.json({ slug, status });
}
