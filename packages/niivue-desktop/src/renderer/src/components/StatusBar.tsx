import React from 'react'

interface StatusBarProps {
  location: string
}

export const StatusBar: React.FC<StatusBarProps> = ({ location }) => {
  return (
    <footer className="w-full bg-[var(--gray-4)] text-sm text-[var(--gray-12)] px-4 py-1 border-t border-[var(--gray-6)]">
      {location ? `${location}` : '\u00A0'}
    </footer>
  )
}
