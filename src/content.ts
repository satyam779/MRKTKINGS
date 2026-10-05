// All homepage copy, links and media paths live here so they can be edited
// without touching the components. Media files are served from /public/media.

export const media = {
  logo: { src: '/media/logo.webp', width: 585, height: 80 },
  crown: '/media/crown.svg',
  // Screens under 1024px wide get the 720p copy (half the size).
  heroVideo: '/media/hero.mp4',
  heroVideoSmall: '/media/hero-720.mp4',
  // Still frame shown while the video loads, or if the phone refuses to autoplay it.
  heroPoster: '/media/hero-poster.webp' as string | undefined,
  // Services reel in the intro card. Always muted: a small preview loops on the card and its play button
  // opens it full size. Screens under 1024px wide get the 720p copy to save data (see Media in the README
  // for the full-quality master).
  reelVideo: '/media/services-reel-1080.mp4',
  reelVideoSmall: '/media/services-reel-720.mp4',
  // Still frame shown until the reel plays (phones on Data Saver start from this).
  reelPoster: '/media/reel-poster.webp' as string | undefined,
}

export const links = {
  services: '/services/',
  work: '/our-work/',
  about: '/about/',
  careers: 'https://mrktkings.com/careers/',
  // The Let's Connect page. Add ?service=<slug> to pre-select that service in the form.
  contact: '/contact-us/',
  email: 'mailto:connect@mrktkings.com',
  whatsapp: 'https://wa.me/917204002430',
  linkedin: 'https://www.linkedin.com/company/mrktkings/',
  instagram: 'https://www.instagram.com/mrkt.kings',
  // Footer "Other links" stay hidden while these are '#'; add the page URLs once they exist.
  privacy: '#',
  disclaimer: '#',
}

export const hero = {
  lines: ['Crowning', 'Brands with'],
  highlight: 'SUCCESS.',
}

export const intro = {
  label: 'Welcome to MRKTKings',
  tag: "Let's grow together",
  statement:
    "We're the powerhouse behind unstoppable D2C brands. Strategy, creativity, and data working as one.",
  accent: 'unstoppable',
}

// Copy from the live Services page (mrktkings.com/services). Order matches that page.
export const services = [
  {
    slug: 'performance-marketing',
    title: 'Performance Marketing',
    tagline: 'Clicks that convert, strategy that scales.',
    text: "Performance isn't just numbers, it's narrative with intent. We blend data, design, and strategy to move audiences from awareness to action. From paid social to conversion funnels, every click has a purpose.",
    closing: "The result? Sustainable growth that doesn't just look good on paper, it feels right in market.",
    image: '/media/service-performance-marketing.webp',
  },
  {
    slug: 'social-media-management',
    title: 'Social Media Management',
    tagline: 'Your brand, amplified and alive.',
    text: 'Your brand deserves more than scheduled posts and recycled trends. We craft digital ecosystems that spark emotion and keep attention. Each caption, reel, and comment builds towards connection, not just engagement.',
    closing: 'Because online presence is power when culture leads the way.',
    image: '/media/service-social-media-management.webp',
  },
  {
    slug: 'branding',
    title: 'Branding',
    tagline: 'Identity engineered to last.',
    text: "We don't design brands; we engineer identities that outlive campaigns. From tone and typography to color and conversation, everything tells your story. Our branding process dives deep into who you are and who you're meant to be.",
    closing: 'The output? A brand that looks iconic and moves with intention.',
    image: '/media/service-branding.webp',
  },
  {
    slug: 'influencer-marketing',
    title: 'Influencer Marketing',
    tagline: 'Creators that amplify, not just advertise.',
    text: "Influence isn't borrowed, it's built through trust and authenticity. We partner your brand with creators who align in voice, vibe, and value. Our campaigns are strategic ecosystems, not one-off shoutouts.",
    closing: 'The goal: community, credibility, and conversions that endure.',
    image: '/media/service-influencer-marketing.webp',
  },
  {
    slug: 'ux-ui-web-development',
    title: 'UX/UI Design and Web Development',
    tagline: 'Digital experiences that click.',
    text: "Your website is more than a digital storefront, it's your brand's universe. We design sleek, functional experiences where creativity meets conversion. From motion to micro-interaction, every element feels intentional and alive.",
    closing: 'A seamless fusion of design, usability, and future-ready aesthetics.',
    image: '/media/service-ux-ui-web-development.webp',
  },
  {
    slug: 'retention-marketing',
    title: 'Retention Marketing',
    tagline: 'Customers today, loyalists tomorrow.',
    text: 'Acquisition wins attention, retention builds empires. We craft lifecycle strategies that nurture loyalty through data and delight. From automation flows to customer journeys, we make every touchpoint count.',
    closing: "Because true growth isn't viral, it's consistent, intentional, and human.",
    image: '/media/service-retention-marketing.webp',
  },
]

