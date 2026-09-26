import { useState } from 'react'

export default function Admin() {
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  async function handleLogin(event) {
    event.preventDefault()

    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/admin-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage(data.error || 'Unable to sign in.')
        return
      }

      if (data.authenticated) {
        setIsAuthenticated(true)
        setPassword('')
      }
    } catch (error) {
      console.error('Admin login error:', error)
      setMessage('Unable to connect to the login service.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isAuthenticated) {
    return (
      <main>
        <h1>Bus Stop Stories</h1>
        <h2>Moderator Dashboard</h2>

        <p>You're signed in.</p>

        <p>Story moderation tools coming next.</p>
      </main>
    )
  }

  return (
    <main>
      <h1>Bus Stop Stories</h1>
      <h2>Moderator Dashboard</h2>

      <p>
        Enter the moderator password to continue.
      </p>

      <form onSubmit={handleLogin}>
        <label htmlFor="admin-password">
          Moderator password
        </label>

        <input
          id="admin-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />

        <button
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>

      {message && <p>{message}</p>}
    </main>
  )
}