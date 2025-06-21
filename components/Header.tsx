'use client'

import { Menu, X, User, LogOut } from 'lucide-react'
import { Scale } from 'lucide-react'
import { LanguageSelector } from './LanguageSelector'

interface User {
  id: string
  username: string
  email: string
}

interface HeaderProps {
  user: User | null
  onLogout: () => void
  onToggleSidebar: () => void
  sidebarOpen: boolean
}

export function Header({ user, onLogout, onToggleSidebar, sidebarOpen }: HeaderProps) {
  return (
    <header className="bg-white border-b border-legal-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleSidebar}
            className="p-2 text-legal-600 hover:text-legal-900 hover:bg-legal-100 rounded-lg transition-colors"
            title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="bg-primary-600 p-2 rounded-lg">
              <Scale className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-legal-900">Legal Assistant</h1>
              <p className="text-sm text-legal-500">Azerbaijani AI Legal Chat</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <LanguageSelector />
          {user && (
            <div className="flex items-center space-x-2 text-legal-700">
              <User className="h-4 w-4" />
              <span className="font-medium">{user.username}</span>
            </div>
          )}
          <button
            onClick={onLogout}
            className="flex items-center space-x-2 px-3 py-2 text-legal-600 hover:text-legal-800 hover:bg-legal-100 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  )
} 