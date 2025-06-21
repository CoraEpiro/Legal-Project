import { NextRequest, NextResponse } from 'next/server';
import { readUsers, User } from '../../../../lib/user-store';
import { verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'a-default-secret-for-development';

interface JwtPayload {
  userId: string;
}

export async function GET(request: NextRequest) {
  console.log('🔐 Me API called');
  
  try {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      console.log('❌ No auth token found');
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    let decodedPayload;
    try {
      decodedPayload = verify(token, JWT_SECRET) as JwtPayload;
      console.log('🎫 JWT token verified for user:', decodedPayload.userId);
    } catch (error) {
      console.log('❌ JWT verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { userId } = decodedPayload;
    const users = await readUsers();
    console.log('📖 Loaded users from storage');
    
    const userData = users[userId];

    if (!userData) {
      console.log('❌ User not found in storage:', userId);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const currentUser: User = {
      id: userId,
      username: (userData as any).username,
      email: (userData as any).email,
      name: (userData as any).name,
      surname: (userData as any).surname,
    };

    console.log('✅ Current user retrieved:', currentUser.username);
    return NextResponse.json(currentUser, { status: 200 });

  } catch (error) {
    console.error('💥 Me API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 