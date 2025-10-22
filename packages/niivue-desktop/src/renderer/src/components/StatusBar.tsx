import React from 'react'

interface StatusBarProps {
  location: string
}

export const StatusBar: React.FC<StatusBarProps> = ({ location }) => {
  return (
    <footer className="w-full bg-gray-200 text-sm text-gray-800 px-4 py-1 border-t border-gray-300">
      {location ? `${location}` : '\u00A0'}
    </footer>
  )
}
