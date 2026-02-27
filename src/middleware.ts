/**
 * src/middleware.ts
 *
 * NOTE: Firebase client-side Auth stores tokens in localStorage / IndexedDB,
 * NOT in HTTP cookies. This means we cannot check auth state in Edge middleware
 * without the Firebase Admin SDK + a service account.
 *
 * Auth protection is handled entirely by AdminLayout (client-side onAuthStateChanged).
 * This middleware file is kept as a placeholder for future server-side auth if needed.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Pass all requests through — auth guard is in AdminLayout
    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*'],
};
