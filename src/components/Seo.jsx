import { useEffect } from 'react'

// Lightweight per-page SEO: sets document title + meta description + OG tags.
export default function useSeo({ title, description }) {
  useEffect(() => {
    const fullTitle = title ? `${title} — India in Data` : 'India in Data'
    document.title = fullTitle

    const setMeta = (selector, attr, name, content) => {
      let el = document.querySelector(selector)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attr, name)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }
    if (description) {
      setMeta('meta[name="description"]', 'name', 'description', description)
      setMeta('meta[property="og:description"]', 'property', 'og:description', description)
    }
    setMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle)
  }, [title, description])
}
