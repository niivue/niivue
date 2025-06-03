import { AppProvider } from './AppContext'
import MainApp from './MainApp'

export default function App(): JSX.Element {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  )
}
