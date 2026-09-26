import crypto from 'crypto'

function createSessionToken(secret) {
  return crypto
    .createHmac('sha256', secret)
    .update('bus-stop-stories-admin')
    .digest('hex')
}

function getCookie(req, name) {
  const cookieHeader = req.headers.cookie || ''

  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, ...valueParts] = cookie.trim().split('=')

    if (key) {
      acc[key] = valueParts.join('=')
    }

    return acc
  }, {})

  return cookies[name]
}

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    })
  }

  const sessionSecret = process.env.ADMIN_SESSION_SECRET

  if (!sessionSecret) {
    console.error('Missing ADMIN_SESSION_SECRET')

    return res.status(500).json({
      error: 'Server configuration error',
    })
  }

  const sessionCookie = getCookie(req, 'admin_session')

  if (!sessionCookie) {
    return res.status(200).json({
      authenticated: false,
    })
  }

  const expectedToken = createSessionToken(sessionSecret)

  const sessionBuffer = Buffer.from(sessionCookie)
  const expectedBuffer = Buffer.from(expectedToken)

  const isValid =
    sessionBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(sessionBuffer, expectedBuffer)

  return res.status(200).json({
    authenticated: isValid,
  })
}