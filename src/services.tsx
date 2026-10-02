import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Layout } from './components/Layout'
import { ServiceStack } from './components/ServiceStack'
import { ServicesHero } from './components/ServicesHero'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Layout>
      <ServicesHero />
      <ServiceStack />
    </Layout>
  </StrictMode>,
)
