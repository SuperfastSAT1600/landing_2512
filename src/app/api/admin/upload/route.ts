import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { isAuthenticated } from '@/lib/server-auth';

const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
        }

        if (!ALLOWED_MIME_TYPES.has(file.type)) {
            return NextResponse.json({ success: false, error: "File type not allowed" }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ success: false, error: "File too large (max 10MB)" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Create directory structure: public/uploads/YYYY/MM
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', `${year}`, `${month}`);

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniqueSuffix = `${Date.now()}-${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
        const filename = `${uniqueSuffix}-${safeName}`;
        const filePath = path.join(uploadDir, filename);

        fs.writeFileSync(filePath, buffer);

        const publicUrl = `/uploads/${year}/${month}/${filename}`;
        return NextResponse.json({ success: true, url: publicUrl });
    } catch (error) {
        return NextResponse.json({ success: false, error: "Upload failed" }, { status: 500 });
    }
}
