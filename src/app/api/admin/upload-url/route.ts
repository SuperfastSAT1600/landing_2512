import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
]);

export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { filename, contentType } = await request.json();

        if (!filename || !contentType) {
            return NextResponse.json({ success: false, error: 'filename and contentType are required' }, { status: 400 });
        }

        if (!ALLOWED_MIME_TYPES.has(contentType)) {
            return NextResponse.json({ success: false, error: 'File type not allowed' }, { status: 400 });
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniqueSuffix = `${Date.now()}-${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
        const path = `${year}/${month}/${uniqueSuffix}-${safeName}`;

        const { data, error } = await supabaseAdmin.storage
            .from('uploads')
            .createSignedUploadUrl(path);

        if (error || !data) {
            console.error('Signed URL error:', error);
            return NextResponse.json({ success: false, error: 'Failed to create upload URL' }, { status: 500 });
        }

        return NextResponse.json({ success: true, signedUrl: data.signedUrl, path, token: data.token });
    } catch (error) {
        console.error('Upload URL error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
