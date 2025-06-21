import { NextRequest, NextResponse } from 'next/server';
import { getChat, addMessageToChat, deleteChat, renameChat } from '../../../../lib/chat-store';
import { verify } from 'jsonwebtoken';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'a-default-secret-for-development';

interface JwtPayload {
  userId: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  console.log('💬 Chat GET API called for chatId:', params.chatId);
  
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
    const { chatId } = params;

    if (!chatId) {
      console.log('❌ Chat ID is required');
      return NextResponse.json(
        { error: 'Chat ID is required' },
        { status: 400 }
      );
    }

    // Get specific chat
    const chat = await getChat(chatId);
    
    if (!chat) {
      console.log('❌ Chat not found:', chatId);
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }

    // Ensure user can only access their own chats
    if (chat.userId !== userId) {
      console.log('❌ Access denied: user', userId, 'trying to access chat', chatId, 'owned by', chat.userId);
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    console.log('✅ Chat retrieved successfully:', chatId);
    return NextResponse.json(chat, { status: 200 });

  } catch (error) {
    console.error('💥 Chat GET API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  console.log('💬 Chat POST API called for chatId:', params.chatId);
  
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
    const { chatId } = params;
    const body = await request.json();
    const { role, content } = body;
    
    console.log('📝 Adding message to chat:', { chatId, role, contentLength: content?.length });

    if (!chatId) {
      console.log('❌ Chat ID is required');
      return NextResponse.json(
        { error: 'Chat ID is required' },
        { status: 400 }
      );
    }

    if (!role || !content) {
      console.log('❌ Role and content are required');
      return NextResponse.json(
        { error: 'Role and content are required' },
        { status: 400 }
      );
    }

    if (!['user', 'assistant'].includes(role)) {
      console.log('❌ Invalid role:', role);
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    const updatedChat = await addMessageToChat(chatId, { role, content });
    console.log('✅ Message added to chat:', chatId);
    
    return NextResponse.json(updatedChat, { status: 200 });

  } catch (error) {
    console.error('💥 Chat POST API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  console.log('✏️ Chat PATCH API called for chatId:', params.chatId);
  
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const decodedPayload = verify(token, JWT_SECRET) as JwtPayload;
    const { userId } = decodedPayload;
    const { chatId } = params;
    const { title } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const updatedChat = await renameChat(chatId, title, userId);

    if (!updatedChat) {
      return NextResponse.json(
        { error: 'Chat not found or access denied' },
        { status: 404 }
      );
    }

    console.log('✅ Chat renamed successfully:', chatId);
    return NextResponse.json(updatedChat, { status: 200 });

  } catch (error) {
    console.error('💥 Chat PATCH API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  console.log('💬 Chat DELETE API called for chatId:', params.chatId);
  
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
    const { chatId } = params;

    if (!chatId) {
      console.log('❌ Chat ID is required');
      return NextResponse.json(
        { error: 'Chat ID is required' },
        { status: 400 }
      );
    }

    // Delete chat
    const success = await deleteChat(chatId, userId);
    
    if (!success) {
      console.log('❌ Chat not found or access denied:', chatId);
      return NextResponse.json(
        { error: 'Chat not found or access denied' },
        { status: 404 }
      );
    }

    console.log('✅ Chat deleted successfully:', chatId);
    return NextResponse.json(
      { message: 'Chat deleted successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('💥 Chat DELETE API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 