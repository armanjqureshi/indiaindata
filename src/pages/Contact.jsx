import { useState } from 'react'
import useSeo from '../components/Seo.jsx'

export default function Contact() {
  useSeo({
    title: 'Contact',
    description: 'Write to the India in Data team about stories, corrections, data or licensing.',
  })

  const [values, setValues] = useState({ name: '', email: '', message: '' })
  const [errors, setErrors] = useState({})
  const [sent, setSent] = useState(false)

  const set = (field) => (e) => {
    setValues((v) => ({ ...v, [field]: e.target.value }))
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }))
  }

  const submit = () => {
    const next = {}
    if (!values.name.trim()) next.name = 'Add your name so we know who to reply to.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
      next.email = 'Enter a valid email address, like name@example.com.'
    if (values.message.trim().length < 10)
      next.message = 'Tell us a little more — at least 10 characters.'
    setErrors(next)
    if (Object.keys(next).length === 0) setSent(true)
  }

  const inputCls = (field) =>
    `w-full rounded-md border px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-brand ${
      errors[field] ? 'border-down' : 'border-ink/20'
    } bg-white`

  return (
    <>
      <section className="border-b border-ink/10 bg-white">
        <div className="mx-auto max-w-site px-4 py-12 sm:px-6">
          <h1 className="font-display text-4xl font-semibold sm:text-5xl">Contact</h1>
          <p className="mt-3 max-w-2xl leading-body text-ink/70">
            Story tips, corrections, dataset requests or licensing questions — we read everything.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        {sent ? (
          <div role="status" className="rounded-lg border border-market/30 bg-market-light p-8 text-center">
            <p className="font-display text-2xl font-semibold text-market">Message sent</p>
            <p className="mt-2 text-sm leading-body text-ink/70">
              Thanks, {values.name.trim()}. We reply to most messages within two working days.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-5">
              <div>
                <label htmlFor="c-name" className="mb-1.5 block text-sm font-semibold">
                  Name
                </label>
                <input
                  id="c-name"
                  type="text"
                  value={values.name}
                  onChange={set('name')}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? 'c-name-err' : undefined}
                  className={inputCls('name')}
                />
                {errors.name && (
                  <p id="c-name-err" role="alert" className="mt-1.5 text-xs font-medium text-down">
                    {errors.name}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="c-email" className="mb-1.5 block text-sm font-semibold">
                  Email
                </label>
                <input
                  id="c-email"
                  type="email"
                  value={values.email}
                  onChange={set('email')}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'c-email-err' : undefined}
                  className={inputCls('email')}
                />
                {errors.email && (
                  <p id="c-email-err" role="alert" className="mt-1.5 text-xs font-medium text-down">
                    {errors.email}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="c-message" className="mb-1.5 block text-sm font-semibold">
                  Message
                </label>
                <textarea
                  id="c-message"
                  rows={6}
                  value={values.message}
                  onChange={set('message')}
                  aria-invalid={!!errors.message}
                  aria-describedby={errors.message ? 'c-message-err' : undefined}
                  className={inputCls('message')}
                />
                {errors.message && (
                  <p id="c-message-err" role="alert" className="mt-1.5 text-xs font-medium text-down">
                    {errors.message}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={submit}
                className="self-start rounded-md bg-brand px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
              >
                Send message
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  )
}
