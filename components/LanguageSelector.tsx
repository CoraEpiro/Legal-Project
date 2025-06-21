'use client'

import { useLanguage } from './providers/LanguageProvider'

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="flex items-center space-x-1 rounded-full p-1 bg-legal-100">
      <button
        onClick={() => setLanguage('az')}
        className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${
          language === 'az'
            ? 'bg-white text-primary-600 shadow-sm'
            : 'bg-transparent text-legal-600 hover:bg-legal-200'
        }`}
      >
        AZ
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${
          language === 'en'
            ? 'bg-white text-primary-600 shadow-sm'
            : 'bg-transparent text-legal-600 hover:bg-legal-200'
        }`}
      >
        EN
      </button>
    </div>
  )
} 