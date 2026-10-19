import { useState } from 'react'

// Newsletter form with client-side validation and a success state.
// No backend — phase 2 will wire a provider.
export default function NewsletterSignup({ compact = false, inverse = false }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const submit = () => {
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    if (!valid) {
      setError('Enter a valid email address, like name@example.com.')
      return
    }
    setError('')
    setDone(true)
  }

  if (done) {
    return (
      <div
        role="status"
        className={`rounded-sm border px-4 py-3 text-sm font-medium ${
          inverse
            ? 'border-paper/20 bg-paper/15 text-paper'
            : 'border-market/30 bg-market-light text-market'
        }`}
      >
        Subscribed. Your first data brief arrives this week.
      </div>
    )
  }

  return (
    <div>
      {!compact && (
        <p className={`mb-3 text-sm leading-body ${inverse ? 'text-paper/70' : 'text-ink/60'}`}>
          One email a week. The charts that explain India, and the stories behind them.
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={`nl-email-${compact ? 'c' : 'f'}${inverse ? 'i' : ''}`} className="sr-only">
          Email address
        </label>
        <input
          id={`nl-email-${compact ? 'c' : 'f'}${inverse ? 'i' : ''}`}
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (error) setError('')
          }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="you@example.com"
          aria-invalid={!!error}
          className={`w-full rounded-sm border px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-brand ${
            inverse
              ? 'border-paper/25 bg-paper/15 text-paper placeholder:text-paper/50'
              : 'border-ink/20 bg-panel text-ink placeholder:text-ink/40'
          } ${error ? 'border-down' : ''}`}
        />
        <button
          type="button"
          onClick={submit}
          className="shrink-0 rounded-sm bg-brand px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-brand-dark"
        >
          Subscribe
        </button>
      </div>
      {error && (
        <p role="alert" className={`mt-2 text-xs font-medium ${inverse ? 'text-red-300' : 'text-down'}`}>
          {error}
        </p>
      )}
    </div>
  )
}
