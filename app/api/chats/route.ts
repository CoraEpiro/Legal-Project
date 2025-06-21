import { NextRequest, NextResponse } from 'next/server';
import { getUserChats, createChat } from '../../../lib/chat-store';
import { verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'a-default-secret-for-development';

interface JwtPayload {
  userId: string;
}

export async function GET(request: NextRequest) {
  console.log('💬 Chats GET API called');
  
  try {
    // Verify authentication
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
    console.log('📖 Loading chats for user:', userId);

    // Get all chats for the user
    const chats = await getUserChats(userId);
    console.log('✅ Loaded', chats.length, 'chats for user');
    
    return NextResponse.json(chats, { status: 200 });

  } catch (error) {
    console.error('💥 Chats GET API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log('💬 Chats POST API called');
  
  try {
    // Verify authentication
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
    const body = await request.json();
    const { title, initialMessage } = body;
    
    console.log('📝 Creating new chat:', { title, hasInitialMessage: !!initialMessage });
    
    if (!title) {
      console.log('❌ Title is required');
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const newChat = await createChat(userId, title, initialMessage);
    console.log('✅ New chat created:', newChat.id);
    
    return NextResponse.json(newChat, { status: 201 });

  } catch (error) {
    console.error('💥 Chats POST API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 