// Services hero (/services/). The last word of the headline cycles through `words`.
export const servicesPage = {
  title: 'Our Royal Suite',
  // The two words set huge with the reel playing inside them. Scrolling zooms into the middle letter of
  // the second word, so keep it a letter with a solid upright stroke (like the I in SUITE).
  mask: ['Royal', 'Suite'],
  lead: 'built to',
  words: ['convert.', 'trend.', 'scale.', 'last.'],
  intro: 'A creative-led growth powerhouse blending strategy, design, and performance.',
  promises: ['No gimmicks', 'No bots', 'Real collabs', 'Results that last'],
}

export const whyUs = {
  label: 'Why brands choose us',
  heading: 'We turn ideas into powerful results.',
  points: [
    { title: 'Pro Team', text: 'Specialists in branding, performance marketing, and creative strategy.' },
    { title: 'Great Experience', text: 'Proven strategies from years scaling diverse D2C brands.' },
  ],
  closing: 'Strategy, creative and performance under one crown.',
}

export const work = {
  label: 'Works we have done',
  heading: 'Every project solves a real challenge and drives measurable growth.',
  // Slugs from `projects` below. Each card plays that project's reel and opens it on the Projects page.
  featured: ['glow-glossary', 'guugly-wuugly'],
}

// Projects page (mrktkings.com/our-work). Names and services come from the live site.
// `industry` is read off each brand's own reel; confirm with the client.
// Glow Glossary, Guugly Wuugly and Saray and Valley aren't on the live site yet: their industry, summary and
// services are all read off their reels, so confirm those three with the client too.
// Reels can be square or portrait (9:16); cards crop portrait ones towards the top, where faces usually are.
// Optional case-study fields (`challenge`, `approach`, `results`, `website`) show up in the
// project popup as soon as they're filled in.
// Tapping the reel in the popup plays it full size. `fullVideo` is a copy with sound for that; without one the
// muted `video` opens full size instead (Guugly Wuugly's master has no audio track).
export type Project = {
  slug: string
  name: string
  industry: string
  summary: string
  services: string[]
  video: string
  poster: string
  fullVideo?: string
  challenge?: string
  approach?: string
  results?: string[]
  website?: string
}

export const projectsPage = {
  eyebrow: 'Projects',
  title: ['Our kind of Work.', 'Your kind of'],
  highlight: 'Wow.',
  intro: 'Every project is crafted to solve real business challenges and drive measurable growth. Here are a few of the brands we have helped claim their crown.',
}

