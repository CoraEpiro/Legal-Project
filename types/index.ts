export interface User {
  id: string
  username: string
  email: string
}

export interface Message {
  id: string
  role: 'user' | 'bot'
  content: string
  timestamp: Date
}

export interface Chat {
  id: string
  name: string
  messages: Message[]
  createdAt: Date
}

export interface LegalSource {
  id: string
  title: string
  url: string
  description: string
}

export interface ApiResponse<T = any> {
  success?: boolean
  data?: T
  error?: string
  message?: string
}

export interface AuthResponse {
  user: User
  token?: string
}

export interface ChatResponse {
  messages: Message[]
}

export interface AskResponse {
  answer: string
  sources?: LegalSource[]
} 