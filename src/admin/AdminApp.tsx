import type { Session, SupabaseClient } from '@supabase/supabase-js'
import type { FormEvent, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { media } from '../content'
import { getSupabase, supabaseConfigured } from '../lib/supabase'
import { Bookings } from './Bookings'

type Gate =
  | { kind: 'unconfigured' }
  | { kind: 'loading' }
  | { kind: 'failed'; message: string }
  | { kind: 'signed-out'; db: SupabaseClient }
  | { kind: 'not-admin'; db: SupabaseClient; email: string }
  | { kind: 'ready'; db: SupabaseClient; email: string }

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e))

export function AdminApp() {
  const [gate, setGate] = useState<Gate>(supabaseConfigured ? { kind: 'loading' } : { kind: 'unconfigured' })

  useEffect(() => {
    if (!supabaseConfigured) return
    let live = true
    let unsubscribe = () => {}

    getSupabase()
      .then((db) => {
        if (!live) return
        // A session counts only if its account is listed in public.admins (checked by the database).
        const check = async (session: Session | null) => {
          if (!session) return setGate({ kind: 'signed-out', db })
          const { data, error } = await db.rpc('is_admin')
          if (!live) return
          if (error) return setGate({ kind: 'failed', message: error.message })
          setGate({ kind: data ? 'ready' : 'not-admin', db, email: session.user.email ?? '' })
        }
        // Fires once straight away with any saved session, then on every sign-in and sign-out.
        const { data } = db.auth.onAuthStateChange((event, session) => {
          if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') return
          // Supabase advises not calling it again from inside this callback, so the check runs just after.
          setTimeout(() => void check(session), 0)
        })
        unsubscribe = () => data.subscription.unsubscribe()
      })
      .catch((e) => live && setGate({ kind: 'failed', message: errorText(e) }))

    return () => {
      live = false
      unsubscribe()
    }
  }, [])

  const signOut = 'db' in gate ? () => void gate.db.auth.signOut() : undefined
  const email = 'email' in gate ? gate.email : undefined

  return (
    <div className="admin-app">
      <header className="topbar">
        <a href="/" className="topbar__logo" aria-label="MRKTKings website">
          <img src={media.logo.src} width={media.logo.width} height={media.logo.height} alt="MRKTKings" />
        </a>
        {email !== undefined && signOut && (
          <div className="topbar__user">
            <span className="topbar__email">{email}</span>
            <button type="button" className="topbar__out" onClick={signOut}>
              Sign out
            </button>
          </div>
        )}
      </header>

      {gate.kind === 'ready' && <Bookings db={gate.db} />}
      {gate.kind === 'signed-out' && <SignIn db={gate.db} />}
      {gate.kind === 'loading' && <p className="gate__loading">Loading&hellip;</p>}
      {gate.kind === 'not-admin' && (
        <Card title="No access">
          <p>
            <strong>{gate.email}</strong> is signed in but isn&rsquo;t an admin. Ask whoever runs the Supabase project to add
            this account to the admins table (see the end of <code>supabase/schema.sql</code>), then sign in again.
          </p>
          <button type="button" className="abtn abtn--dark" onClick={signOut}>
            Sign out
          </button>
        </Card>
      )}
      {gate.kind === 'unconfigured' && (
        <Card title="Connect Supabase">
          <p>
            Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> to <code>.env</code>, run{' '}
            <code>supabase/schema.sql</code> in the Supabase SQL Editor, then restart the dev server or rebuild.
          </p>
        </Card>
      )}
      {gate.kind === 'failed' && (
        <Card title="Can’t reach the bookings">
          <p className="gate__error">{gate.message}</p>
          <p>
            If this mentions a missing function or table, run <code>supabase/schema.sql</code> in the Supabase SQL Editor.
          </p>
          <button type="button" className="abtn abtn--dark" onClick={() => window.location.reload()}>
            Try again
          </button>
        </Card>
      )}
    </div>
  )
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="gate">
      <div className="gate__card">
        <h1 className="gate__title">{title}</h1>
        <div className="gate__body">{children}</div>
      </div>
    </main>
  )
}

function SignIn({ db }: { db: SupabaseClient }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await db.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) setError(error.code === 'invalid_credentials' ? 'That email and password don’t match an admin account.' : error.message)
  }

  return (
    <main className="gate">
      <form className="gate__card" onSubmit={submit}>
        <h1 className="gate__title">Bookings</h1>
        <p className="gate__lead">Sign in to see the calls booked on the Let&rsquo;s Connect page.</p>
        <label className="afield">
          <span className="afield__label">Email</span>
          <input
            className="afield__input"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="afield">
          <span className="afield__label">Password</span>
          <input
            className="afield__input"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <p className="gate__error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="abtn abtn--red abtn--block" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}
