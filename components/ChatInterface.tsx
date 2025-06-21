'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from './providers/AuthProvider'
import { ChatSidebar } from './ChatSidebar'
import { ChatMessage, LoadingMessage } from './ChatMessage'
import { ChatInput, ChatInputRef } from './ChatInput'
import { Header } from './Header'
import { Scale, Send, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Disclaimer } from './Disclaimer'
import { useLanguage } from './providers/LanguageProvider'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  originalLanguage?: string
  displayLanguage?: string
}

interface Chat {
  id: string
  userId: string
  title: string
  messages: Message[]
  createdAt: string
  updatedAt: string
}

export function ChatInterface() {
  const { user, logout } = useAuth()
  const [chats, setChats] = useState<Chat[]>([])
  const [currentChat, setCurrentChat] = useState<Chat | null>(null)
  const [loading, setLoading] = useState(false)
  const [isChatsLoading, setIsChatsLoading] = useState(true)
  const [isLegalSearch, setIsLegalSearch] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const { language } = useLanguage()
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<ChatInputRef>(null)

  useEffect(() => {
    // Check if the disclaimer has been accepted
    const disclaimerAccepted = localStorage.getItem('disclaimerAccepted')
    if (disclaimerAccepted !== 'true') {
      setShowDisclaimer(true)
    }
    loadChats()
  }, [])

  useEffect(() => {
    // This is now the single source of truth for scrolling.
    scrollToBottom()
  }, [currentChat?.messages])

  const handleAcceptDisclaimer = () => {
    localStorage.setItem('disclaimerAccepted', 'true')
    setShowDisclaimer(false)
  }

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    })
  }

  const loadChats = async () => {
    setIsChatsLoading(true)
    try {
      const response = await fetch('/api/chats')
      if (response.ok) {
        const data = await response.json()
        setChats(data || [])
        
        // Load first chat if it exists, otherwise show welcome
        if (data?.length > 0) {
          if (!currentChat || !data.some((c: Chat) => c.id === currentChat.id)) {
            loadChat(data[0].id)
          }
        }
      }
    } catch (error) {
      console.error('Failed to load chats:', error)
      toast.error('Failed to load chats')
    } finally {
      setIsChatsLoading(false)
    }
  }

  const loadChat = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chat/${chatId}`)
      if (response.ok) {
        const chat = await response.json()
        setCurrentChat(chat)
      } else {
        toast.error('Failed to load chat')
      }
    } catch (error) {
      console.error('Failed to load chat:', error)
      toast.error('Failed to load chat')
    }
  }

  const createNewChat = async () => {
    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Chat',
          initialMessage: ''
        })
      })

      if (response.ok) {
        const newChat = await response.json()
        setChats([newChat, ...chats])
        setCurrentChat(newChat)
      } else {
        toast.error('Failed to create new chat')
      }
    } catch (error) {
      console.error('Failed to create chat:', error)
      toast.error('Failed to create new chat')
    }
  }

  const handleRenameChat = (chatId: string, newTitle: string) => {
    // Update the title in the main chats array
    setChats(prevChats => 
      prevChats.map(chat => 
        chat.id === chatId ? { ...chat, title: newTitle, updatedAt: new Date().toISOString() } : chat
      )
    );
    // Update the title in the current open chat as well
    if (currentChat?.id === chatId) {
      setCurrentChat(prevChat => prevChat ? { ...prevChat, title: newTitle } : null);
    }
    // Note: Toast message is handled by the ChatSidebar component
  };

  const deleteChat = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chat/${chatId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setChats(chats.filter(chat => chat.id !== chatId))
        if (currentChat?.id === chatId) {
          const remainingChats = chats.filter(chat => chat.id !== chatId)
          if (remainingChats.length > 0) {
            loadChat(remainingChats[0].id)
          } else {
            setCurrentChat(null)
          }
        }
        toast.success('Chat deleted successfully!')
      } else {
        toast.error('Failed to delete chat')
      }
    } catch (error) {
      console.error('Failed to delete chat:', error)
      toast.error('Failed to delete chat')
    }
  }

  const sendMessage = async (content: string) => {
    if (!content.trim() || loading) return

    setLoading(true)
    setIsLegalSearch(false) // Reset legal search state

    // Optimistic UI update for user message
    const tempUserMessageId = Date.now().toString()
    const userMessage: Message = {
      id: tempUserMessageId,
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    }

    let tempChat = currentChat;

    // If there is no active chat, create a temporary one for the UI
    if (!tempChat) {
      tempChat = {
        id: 'temp-chat',
        userId: user!.id,
        title: 'New Chat',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    
    // Add user message to current chat optimistically
    const updatedChatWithUserMessage = { ...tempChat, messages: [...tempChat.messages, userMessage] };
    setCurrentChat(updatedChatWithUserMessage);

    try {
      const response = await fetch('/api/generate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: content,
          chatId: tempChat.id === 'temp-chat' ? null : tempChat.id,
          language: language
        })
      })

      if (response.ok) {
        const data = await response.json();
        const { assistantMessage, chatId } = data;

        // If it was a new chat, we need to update our state
        if (tempChat.id === 'temp-chat') {
          // Replace the temporary chat with the real one, which includes the new message
          const newChat = { 
            id: chatId, 
            userId: user!.id,
            messages: [userMessage, assistantMessage],
            title: assistantMessage.content.substring(0, 40) + '...',
            createdAt: assistantMessage.timestamp,
            updatedAt: assistantMessage.timestamp,
          };
          setCurrentChat(newChat);
          // Add the new chat to the sidebar list, removing the temp one
          setChats(prev => [newChat, ...prev.filter(c => c.id !== 'temp-chat')]);
        } else {
          // It's an existing chat, just add the new message
          setCurrentChat(prev => {
            if (prev) {
              return { ...prev, messages: [...prev.messages, assistantMessage] };
            } else {
              return null;
            }
          });
        }
        
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to get response');
        // On error, revert the optimistic update
        setCurrentChat(prev => prev ? { ...prev, messages: prev.messages.filter(m => m.id !== tempUserMessageId) } : null);
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      toast.error('Network error. Please try again.')
      // On error, revert the optimistic update
      setCurrentChat(prev => prev ? { ...prev, messages: prev.messages.filter(m => m.id !== tempUserMessageId) } : null);
    } finally {
      setLoading(false)
      setIsLegalSearch(false)
      // After everything, focus the input and let the useEffect handle the scroll
      setTimeout(() => {
        chatInputRef.current?.focus({ preventScroll: true })
      }, 100)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-legal-50">
      {showDisclaimer && <Disclaimer onAccept={handleAcceptDisclaimer} />}
      <Header 
        user={user} 
        onLogout={logout}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
      />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 ease-in-out flex-shrink-0 bg-white border-r border-legal-200`}>
          <div className="h-full overflow-y-auto">
            <ChatSidebar
              chats={chats}
              currentChat={currentChat}
              onChatSelect={loadChat}
              onNewChat={createNewChat}
              onDeleteChat={deleteChat}
              onRenameChat={handleRenameChat}
              open={sidebarOpen}
            />
          </div>
        </div>
        
        {/* Main chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Main Chat Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isChatsLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-legal-600"></div>
              </div>
            ) : currentChat ? (
              currentChat.messages.length > 0 ? (
                <>
                  {currentChat.messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      isUser={message.role === 'user'}
                    />
                  ))}
                  {loading && <LoadingMessage isLegal={isLegalSearch} />}
                </>
              ) : (
                // This state is for when a chat is selected but has no messages yet
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Scale className="h-12 w-12 text-legal-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-legal-900 mb-2">
                      This chat is empty.
                    </h3>
                    <p className="text-legal-600">
                      Send a message to start the conversation.
                    </p>
                  </div>
                </div>
              )
            ) : (
              // This is the true empty state for a new user
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                   <Scale className="h-12 w-12 text-legal-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-legal-900 mb-2">
                      Welcome to Azerbaijani Legal Assistant
                    </h3>
                    <p className="text-legal-600">
                      Click "New Chat" or ask me any legal question in Azerbaijani to get started.
                    </p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-legal-200 p-4">
            <ChatInput
              ref={chatInputRef}
              onSendMessage={sendMessage}
              loading={loading}
              disabled={loading}
            />
          </div>
        </div>
      </div>
    </div>
  )
} 