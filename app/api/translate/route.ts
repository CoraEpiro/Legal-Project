import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';
import { translateText } from '@/lib/legal-search';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'a-default-secret-for-development';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    try {
      verify(token, JWT_SECRET) as JwtPayload;
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { text, fromLang, toLang } = await request.json();

    if (!text || !fromLang || !toLang) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const translatedText = await translateText(text, fromLang, toLang);

    return NextResponse.json({ translatedText }, { status: 200 });

  } catch (error) {
    console.error('Translation API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Translation failed', details: errorMessage },
      { status: 500 }
    );
  }
} 