import crypto from 'crypto'

function createSessionToken(secret) {
  return crypto
    .createHmac('sha256', secret)
    .update('bus-stop-stories-admin')
    .digest('hex')
}

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
    })
  }

  const adminPassword = process.env.ADMIN_PASSWORD
  const sessionSecret = process.env.ADMIN_SESSION_SECRET

  if (!adminPassword || !sessionSecret) {
    console.error('Missing admin environment variables')

    return res.status(500).json({
      error: 'Server configuration error',
    })
  }

  const { password } = req.body || {}

  if (!password) {
    return res.status(400).json({
      error: 'Password is required',
    })
  }

  if (password !== adminPassword) {
    return res.status(401).json({
      error: 'Invalid password',
    })
  }

  const sessionToken = createSessionToken(sessionSecret)

  res.setHeader(
    'Set-Cookie',
    [
      `admin_session=${sessionToken}`,
      'HttpOnly',
      'Secure',
      'SameSite=Strict',
      'Path=/',
      'Max-Age=28800',
    ].join('; ')
  )

  return res.status(200).json({
    authenticated: true,
  })
}