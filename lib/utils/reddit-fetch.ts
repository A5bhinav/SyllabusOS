/**
 * Optimized Reddit fetch utility for Vercel serverless functions
 * Handles retries, timeouts, and proper error handling
 */

const DEFAULT_TIMEOUT = 8000 // 8 seconds - fast enough for Vercel, slow enough to avoid rate limits
const MAX_RETRIES = 2
const RETRY_DELAY = 1000 // 1 second

interface FetchOptions {
  timeout?: number
  retries?: number
  headers?: Record<string, string>
  signal?: AbortSignal
}

/**
 * Fetch with timeout and retry logic - optimized for Vercel
 */
export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { timeout = DEFAULT_TIMEOUT, retries = MAX_RETRIES, headers = {}, signal } = options

  // Ensure proper User-Agent for Reddit (required by Reddit API)
  const defaultUserAgent = process.env.REDDIT_USER_AGENT || 
    'ProfAI/1.0 (by /u/yourusername)'

  const fetchHeaders = {
    'User-Agent': defaultUserAgent,
    'Accept': 'application/json',
    ...headers,
  }

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create new AbortController for each attempt
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      // Use provided signal if given, otherwise use timeout signal
      const fetchSignal = signal || controller.signal

      const response = await fetch(url, {
        headers: fetchHeaders,
        cache: 'no-store', // Critical for Vercel - no caching
        signal: fetchSignal,
      })

      clearTimeout(timeoutId)

      // Return immediately if successful
      if (response.ok) {
        return response
      }

      // For non-OK responses, throw an error that might trigger retry
      // Don't retry on 4xx errors (client errors) except 429 (rate limit)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        throw new Error(`Reddit API error: ${response.status} ${response.statusText}`)
      }

      // Retry on 5xx errors and 429 (rate limit)
      if (attempt < retries) {
        const delay = RETRY_DELAY * Math.pow(2, attempt) // Exponential backoff
        console.log(`[Reddit Fetch] Retrying after ${delay}ms (attempt ${attempt + 1}/${retries})`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }

      throw new Error(`Reddit API error: ${response.status} ${response.statusText}`)
    } catch (error: any) {
      lastError = error

      // Don't retry on AbortError (timeout)
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`)
      }

      // Don't retry on network errors if it's the last attempt
      if (attempt === retries) {
        throw error
      }

      // Wait before retrying
      const delay = RETRY_DELAY * Math.pow(2, attempt)
      console.log(`[Reddit Fetch] Error (attempt ${attempt + 1}/${retries}): ${error.message}. Retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError || new Error('Failed to fetch after retries')
}

/**
 * Get Reddit JSON API URL with proper encoding
 */
export function buildRedditSearchUrl(
  subreddit: string,
  query: string,
  options: {
    limit?: number
    sort?: 'relevance' | 'hot' | 'top' | 'new'
    t?: 'all' | 'year' | 'month' | 'week' | 'day' | 'hour'
    restrict_sr?: boolean
  } = {}
): string {
  const baseUrl = `https://www.reddit.com/r/${subreddit}/search.json`
  const params = new URLSearchParams({
    q: query,
    restrict_sr: (options.restrict_sr ?? true) ? '1' : '0',
    limit: String(options.limit || 10),
    sort: options.sort || 'relevance',
    t: options.t || 'all',
  })

  return `${baseUrl}?${params.toString()}`
}

/**
 * Get recent posts from subreddit (fallback method)
 */
export function buildRedditRecentUrl(subreddit: string, limit: number = 25): string {
  return `https://www.reddit.com/r/${subreddit}/new.json?limit=${limit}`
}
