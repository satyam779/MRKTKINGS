import { Hero } from './components/Hero'
import { Intro } from './components/Intro'
import { Layout } from './components/Layout'
import { Marquee } from './components/Marquee'
import { Services } from './components/Services'
import { WhyUs } from './components/WhyUs'
import { Work } from './components/Work'

export default function App() {
  return (
    <Layout>
      <Hero />
      <Marquee />
      <Intro />
      <Services />
      <WhyUs />
      <Work />
    </Layout>
  )
}