export const projects: Project[] = [
  {
    slug: 'glow-glossary',
    name: 'Glow Glossary',
    industry: 'Juices & smoothies',
    summary: 'Creator collaborations, content curation and social media management.',
    services: ['Influencer Marketing', 'Content Curation', 'SMM'],
    video: '/media/work-glow-glossary.mp4',
    poster: '/media/work-glow-glossary-poster.webp',
    fullVideo: '/media/work-glow-glossary-full.mp4',
  },
  {
    slug: 'guugly-wuugly',
    name: 'Guugly Wuugly',
    industry: 'Kidswear',
    summary: 'Content curation and social media management.',
    services: ['Content Curation', 'SMM'],
    video: '/media/work-guugly-wuugly.mp4',
    poster: '/media/work-guugly-wuugly-poster.webp',
  },
  {
    slug: 'saray-and-valley',
    name: 'Saray and Valley',
    industry: 'Ethnic & bridal wear',
    summary: 'Content curation and social media management.',
    services: ['Content Curation', 'SMM'],
    video: '/media/work-saray-and-valley.mp4',
    poster: '/media/work-saray-and-valley-poster.webp',
    fullVideo: '/media/work-saray-and-valley-full.mp4',
  },
  {
    slug: 'sereneve',
    name: 'Serenève',
    industry: 'Fashion',
    summary: 'Complete brand setup with an e-commerce web store.',
    services: ['Branding', 'UI Design', 'Web Development', 'SMM'],
    video: '/media/work-sereneve.mp4',
    poster: '/media/work-sereneve-poster.webp',
  },
  {
    slug: 'baindemer',
    name: 'BainDeMer',
    industry: 'Resort wear',
    summary: 'UI design, content curation and social media management.',
    services: ['UI Design', 'Content Curation', 'SMM'],
    video: '/media/work-baindemer.mp4',
    poster: '/media/work-baindemer-poster.webp',
  },
  {
    slug: 'ethik',
    name: 'Ethik',
    industry: 'Leather-free footwear',
    summary: 'UI design and content curation.',
    services: ['UI Design', 'Content Curation'],
    video: '/media/work-ethik.mp4',
    poster: '/media/work-ethik-poster.webp',
  },
  {
    slug: 'my-natural-detox',
    name: 'My Natural Detox',
    industry: 'Health supplements',
    summary: 'Web development, content curation and social media management.',
    services: ['Web Development', 'Content Curation', 'SMM'],
    video: '/media/work-my-natural-detox.mp4',
    poster: '/media/work-my-natural-detox-poster.webp',
  },
]

// What each project tag means, shown under "What we delivered". `service` links to the Services page.
export const deliverables: Record<string, { label: string; text: string; service?: string }> = {
  Branding: {
    label: 'Branding',
    text: 'Identity engineered to last: tone, typography, colour and conversation built around who the brand is.',
    service: 'branding',
  },
  'UI Design': {
    label: 'UI Design',
    text: 'Digital experiences that click: sleek, functional interfaces where creativity meets conversion.',
    service: 'ux-ui-web-development',
  },
  'Web Development': {
    label: 'Web Development',
    text: "A storefront that works as the brand's universe, built to be fast, seamless and future-ready.",
    service: 'ux-ui-web-development',
  },
  'Influencer Marketing': {
    label: 'Influencer Marketing',
    text: 'Creators that amplify, not just advertise: partners who match the brand in voice, vibe and value.',
    service: 'influencer-marketing',
  },
  'Content Curation': {
    label: 'Content Curation',
    text: 'Shoots, reels and visual stories curated so every post looks and feels unmistakably on-brand.',
  },
  SMM: {
    label: 'Social Media Management',
    text: 'Your brand, amplified and alive: captions, reels and community that build connection, not just engagement.',
    service: 'social-media-management',
  },
}

