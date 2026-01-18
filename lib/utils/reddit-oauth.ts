/**
 * Reddit OAuth2 Client Credentials Flow
 * Gets an access token for authenticated Reddit API access
 * More reliable than public JSON endpoints - higher rate limits
 */

let cachedToken: string | null = null
let tokenExpiresAt: number = 0

/**
 * Get Reddit OAuth access token (with caching)
 * Token is valid for ~1 hour
 */
export async function getRedditToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken !== null && Date.now() < tokenExpiresAt - 60000) {
    // At this point, cachedToken is guaranteed to be string (not null)
    return cachedToken
  }

  const clientId = process.env.REDDIT_CLIENT_ID
  const clientSecret = process.env.REDDIT_CLIENT_SECRET
  // User-Agent must include your Reddit username - update this or set REDDIT_USER_AGENT env var
  const userAgent = process.env.REDDIT_USER_AGENT || 'ProfAI/1.0 (by /u/yourusername)'

  if (!clientId || !clientSecret) {
    throw new Error('REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET must be set in environment variables')
  }

  // Base64 encode client_id:client_secret for Basic auth
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  try {
    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': userAgent,
      },
      body: 'grant_type=client_credentials',
      cache: 'no-store',
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Reddit OAuth failed: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    
    if (!data.access_token || typeof data.access_token !== 'string') {
      throw new Error('Reddit OAuth response missing access_token')
    }

    // Cache token (expires_in is in seconds, convert to milliseconds)
    const token: string = data.access_token
    cachedToken = token
    tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000 // Subtract 60s buffer

    console.log('[Reddit OAuth] Token obtained successfully')
    return token
  } catch (error: any) {
    console.error('[Reddit OAuth] Failed to get token:', error.message || error)
    throw error
  }
}

/**
 * Clear cached token (useful for testing or forced refresh)
 */
export function clearRedditToken(): void {
  cachedToken = null
  tokenExpiresAt = 0
}
