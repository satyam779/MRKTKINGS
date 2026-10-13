import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Layout } from './components/Layout'
import { AboutHero } from './components/about/AboutHero'
import { Letter } from './components/about/Letter'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Layout>
      <AboutHero />
      <Letter />
    </Layout>
  </StrictMode>,
)
