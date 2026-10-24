import { CONTACT_EMAIL } from '../data/site.js'

// Honest newsletter prompt: opens an email to the editor. No backend yet.
export default function NewsletterSignup({ compact = false, inverse = false }) {
  const href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Add me to the India in Data list')}&body=${encodeURIComponent('Please add this address to the India in Data email list.')}`
  return (
    <div>
      {!compact && (
        <p className={`mb-3 text-sm leading-body ${inverse ? 'text-paper/70' : 'text-ink/60'}`}>
          We do not run an automated newsletter yet. Email us to join the list and we will write when the first edition is ready.
        </p>
      )}
      <a
        href={href}
        className={`inline-block rounded-sm px-5 py-2.5 text-sm font-semibold transition-colors ${inverse ? 'bg-paper text-brand hover:bg-paper/90' : 'bg-brand text-paper hover:bg-brand-dark'}`}
      >
        Email to join the list
      </a>
    </div>
  )
}
