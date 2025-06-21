import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('🔐 Logout API called');
  
  try {
    // Create response with cleared cookie
    const response = NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    );
    
    // Clear the auth token cookie
    response.cookies.set('auth_token', '', {
      httpOnly: true,
      path: '/',
      maxAge: 0, // Expire immediately
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
    
    console.log('✅ User logged out successfully');
    return response;

  } catch (error) {
    console.error('💥 Logout API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 