// About page (/about/). First-person lines are draft copy for Aamir to review.
export const about = {
  name: 'Aamir Hussain',
  initials: 'AH',
  role: 'Founder',
  // Blurred still behind the head turn. (The share image is /public/og-about.jpg, made from a portrait that's
  // no longer shipped; it's in git history: `git show 6c6ccc4:public/media/about-portrait.webp > portrait.webp`.)
  portraitBlur: '/media/about-portrait-blur.webp',
  // Cut-out head turn in the hero: frame 0 looks left, the last frame looks right.
  // `count` must match the frames in /public/media/about-turn (00.webp, 01.webp, ...).
  turn: { path: '/media/about-turn/', count: 90, center: 48, width: 878, height: 971 },
  watermark: 'Founder',
  hero: {
    left: ['Aamir', 'Hussain'],
    right: ['Founder,', 'MRKTKings'],
    intro:
      "Hi, I'm Aamir Hussain. I started MRKTKings to help D2C brands look sharp, sell harder and grow for real. Based in Bengaluru.",
  },
  statement: {
    belief: "I believe great marketing is felt before it's noticed.",
    story:
      'I started MRKTKings to turn ideas into brands people remember and products they come back for. From the first strategy call to the final campaign, every detail is intentional. I work with founders and D2C brands who care about craft.',
  },
  // Shown only once real numbers are added, e.g. { value: '40+', label: 'Projects delivered' }.
  metrics: [] as { value: string; label: string }[],
  whatIDo: {
    heading: 'What I build',
    text: 'From brand identity to performance campaigns, MRKTKings handles strategy, creative and growth end to end.',
    // `service` is the slug of the matching section on the Services page.
    items: [
      { title: 'Brand Strategy', text: 'Identities and positioning that make D2C labels look like category leaders.', service: 'branding' },
      { title: 'Performance', text: 'Paid campaigns built around return on ad spend, tested and scaled.', service: 'performance-marketing' },
      { title: 'Content & Social', text: 'Reels, creators and community that keep brands alive online.', service: 'social-media-management' },
      { title: 'Web & Retention', text: 'Stores that convert and flows that bring customers back.', service: 'ux-ui-web-development' },
    ],
  },
  process: {
    heading: 'Three steps. Zero friction.',
    text: 'Clear communication and fast turnaround at every stage.',
    steps: [
      { title: 'Discover', text: 'We talk. Your brand, your numbers, your customer, and what is holding growth back.' },
      { title: 'Create', text: 'We plan and create. Strategy, content and campaigns built around what we found.' },
      { title: 'Scale', text: 'You grow. Budget goes behind what works, and you see the results clearly.' },
    ],
  },
  signoff: {
    heading: "Let's build something worth remembering.",
    note: 'Open to new brands and collaborations.',
  },
}

// Let's Connect page (/contact-us/). Step one collects the brief, step two books a discovery call.
export const connectPage = {
  title: ["Let's build", 'something'],
  highlight: 'iconic.',
  intro: "Tell us where your brand is and where you want it to go, then pick a time to talk. We'll come to the call with ideas.",
  // `service` is the matching Services page slug, so "Get started" on that service pre-selects the chip.
  // `icon` picks the card's icon (see ServiceIcon in DetailsStep.tsx).
  interests: [
    { label: 'Performance Marketing', service: 'performance-marketing', icon: 'chart' },
    { label: 'Social Media', service: 'social-media-management', icon: 'chat' },
    { label: 'Branding', service: 'branding', icon: 'gem' },
    { label: 'Influencer Marketing', service: 'influencer-marketing', icon: 'star' },
    { label: 'Website & UX/UI', service: 'ux-ui-web-development', icon: 'browser' },
    { label: 'Retention Marketing', service: 'retention-marketing', icon: 'repeat' },
    { label: 'Content Creation', icon: 'camera' },
    { label: 'Something else', icon: 'sparkle' },
  ] as { label: string; service?: string; icon: string }[],
  budgetLabel: 'Budget',
  budgets: ['Under ₹1L', '₹1L – 3L', '₹3L – 10L', '₹10L+'],
}

// Discovery-call slots, set in Bengaluru time. Visitors see them converted to their own time zone.
export const booking = {
  callMinutes: 30,
  // Days the team takes calls: 0 = Sunday, 1 = Monday … 6 = Saturday.
  days: [1, 2, 3, 4, 5],
  // First and last call start times (24-hour, Bengaluru time).
  from: '10:00',
  until: '18:30',
  daysAhead: 30,
  // The earliest slot on offer is at least this many hours away.
  noticeHours: 3,
  timeZone: 'Asia/Kolkata',
  // Must match `timeZone` (India has no daylight saving, so this never changes).
  utcOffsetMinutes: 330,
  zoneLabel: 'IST',
  eventTitle: 'Discovery call with MRKTKings',
  eventDetails: "We'll confirm the call and email you a meeting link.",
}

export const cta = {
  lead: 'Ready to scale your brand to',
  highlight: 'the next level',
  sub: 'Your growth journey starts here.',
}

export const contact = {
  email: 'Connect@MRKTKings.com',
  phone: '+91 72040 02430',
  address: ['615/B, Jayanagar 4th Block,', '10C Main Road, Bengaluru,', 'Karnataka 560011, India'],
}
