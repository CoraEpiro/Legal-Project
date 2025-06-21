import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';
import { addMessageToChat, createChat, getChat } from '@/lib/chat-store';
import { generateAnswer, translateText } from '@/lib/legal-search';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'a-default-secret-for-development';

export async function POST(request: NextRequest) {
  console.log('🤖 Generate Answer API called (Full Logic)');
  
  try {
    // Verify authentication - use cookies like other routes
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      console.log('❌ No auth token found');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let decodedPayload: JwtPayload;
    try {
      decodedPayload = verify(token, JWT_SECRET) as JwtPayload;
      console.log('🎫 JWT token verified for user:', decodedPayload.userId);
    } catch (error) {
      console.log('❌ JWT verification failed:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { userId } = decodedPayload;
    const { question, chatId: initialChatId, language } = await request.json();
    let chatId = initialChatId;

    if (!question) {
      return NextResponse.json({ error: 'Missing question' }, { status: 400 });
    }

    // If no chatId is provided, create a new chat
    if (!chatId) {
      const newChat = await createChat(userId, "New Chat");
      chatId = newChat.id;
      console.log(`✨ New chat created with ID: ${chatId}`);
    }
    
    // Save the user's message first to ensure it's in the history for the AI
    await addMessageToChat(chatId, { role: 'user', content: question });
    console.log(`💬 User message saved to chat ${chatId}`);

    // Now get the full chat history, which includes the new user message
    const fullChat = await getChat(chatId);
    const history = fullChat ? fullChat.messages.map(m => ({ role: m.role, content: m.content })) : [];
    
    // Call the new generateAnswer function with history
    const aiResponseContent = await generateAnswer(question, history);
    console.log('✅ AI response generated in Azerbaijani.');

    // Save the original Azerbaijani response with language metadata
    const assistantMessage = await addMessageToChat(chatId, { 
      role: 'assistant', 
      content: aiResponseContent,
      originalLanguage: 'az',
      displayLanguage: language || 'az'
    });
    console.log(`💬 Original assistant message saved to chat ${chatId}`);

    // If English is requested, translate for display, but don't save the translation to history.
    if (language === 'en' && assistantMessage.content) {
      console.log('🌐 Translating response to English...');
      assistantMessage.content = await translateText(assistantMessage.content, 'Azerbaijani', 'English');
      console.log('✅ Translation complete.');
    }

    return NextResponse.json({ assistantMessage, chatId }, { status: 200 });

  } catch (error) {
    console.error('💥 Generate Answer API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'An error occurred while generating the answer.', details: errorMessage },
      { status: 500 }
    );
  }
} 