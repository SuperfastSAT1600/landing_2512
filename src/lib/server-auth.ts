import { NextRequest } from 'next/server';

export function isAuthenticated(request: NextRequest): boolean {
    const authHeader = request.headers.get('x-admin-key');
    const secretKey = process.env.ADMIN_SECRET_KEY;
    if (!secretKey) {
        console.error("Admin API blocked: ADMIN_SECRET_KEY is not set in environment.");
        return false;
    }
    return authHeader === secretKey;
}
