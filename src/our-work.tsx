import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Layout } from './components/Layout'
import { ProjectGallery } from './components/projects/ProjectGallery'
import { ProjectsHero } from './components/projects/ProjectsHero'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Layout>
      <ProjectsHero />
      <ProjectGallery />
    </Layout>
  </StrictMode>,
)
