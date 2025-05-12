import React from 'react'
import { AppProvider } from './AppContext'
import MainApp from './MainApp'

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  )
}
