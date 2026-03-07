type NetlifyHandlerEvent = {
  httpMethod?: string
  body: string | null
}

type NetlifyHandlerResponse = {
  statusCode: number
  body: string
  headers?: Record<string, string>
}

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const DEFAULT_REDIRECT_URI = 'https://photobookmaker.netlify.app/edit'

const getEnv = () => {
  const maybeProcess = globalThis as unknown as {
    process?: { env?: Record<string, string | undefined> }
  }
  return maybeProcess.process?.env ?? {}
}

const jsonResponse = (
  statusCode: number,
  payload: Record<string, unknown>,
): NetlifyHandlerResponse => ({
  statusCode,
  headers: JSON_HEADERS,
  body: JSON.stringify(payload),
})

export const handler = async (
  event: NetlifyHandlerEvent,
): Promise<NetlifyHandlerResponse> => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method Not Allowed' })
  }

  try {
    const parsedBody = JSON.parse(event.body ?? '{}') as { code?: string }
    const code = parsedBody.code?.trim()
    if (!code) {
      return jsonResponse(400, { error: 'Missing authorization code' })
    }

    const env = getEnv()
    const clientId = env.GOOGLE_CLIENT_ID
    const clientSecret = env.GOOGLE_CLIENT_SECRET
    const redirectUri = env.GOOGLE_REDIRECT_URI ?? DEFAULT_REDIRECT_URI

    if (!clientId || !clientSecret) {
      return jsonResponse(500, {
        error:
          'Missing Google OAuth environment variables (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)',
      })
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    })

    const data = (await response.json()) as Record<string, unknown>
    if (!response.ok) {
      return jsonResponse(response.status, data)
    }

    return jsonResponse(200, data)
  } catch {
    return jsonResponse(500, { error: 'Failed to exchange token' })
  }
}
