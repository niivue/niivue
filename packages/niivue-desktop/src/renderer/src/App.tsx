import { AppProvider } from './AppContext.js'
import MainApp from './MainApp.js'

export default function App(): JSX.Element {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  )
}
