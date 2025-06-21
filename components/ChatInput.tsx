'use client'

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Send, Paperclip, Loader2 } from 'lucide-react'

interface ChatInputProps {
  onSendMessage: (message: string) => void
  disabled?: boolean
  loading?: boolean
}

export interface ChatInputRef {
  focus: (options?: { preventScroll?: boolean }) => void
}

export const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(
  ({ onSendMessage, disabled = false, loading = false }, ref) => {
    const [message, setMessage] = useState('')
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    useImperativeHandle(ref, () => ({
      focus: (options) => {
        textareaRef.current?.focus(options)
      }
    }))

    useEffect(() => {
      // Auto-focus when component mounts
      textareaRef.current?.focus()
    }, [])

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setMessage(e.target.value)
      // Auto-resize logic is now handled directly on input change
      const textarea = e.target
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      if (message.trim() && !disabled && !loading) {
        onSendMessage(message)
        setMessage('')
        // Manually reset height to prevent layout jump
        if (textareaRef.current) {
          textareaRef.current.style.height = '44px' 
        }
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit(e)
      }
    }

    const isDisabled = disabled || loading

    return (
      <div className="border-t border-legal-200 bg-white p-4">
        <form onSubmit={handleSubmit} className="flex items-end space-x-3">
          <div className="flex-1 relative min-h-[44px]">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={loading ? "AI is thinking..." : "Ask your legal question in Azerbaijani..."}
              className="w-full resize-none border border-legal-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors absolute bottom-0 left-0 max-h-32"
              rows={1}
              disabled={isDisabled}
            />
            <button
              type="button"
              className="absolute right-3 bottom-3 text-legal-400 hover:text-legal-600 transition-colors"
              disabled={isDisabled}
            >
              <Paperclip className="h-4 w-4" />
            </button>
          </div>
          
          <button
            type="submit"
            disabled={!message.trim() || isDisabled}
            className="bg-primary-600 text-white p-3 rounded-xl hover:bg-primary-700 disabled:bg-legal-300 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </form>
        
        <div className="mt-2 text-xs text-legal-500 text-center">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    )
  }
)

ChatInput.displayName = 'ChatInput' 