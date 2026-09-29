import { useEffect, useState } from 'react'
import './Admin.css'

export default function Admin() {
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [pendingStories, setPendingStories] = useState([])
  const [storiesLoading, setStoriesLoading] = useState(false)
  const [moderatingStoryId, setModeratingStoryId] = useState(null)

  // Check whether the moderator already has a valid session
  useEffect(() => {
    async function checkSession() {
      try {
        const response = await fetch('/api/admin-session')

        if (!response.ok) {
          setIsAuthenticated(false)
          return
        }

        const data = await response.json()

        setIsAuthenticated(data.authenticated === true)
      } catch (error) {
        console.error('Session check error:', error)
        setIsAuthenticated(false)
      } finally {
        setIsCheckingSession(false)
      }
    }

    checkSession()
  }, [])

  // Load pending stories after authentication
  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    async function loadPendingStories() {
      setStoriesLoading(true)
      setMessage('')

      try {
        const response = await fetch('/api/admin-stories')

        if (!response.ok) {
          throw new Error('Unable to retrieve pending stories')
        }

        const data = await response.json()

        setPendingStories(data.stories || [])
      } catch (error) {
        console.error('Pending stories error:', error)
        setMessage('Unable to load pending submissions.')
      } finally {
        setStoriesLoading(false)
      }
    }

    loadPendingStories()
  }, [isAuthenticated])

  // Handle moderator password login
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

  async function handleModeration(storyId, action) {
  setModeratingStoryId(storyId)
  setMessage('')

  try {
    const response = await fetch('/api/admin-moderate-story', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        storyId,
        action,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      setMessage(data.error || 'Unable to moderate story.')
      return
    }

    setPendingStories((currentStories) =>
      currentStories.filter((story) => story.id !== storyId)
    )
  } catch (error) {
    console.error('Story moderation error:', error)
    setMessage('Unable to connect to the moderation service.')
  } finally {
    setModeratingStoryId(null)
  }
}

  // Session is still being checked
  if (isCheckingSession) {
    return (
      <main>
        <h1>Bus Stop Stories</h1>
        <h2>Moderator Dashboard</h2>

        <p>Checking moderator session...</p>
      </main>
    )
  }

  // Moderator is authenticated
  if (isAuthenticated) {
  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">Bus Stop Stories</p>
          <h1>Moderator Dashboard</h1>
          <p className="admin-subtitle">
            Review stories submitted by IndyGo riders.
          </p>
        </div>

        <div className="admin-count">
          <strong>{pendingStories.length}</strong>
          <span>
            {pendingStories.length === 1
              ? 'story awaiting review'
              : 'stories awaiting review'}
          </span>
        </div>
      </header>

      {storiesLoading ? (
        <div className="admin-empty-state">
          <p>Loading submissions...</p>
        </div>
      ) : pendingStories.length === 0 ? (
        <div className="admin-empty-state">
          <h2>You're all caught up!</h2>
          <p>No stories are currently awaiting review.</p>
        </div>
      ) : (
        <section
          className="moderation-list"
          aria-label="Pending story submissions"
        >
          {pendingStories.map((story) => (
            <article
              key={story.id}
              className="moderation-card"
            >
              <div className="moderation-card-header">
                <span className="status-badge">
                  Pending
                </span>

                <time dateTime={story.created_at}>
                  {new Date(story.created_at).toLocaleString(
                    undefined,
                    {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    }
                  )}
                </time>
              </div>

              <blockquote className="moderation-story">
                “{story.story_text}”
              </blockquote>

              <div className="moderation-details">
                <div>
                  <span className="detail-label">
                    Route
                  </span>

                  <span className="detail-value">
                    {story.route
                      ? `Route ${story.route}`
                      : 'Not provided'}
                  </span>
                </div>

                <div>
                  <span className="detail-label">
                    Submitted by
                  </span>

                  <span className="detail-value">
                    {story.is_anonymous
                      ? 'Anonymous'
                      : story.display_name || 'Not provided'}
                  </span>
                </div>
              </div>

              <div className="moderation-location">
                <span className="detail-label">
                  Location
                </span>

                <span className="detail-value">
                  {story.lat}, {story.lng}
                </span>
              </div>

              <div className="moderation-actions">
                <button
                  type="button"
                  className="deny-story-button"
                  onClick={() =>
                    handleModeration(story.id, 'deny')
                  }
                  disabled={
                    moderatingStoryId === story.id
                  }
                >
                  {moderatingStoryId === story.id
                    ? 'Processing...'
                    : 'Deny'}
                </button>

                <button
                  type="button"
                  className="approve-story-button"
                  onClick={() =>
                    handleModeration(story.id, 'approve')
                  }
                  disabled={
                    moderatingStoryId === story.id
                  }
                >
                  {moderatingStoryId === story.id
                    ? 'Processing...'
                    : 'Approve'}
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {message && (
        <p className="admin-message">
          {message}
        </p>
      )}
    </main>
  )
}

  // Moderator is not authenticated
  return (
  <main className="admin-page admin-login-page">
    <div className="admin-login-container">

      <div className="admin-login-brand">
        <p className="admin-eyebrow">Bus Stop Stories</p>
        <h1>Moderator Dashboard</h1>
        <p className="admin-login-subtitle">
          Sign in to review stories submitted by IndyGo riders.
        </p>
      </div>

      <section className="admin-login-card">
        <h2>Moderator Sign In</h2>

        <p className="admin-login-description">
          Enter the moderator password to continue.
        </p>

        <form
          className="admin-login-form"
          onSubmit={handleLogin}
        >
          <label htmlFor="moderator-password">
            Moderator password
          </label>

          <input
            id="moderator-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter password"
            autoComplete="current-password"
            required
          />

          <button
            className="admin-login-button"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {message && (
          <p className="admin-login-message">
            {message}
          </p>
        )}
      </section>

    </div>
  </main>
)
}