'use client'

import { useState, useRef, useEffect } from 'react'
import { PlusCircle, MessageSquare, Trash2, Edit, Check, X } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface Chat {
  id: string
  userId: string
  title: string
  messages: Message[]
  createdAt: string
  updatedAt: string
}

interface ChatSidebarProps {
  chats: Chat[]
  currentChat: Chat | null
  onChatSelect: (chatId: string) => void
  onNewChat: () => void
  onDeleteChat: (chatId: string) => void
  onRenameChat: (chatId: string, newTitle: string) => void
  open: boolean
}

export function ChatSidebar({
  chats,
  currentChat,
  onChatSelect,
  onNewChat,
  onDeleteChat,
  onRenameChat,
  open
}: ChatSidebarProps) {
  const [editingChatId, setEditingChatId] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingChatId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingChatId])

  const handleStartEditing = (chat: Chat) => {
    setEditingChatId(chat.id)
    setNewTitle(chat.title)
  }

  const handleCancelEditing = () => {
    setEditingChatId(null)
    setNewTitle('')
  }

  const handleRenameChat = async (chatId: string) => {
    if (!newTitle.trim() || !editingChatId) {
      handleCancelEditing()
      return
    }

    try {
      const response = await fetch(`/api/chat/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      })

      if (response.ok) {
        toast.success('Chat renamed!')
        onRenameChat(chatId, newTitle)
      } else {
        toast.error('Failed to rename chat.')
      }
    } catch (error) {
      console.error('Failed to rename chat:', error)
      toast.error('An error occurred while renaming.')
    } finally {
      handleCancelEditing()
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  if (!open) return null

  return (
    <div className="bg-white border-r border-legal-200 w-full flex flex-col h-full">
      <div className="p-4 border-b border-legal-200">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold"
        >
          <PlusCircle className="h-5 w-5" />
          <span>New Chat</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <h2 className="text-sm font-semibold text-legal-600 mb-2">Recent Chats</h2>
        {chats.length > 0 ? (
          <div className="space-y-2">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  currentChat?.id === chat.id
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-legal-700 hover:bg-legal-100'
                }`}
                onClick={() => editingChatId !== chat.id && onChatSelect(chat.id)}
              >
                <div className="flex items-center min-w-0 flex-1">
                  <MessageSquare className="h-5 w-5 mr-3 flex-shrink-0" />
                  {editingChatId === chat.id ? (
                    <input
                      ref={inputRef}
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameChat(chat.id)
                        if (e.key === 'Escape') handleCancelEditing()
                      }}
                      className="flex-grow bg-transparent focus:outline-none min-w-0"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="flex-grow truncate">{chat.title}</span>
                  )}
                </div>
                
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  {editingChatId === chat.id ? (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); handleRenameChat(chat.id); }} className="p-1 hover:text-green-600"><Check className="h-4 w-4" /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleCancelEditing(); }} className="p-1 hover:text-red-600"><X className="h-4 w-4" /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); handleStartEditing(chat); }} className="p-1 hover:text-legal-900"><Edit className="h-4 w-4" /></button>
                      <button onClick={(e) => { e.stopPropagation(); onDeleteChat(chat.id); }} className="p-1 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-sm text-legal-500 py-4">
            No chats yet. Start a new conversation!
          </div>
        )}
      </div>
    </div>
  )
} 