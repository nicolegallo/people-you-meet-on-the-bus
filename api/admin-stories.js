import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

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

function hasValidAdminSession(req) {
  const sessionSecret = process.env.ADMIN_SESSION_SECRET

  if (!sessionSecret) {
    return false
  }

  const sessionCookie = getCookie(req, 'admin_session')

  if (!sessionCookie) {
    return false
  }

  const expectedToken = createSessionToken(sessionSecret)

  const sessionBuffer = Buffer.from(sessionCookie)
  const expectedBuffer = Buffer.from(expectedToken)

  return (
    sessionBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(sessionBuffer, expectedBuffer)
  )
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    })
  }

  if (!hasValidAdminSession(req)) {
    return res.status(401).json({
      error: 'Unauthorized',
    })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase server environment variables')

    return res.status(500).json({
      error: 'Server configuration error',
    })
  }

  const supabaseAdmin = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )

  const { data, error } = await supabaseAdmin
    .from('stories')
    .select(
      'id, created_at, story_text, display_name, is_anonymous, route, lat, lng, status'
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Pending stories error:', error)

    return res.status(500).json({
      error: 'Unable to retrieve pending stories',
    })
  }

  return res.status(200).json({
    stories: data,
  })
}