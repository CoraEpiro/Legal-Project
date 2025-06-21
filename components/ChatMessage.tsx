'use client'

import { User, Bot, Scale, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { MarkdownRenderer } from './MarkdownRenderer'
import { useLanguage } from './providers/LanguageProvider'
import { useState, useEffect } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  originalLanguage?: string
  displayLanguage?: string
}

interface ChatMessageProps {
  message: Message
  isUser: boolean
}

interface LoadingMessageProps {
  isLegal?: boolean
}

export function LoadingMessage({ isLegal = false }: LoadingMessageProps) {
  return (
    <div className="flex justify-start">
      <div className="flex flex-row items-start space-x-3">
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isLegal ? 'bg-accent-600 text-white' : 'bg-legal-600 text-white'
        }`}>
          {isLegal ? (
            <Scale className="h-4 w-4" />
          ) : (
            <Bot className="h-4 w-4" />
          )}
        </div>

        {/* Loading Content */}
        <div className="flex-1">
          <div className="inline-block p-4 rounded-2xl message-bot">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin text-legal-600" />
              <span className="text-legal-600">
                {isLegal ? 'Hüquqi mənbələrdə axtarılır...' : 'Düşünürəm...'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MessageContent({ message, isUser }: { message: Message, isUser: boolean }) {
  const { language, isLoading } = useLanguage();
  const [displayContent, setDisplayContent] = useState(message.content);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    // Don't do anything while language is still loading
    if (isLoading) return;
    
    // Reset content to original when starting
    setDisplayContent(message.content);
    
    // Only translate assistant messages
    if (!isUser && message.role === 'assistant') {
      let needsTranslation = false;
      
      // For messages with language metadata
      if (message.originalLanguage && message.displayLanguage) {
        needsTranslation = (
          (language === 'en' && message.displayLanguage === 'az') ||
          (language === 'az' && message.displayLanguage === 'en')
        );
      } else {
        // For old messages without language metadata, assume they are in Azerbaijani
        // and need translation to English if current language is English
        needsTranslation = language === 'en';
      }

      if (needsTranslation) {
        setIsTranslating(true);
        
        // Translate the message
        const translateMessage = async () => {
          try {
            const response = await fetch('/api/translate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: message.content,
                fromLang: message.displayLanguage === 'en' ? 'English' : 'Azerbaijani',
                toLang: language === 'en' ? 'English' : 'Azerbaijani'
              })
            });

            if (response.ok) {
              const { translatedText } = await response.json();
              setDisplayContent(translatedText);
            } else {
              // Fallback to original content if translation fails
              setDisplayContent(message.content);
            }
          } catch (error) {
            console.error('Translation failed:', error);
            setDisplayContent(message.content);
          } finally {
            setIsTranslating(false);
          }
        };

        translateMessage();
      }
    }
  }, [isLoading, language, message.content, message.displayLanguage, message.originalLanguage, message.role, isUser]);

  if (isTranslating) {
    return (
      <div className="flex items-center space-x-2">
        <Loader2 className="h-4 w-4 animate-spin text-legal-600" />
        <span className="text-legal-600">Translating...</span>
      </div>
    );
  }

  return isUser ? (
    <div className="break-words whitespace-pre-wrap">{displayContent}</div>
  ) : (
    <MarkdownRenderer content={displayContent} />
  );
}

export function ChatMessage({ message, isUser }: ChatMessageProps) {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-3xl ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start space-x-3`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser 
            ? 'bg-primary-600 text-white' 
            : 'bg-legal-600 text-white'
        }`}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </div>

        {/* Message Content */}
        <div className={`flex-1 ${isUser ? 'text-right' : 'text-left'}`}>
          <div className={`inline-block p-4 rounded-2xl ${
            isUser 
              ? 'message-user' 
              : 'message-bot'
          }`}>
            <MessageContent message={message} isUser={isUser} />
          </div>
          
          <div className={`text-xs text-legal-500 mt-2 ${
            isUser ? 'text-right' : 'text-left'
          }`}>
            {format(new Date(message.timestamp), 'HH:mm')}
          </div>
        </div>
      </div>
    </div>
  )
} 