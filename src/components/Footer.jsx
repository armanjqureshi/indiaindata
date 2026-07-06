import { Link } from 'react-router-dom'
import NewsletterSignup from './NewsletterSignup.jsx'
import StatBlock from './StatBlock.jsx'
import { siteStats } from '../data/content.js'

const BROWSE = [
  { label: 'News', to: '/news' },
  { label: 'Business', to: '/business' },
  { label: 'Market', to: '/market' },
  { label: 'Blogs', to: '/blogs' },
  { label: 'Indicators', to: '/indicators' },
  { label: 'IPOs', to: '/ipos' },
  { label: 'Economy', to: '/topic/economy' },
  { label: 'Society', to: '/topic/society' },
]

const ABOUT = [
  { label: 'About', to: '/about' },
  { label: 'Team', to: '/about#team' },
  { label: 'Using our work', to: '/about#using-our-work' },
  { label: 'Contact', to: '/contact' },
]

const SOCIALS = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com',
    icon: (
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: 'X',
    href: 'https://x.com',
    icon: (
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.2l7.3-8.3L1 2h6.5l4.4 5.9L18.9 2Zm-1.1 18h1.7L7.6 3.9H5.8L17.8 20Z" />
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com',
    icon: (
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5ZM.24 8.25h4.52V23H.24V8.25ZM8.34 8.25h4.33v2.01h.06c.6-1.14 2.08-2.34 4.28-2.34 4.58 0 5.42 3.01 5.42 6.92V23h-4.51v-7.16c0-1.71-.03-3.91-2.38-3.91-2.39 0-2.75 1.86-2.75 3.78V23H8.34V8.25Z" />
      </svg>
    ),
  },
]

export default function Footer() {
  return (
    <footer className="mt-16 bg-ink text-white">
      <div className="mx-auto max-w-site px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-3">
          <nav aria-label="Browse">
            <h2 className="font-display text-lg font-semibold">Browse</h2>
            <ul className="mt-4 space-y-2.5">
              {BROWSE.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="text-sm text-white/70 transition-colors hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="About">
            <h2 className="font-display text-lg font-semibold">About</h2>
            <ul className="mt-4 space-y-2.5">
              {ABOUT.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="text-sm text-white/70 transition-colors hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <h2 className="font-display text-lg font-semibold">Sign up for the newsletter</h2>
            <div className="mt-4">
              <NewsletterSignup inverse />
            </div>
            <div className="mt-6">
              <p className="text-sm text-white/70">Follow us</p>
              <div className="mt-2.5 flex gap-2">
                {SOCIALS.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`India in Data on ${s.label}`}
                    className="rounded-md border border-white/20 p-2 text-white/70 transition-colors hover:border-white/50 hover:text-white"
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stats band */}
        <div className="mt-12 grid gap-8 border-t border-white/15 pt-10 sm:grid-cols-3">
          {siteStats.map((s) => (
            <StatBlock key={s.label} value={s.value} label={s.label} inverse />
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-6 text-xs text-white/50">
          <p>© {new Date().getFullYear()} India in Data · indiaindata.online</p>
          <p>Charts and data free to reuse with attribution.</p>
        </div>
      </div>
    </footer>
  )
}
