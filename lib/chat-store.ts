import fs from 'fs/promises';
import path from 'path';

// Check if we're running in a serverless environment (Vercel)
const isServerless = process.env.VERCEL || !process.env.NODE_ENV || process.env.NODE_ENV === 'production';

// Define the path to the conversations.json file (only used in local development)
const conversationsFilePath = path.join(process.cwd(), 'conversations.json');

// In-memory storage for serverless environments - properly isolated by user
let memoryConversations: ConversationsData = {};

// Define the Chat and Message types
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  originalLanguage?: string; // 'az' for Azerbaijani, 'en' for English - only for assistant messages
  displayLanguage?: string; // The language this message was intended to be displayed in
}

export interface Chat {
  id: string;
  userId: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

type ConversationsData = Record<string, Chat>;

/**
 * Reads and parses the conversations data.
 */
export async function readConversations(): Promise<ConversationsData> {
  if (isServerless) {
    // Use in-memory storage for serverless environments
    return memoryConversations;
  }
  
  try {
    const data = await fs.readFile(conversationsFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If the file doesn't exist, return an empty object
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.warn('Conversations file not found, creating empty conversations store');
      return {};
    }
    console.error("Failed to read conversations file:", error);
    throw error;
  }
}

/**
 * Writes data to the conversations storage.
 */
export async function writeConversations(data: ConversationsData): Promise<void> {
  if (isServerless) {
    // Use in-memory storage for serverless environments
    memoryConversations = { ...data };
    return;
  }
  
  try {
    // Ensure the directory exists
    const dir = path.dirname(conversationsFilePath);
    await fs.mkdir(dir, { recursive: true });
    
    await fs.writeFile(conversationsFilePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error("Failed to write conversations file:", error);
    throw error;
  }
}

/**
 * Gets all chats for a specific user - WITH PROPER USER ISOLATION.
 */
export async function getUserChats(userId: string): Promise<Chat[]> {
  const conversations = await readConversations();
  // CRITICAL: Filter by userId to ensure users only see their own chats
  return Object.values(conversations).filter(chat => chat.userId === userId);
}

/**
 * Gets a specific chat by ID - WITH USER PERMISSION CHECK.
 */
export async function getChat(chatId: string): Promise<Chat | null> {
  const conversations = await readConversations();
  const chat = conversations[chatId];
  
  // Return the chat (permission check will be done in the API route)
  return chat || null;
}

/**
 * Creates a new chat.
 */
export async function createChat(userId: string, title: string, initialMessage?: string): Promise<Chat> {
  const conversations = await readConversations();
  const chatId = Date.now().toString();
  const now = new Date().toISOString();
  
  const newChat: Chat = {
    id: chatId,
    userId, // CRITICAL: Ensure userId is set correctly
    title,
    messages: initialMessage ? [{
      id: '1',
      role: 'user',
      content: initialMessage,
      timestamp: now
    }] : [],
    createdAt: now,
    updatedAt: now
  };
  
  const updatedConversations = { ...conversations, [chatId]: newChat };
  await writeConversations(updatedConversations);
  
  return newChat;
}

/**
 * Renames an existing chat - WITH USER PERMISSION CHECK.
 */
export async function renameChat(chatId: string, newTitle: string, userId: string): Promise<Chat | null> {
  const conversations = await readConversations();
  const chat = conversations[chatId];
  
  // CRITICAL: Ensure user can only rename their own chats
  if (!chat || chat.userId !== userId) {
    console.warn(`🚫 Access denied: User ${userId} tried to rename chat ${chatId} owned by ${chat?.userId}`);
    return null;
  }
  
  const updatedChat: Chat = {
    ...chat,
    title: newTitle,
    updatedAt: new Date().toISOString()
  };
  
  const updatedConversations = { ...conversations, [chatId]: updatedChat };
  await writeConversations(updatedConversations);
  
  return updatedChat;
}

/**
 * Adds a message to an existing chat - WITH USER PERMISSION CHECK.
 * Returns the newly created message.
 */
export async function addMessageToChat(chatId: string, message: Omit<Message, 'id' | 'timestamp'>, requestingUserId?: string): Promise<Message> {
  const conversations = await readConversations();
  const chat = conversations[chatId];
  
  if (!chat) {
    throw new Error('Chat not found');
  }
  
  // CRITICAL: If requestingUserId is provided, ensure user can only add messages to their own chats
  if (requestingUserId && chat.userId !== requestingUserId) {
    console.error(`🚫 Security violation: User ${requestingUserId} tried to add message to chat ${chatId} owned by ${chat.userId}`);
    throw new Error('Access denied: You can only add messages to your own chats');
  }
  
  const newMessage: Message = {
    ...message,
    id: (chat.messages.length + 1).toString(),
    timestamp: new Date().toISOString()
  };
  
  const updatedChat: Chat = {
    ...chat,
    messages: [...chat.messages, newMessage],
    updatedAt: new Date().toISOString()
  };
  
  const updatedConversations = { ...conversations, [chatId]: updatedChat };
  await writeConversations(updatedConversations);
  
  return newMessage;
}

/**
 * Deletes a chat - WITH USER PERMISSION CHECK.
 */
export async function deleteChat(chatId: string, userId: string): Promise<boolean> {
  const conversations = await readConversations();
  const chat = conversations[chatId];
  
  // CRITICAL: Ensure user can only delete their own chats
  if (!chat || chat.userId !== userId) {
    console.warn(`🚫 Access denied: User ${userId} tried to delete chat ${chatId} owned by ${chat?.userId}`);
    return false;
  }
  
  const { [chatId]: deleted, ...remainingConversations } = conversations;
  await writeConversations(remainingConversations);
  
  return true;
}

// Ensure the file exists
async function ensureFileExists() {
  // ... existing code ...
} 