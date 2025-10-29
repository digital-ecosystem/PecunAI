'use client';
import React from 'react';
import DOMPurify from 'dompurify';

interface HTMLRendererProps {
  content: string;
  className?: string;
  fallback?: string;
}

const HTMLRenderer: React.FC<HTMLRendererProps> = ({ 
  content, 
  className = "", 
  fallback = "No content available." 
}) => {
  // Handle empty or undefined content
  const htmlContent = content || fallback;

  // Sanitize the HTML content
  const sanitizedHTML = DOMPurify.sanitize(htmlContent, {
    // You can customize allowed tags and attributes
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote',
      'a', 'span', 'div', 'table', 'tr', 'td', 'th', 'thead', 'tbody'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'id'],
    // Prevent external links from opening in the same window
    FORBID_ATTR: ['onclick', 'onload', 'onerror'],
    // Add target="_blank" to external links
    ADD_ATTR: ['target'],
  });

  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
    />
  );
};

export default HTMLRenderer;