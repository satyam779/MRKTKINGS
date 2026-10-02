import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Layout } from './components/Layout'
import { AboutHero } from './components/about/AboutHero'
import { Metrics, Process, Signoff, WhatIDo } from './components/about/AboutSections'
import { Statement } from './components/about/Statement'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Layout cta={false}>
      <AboutHero />
      <Statement />
      <Metrics />
      <WhatIDo />
      <Process />
      <Signoff />
    </Layout>
  </StrictMode>,
)
