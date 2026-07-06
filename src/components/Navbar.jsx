import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'

const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/news', label: 'News' },
  { to: '/business', label: 'Business' },
  { to: '/market', label: 'Market' },
  { to: '/blogs', label: 'Blogs' },
  { to: '/indicators', label: 'Indicators' },
  { to: '/ipos', label: 'IPOs' },
  { to: '/about', label: 'About' },
]

export default function Navbar() {
  const [condensed, setCondensed] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setCondensed(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const goSearch = () => {
    const q = query.trim()
    setSearchOpen(false)
    setMenuOpen(false)
    setQuery('')
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search')
  }

  return (
    <header
      className={`sticky top-0 z-50 border-b border-ink/10 bg-paper/95 backdrop-blur transition-all duration-200 ${
        condensed ? 'shadow-sm' : ''
      }`}
    >
      <div
        className={`mx-auto flex max-w-site items-center justify-between gap-4 px-4 transition-all duration-200 sm:px-6 ${
          condensed ? 'py-2.5' : 'py-4'
        }`}
      >
        <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="India in Data — home">
          <span aria-hidden="true" className="flex h-8 w-8 items-end justify-center gap-[3px] rounded-md bg-brand p-1.5">
            <span className="h-2 w-1 bg-white" />
            <span className="h-3.5 w-1 bg-white" />
            <span className="h-5 w-1 bg-white" />
          </span>
          <span className="font-display text-lg font-semibold leading-none sm:text-xl">
            India <span className="text-brand">in</span> Data
          </span>
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-light text-brand' : 'text-ink/70 hover:bg-ink/5 hover:text-ink'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label={searchOpen ? 'Close search' : 'Open search'}
            aria-expanded={searchOpen}
            className="rounded-md p-2 text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink"
          >
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </button>
          <a
            href="#newsletter"
            className="hidden rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark sm:inline-block"
          >
            Subscribe
          </a>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            className="rounded-md p-2 text-ink/70 hover:bg-ink/5 lg:hidden"
          >
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="border-t border-ink/10 bg-white">
          <div className="mx-auto flex max-w-site items-center gap-2 px-4 py-3 sm:px-6">
            <label htmlFor="nav-search" className="sr-only">
              Search articles, charts and datasets
            </label>
            <input
              id="nav-search"
              autoFocus
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && goSearch()}
              placeholder="Search across articles, charts and datasets"
              className="w-full rounded-md border border-ink/20 px-3.5 py-2 text-sm outline-none focus:border-brand"
            />
            <button
              type="button"
              onClick={goSearch}
              className="shrink-0 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Search
            </button>
          </div>
        </div>
      )}

      {/* Mobile menu */}
      {menuOpen && (
        <nav aria-label="Mobile" className="border-t border-ink/10 bg-white lg:hidden">
          <div className="mx-auto flex max-w-site flex-col px-4 py-2 sm:px-6">
            {NAV_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2.5 text-sm font-medium ${
                    isActive ? 'bg-brand-light text-brand' : 'text-ink/80 hover:bg-ink/5'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
            <a
              href="#newsletter"
              onClick={() => setMenuOpen(false)}
              className="mx-3 my-2 rounded-md bg-brand px-4 py-2.5 text-center text-sm font-semibold text-white"
            >
              Subscribe
            </a>
          </div>
        </nav>
      )}
    </header>
  )
}
