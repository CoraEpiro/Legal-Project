'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkMath from 'remark-math'
import rehypeRaw from 'rehype-raw'
import 'katex/dist/katex.min.css'

interface MarkdownRendererProps {
  content: string
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  // Sanitize content by removing potentially problematic outer divs from the AI
  const sanitizedContent = content.replace(/<div class=".*?">/g, '').replace(/<\/div>/g, '');

  return (
    <div className="prose prose-sm max-w-none break-words">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex]}
      >
        {sanitizedContent}
      </ReactMarkdown>
    </div>
  )
}

// Make sure to export it as default as well for any legacy imports
export default MarkdownRenderer 