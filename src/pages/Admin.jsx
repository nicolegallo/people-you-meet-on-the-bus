import { useEffect, useState } from 'react'

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
      <main>
        <h1>Bus Stop Stories</h1>
        <h2>Moderator Dashboard</h2>

        <p>
          {pendingStories.length}{' '}
          {pendingStories.length === 1
            ? 'story awaiting review'
            : 'stories awaiting review'}
        </p>

        {storiesLoading ? (
          <p>Loading submissions...</p>
        ) : pendingStories.length === 0 ? (
          <p>No stories are currently awaiting review.</p>
        ) : (
          <div>
            {pendingStories.map((story) => (
              <article key={story.id}>
                <h3>
                  {story.route
                    ? `Route ${story.route}`
                    : 'Route not provided'}
                </h3>

                <p>{story.story_text}</p>

                <p>
                  Submitted by:{' '}
                  {story.is_anonymous
                    ? 'Anonymous'
                    : story.display_name || 'Not provided'}
                </p>

                <p>
                  Submitted:{' '}
                  {new Date(story.created_at).toLocaleString()}
                </p>

                <p>
                  Location: {story.lat}, {story.lng}
                </p>
                <div>
  <button
    type="button"
    onClick={() => handleModeration(story.id, 'deny')}
    disabled={moderatingStoryId === story.id}
  >
    {moderatingStoryId === story.id ? 'Processing...' : 'Deny'}
  </button>

  <button
    type="button"
    onClick={() => handleModeration(story.id, 'approve')}
    disabled={moderatingStoryId === story.id}
  >
    {moderatingStoryId === story.id ? 'Processing...' : 'Approve'}
  </button>
</div>
              </article>
            ))}
          </div>
        )}

        {message && <p>{message}</p>}
      </main>
    )
  }

  // Moderator is not authenticated
  return (
    <main>
      <h1>Bus Stop Stories</h1>
      <h2>Moderator Dashboard</h2>

      <p>Enter the moderator password to continue.</p>

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