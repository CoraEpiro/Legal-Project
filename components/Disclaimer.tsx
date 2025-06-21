'use client'

import React from 'react'

interface DisclaimerProps {
  onAccept: () => void;
}

export function Disclaimer({ onAccept }: DisclaimerProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-lg w-full transform transition-all" role="dialog" aria-modal="true" aria-labelledby="disclaimer-title">
        <h2 id="disclaimer-title" className="text-2xl font-bold mb-4 text-legal-900">
          Important Disclaimer
        </h2>
        <div className="space-y-4 text-legal-700">
          <p>
            You are interacting with an AI Legal Assistant.
          </p>
          <p>
            While this bot uses reliable sources and strives to provide accurate, up-to-date information, it is an automated system and can make mistakes or omissions. The information provided is for informational purposes only and does not constitute legal advice.
          </p>
          <p className="font-semibold">
            This AI is not a substitute for a qualified human lawyer.
          </p>
          <p>
            By proceeding, you acknowledge these limitations and agree that you are not receiving legal advice.
          </p>
        </div>
        <button
          onClick={onAccept}
          className="mt-8 w-full bg-primary-600 text-white py-3 px-4 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors font-semibold"
        >
          I Understand and Agree
        </button>
      </div>
    </div>
  )
} 