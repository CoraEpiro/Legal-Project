'use client'

import { useAuth } from '@/components/providers/AuthProvider'
import { ChatInterface } from '@/components/ChatInterface'
import { AuthInterface } from '@/components/AuthInterface'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function HomePage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!user) {
    return <AuthInterface />
  }

  return <ChatInterface />
} 