import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Layout } from './components/Layout'
import { ConnectPage } from './components/connect/ConnectPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Layout cta={false}>
      <ConnectPage />
    </Layout>
  </StrictMode>,
)
