import { NextRequest, NextResponse } from 'next/server';
import { readUsers, User, isValidEmail } from '../../../../lib/user-store';
import bcrypt from 'bcryptjs';
import { sign } from 'jsonwebtoken';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'a-default-secret-for-development';

export async function POST(request: NextRequest) {
  console.log('🔐 Login API called');
  
  try {
    const body = await request.json();
    const { email, password } = body;
    
    console.log('📝 Login attempt:', { email, hasPassword: !!password });
    
    // Input validation
    if (!email || !password) {
      console.log('❌ Missing required fields');
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!isValidEmail(email)) {
      console.log('❌ Invalid email format:', email);
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    console.log('✅ Input validation passed');

    const users = await readUsers();
    console.log('📖 Loaded users from storage');
    
    // Find user by email (case-insensitive)
    const userEntry = Object.entries(users).find(([id, userData]) => 
      (userData as any).email.toLowerCase() === email.toLowerCase()
    );

    if (!userEntry) {
      console.log('❌ User not found:', email);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const [id, userData] = userEntry;
    console.log('👤 User found:', id);
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, (userData as any).password || '');

    if (!isPasswordValid) {
      console.log('❌ Invalid password for user:', id);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    console.log('✅ Password verified successfully');

    const user: User = {
      id,
      username: (userData as any).username,
      email: (userData as any).email,
      name: (userData as any).name,
      surname: (userData as any).surname,
    };

    // Create JWT token
    const token = sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    console.log('🎫 JWT token created');

    // Create response with secure cookie
    const response = NextResponse.json(user, { status: 200 });
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      path: '/',
      maxAge: 604800, // 7 days
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
    
    console.log('✅ Login successful for user:', user.username);
    return response;

  } catch (error) {
    console.error('💥 Login API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 