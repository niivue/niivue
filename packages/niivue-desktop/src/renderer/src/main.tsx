import '@radix-ui/themes/styles.css'
import './assets/main.css'
import { Theme } from '@radix-ui/themes'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  // disable strict mode due to double rendering annoyance with niivue
  // <React.StrictMode>
  // <App />
  <Theme>
    <App />
  </Theme>
  // </React.StrictMode>
)
