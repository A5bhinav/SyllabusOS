import { NextRequest, NextResponse } from 'next/server'
import { createErrorResponse } from '@/lib/utils/api-errors'
import { getRedditToken } from '@/lib/utils/reddit-oauth'

// Vercel configuration
export const runtime = 'nodejs'
export const maxDuration = 30 // 30 seconds for Reddit API calls

// Define CourseFeedback type for this route
export interface CourseFeedback {
  courseCode: string
  courseName: string
  difficulty: 'Easy' | 'Moderate' | 'Hard' | 'Very Hard'
  averageGrade: string
  professorRating?: number
  positiveFeedback: string[]
  negativeFeedback: string[]
  gradeDistribution: { A: number; B: number; C: number; D: number; F: number }
  redditPosts: Array<{
    title: string
    url: string
    score: number
    excerpt: string
    date: string
  }>
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseCode: string }> | { courseCode: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    // Next.js automatically decodes URL params, but handle encoding manually too
    let rawCourseCode = resolvedParams.courseCode || ''
    
    // Try to decode if it's still encoded
    try {
      if (rawCourseCode.includes('%')) {
        rawCourseCode = decodeURIComponent(rawCourseCode)
      }
    } catch {
      // Already decoded, continue
    }
    
    // Normalize course code (e.g., "CSE101" -> "CSE 101")
    const courseCode = normalizeCourseCode(rawCourseCode)
    if (!courseCode) {
      console.error(`[Feedback API] Failed to normalize course code: "${rawCourseCode}"`)
      return NextResponse.json(
        { error: `Course code "${rawCourseCode}" not recognized. Available: CSE 101, CSE 13S, CSE 102, CSE 115A, CSE 130, CSE 12, MATH 19A, MATH 19B, AMS 10, PHYS 5A` },
        { status: 404 }
      )
    }

    // Map course codes to full names
    const courseNames: Record<string, string> = {
      'CSE 101': 'CSE 101 - Introduction to Data Structures and Algorithms',
      'CSE 13S': 'CSE 13S - Computer Systems and C Programming',
      'CSE 102': 'CSE 102 - Analysis of Algorithms',
      'CSE 115A': 'CSE 115A - Software Engineering',
      'CSE 130': 'CSE 130 - Programming Languages',
      'CSE 12': 'CSE 12 - Computer Systems and Assembly Language',
      'MATH 19A': 'MATH 19A - Calculus for Science, Engineering, and Mathematics',
      'MATH 19B': 'MATH 19B - Calculus for Science, Engineering, and Mathematics',
      'AMS 10': 'AMS 10 - Mathematical Methods for Engineers I',
      'PHYS 5A': 'PHYS 5A - Introductory Physics I',
    }

    const fullCourseName = courseNames[courseCode] || courseCode

    // Use the existing scraping logic by calling the same function
    const feedback = await scrapeRedditForCourse(courseCode, fullCourseName)
    
    // Log what we're returning (for debugging on Vercel)
    console.log(`[Feedback API] Returning feedback for ${courseCode}:`, {
      hasPositiveFeedback: feedback.positiveFeedback?.length || 0,
      hasNegativeFeedback: feedback.negativeFeedback?.length || 0,
      hasRedditPosts: feedback.redditPosts?.length || 0,
      redditPostsDetails: feedback.redditPosts?.map(p => ({ title: p.title, url: p.url })) || []
    })
    
    return NextResponse.json(feedback)
  } catch (error: any) {
    console.error('[Feedback API] Error fetching course feedback:', error.message || error)
    return createErrorResponse(error, 'Failed to fetch course feedback')
  }
}

function normalizeCourseCode(code: string): string | null {
  if (!code) return null
  
  // Decode URL encoding and trim
  let decoded: string
  try {
    decoded = decodeURIComponent(code).trim()
  } catch {
    decoded = code.trim()
  }
  
  // Known course codes
  const courseCodes = [
    'CSE 101', 'CSE 13S', 'CSE 102', 'CSE 115A', 'CSE 130', 'CSE 12',
    'MATH 19A', 'MATH 19B', 'AMS 10', 'PHYS 5A'
  ]
  
  // Try exact match first
  if (courseCodes.includes(decoded)) {
    return decoded
  }
  
  // Normalize: remove all spaces, then add space after department
  const noSpace = decoded.replace(/\s+/g, '')
  const match = noSpace.match(/^([A-Z]+)(\d+)([A-Z]*)$/i)
  if (match) {
    const [, dept, num, suffix] = match
    const normalized = `${dept.toUpperCase()} ${num}${suffix.toUpperCase()}`.trim()
    if (courseCodes.includes(normalized)) {
      return normalized
    }
  }
  
  // Try with existing spaces: "CSE 101" format
  const matchWithSpace = decoded.match(/^([A-Z]+)\s+(\d+)([A-Z]*)$/i)
  if (matchWithSpace) {
    const [, dept, num, suffix] = matchWithSpace
    const normalized = `${dept.toUpperCase()} ${num}${suffix.toUpperCase()}`.trim()
    if (courseCodes.includes(normalized)) {
      return normalized
    }
  }
  
  // Try case-insensitive match
  for (const knownCode of courseCodes) {
    const knownNoSpace = knownCode.replace(/\s+/g, '')
    if (knownNoSpace.toLowerCase() === noSpace.toLowerCase()) {
      return knownCode
    }
  }
  
  return null
}

/**
 * Scrape Reddit using OAuth2 API (more reliable)
 */
async function scrapeRedditWithOAuth(
  courseCode: string,
  subreddit: string,
  userAgent: string
): Promise<any[]> {
  const token = await getRedditToken()
  const searchTerms = [courseCode, courseCode.replace(/\s+/g, '')]
  let allPosts: any[] = []

  for (const term of searchTerms) {
    try {
      const url = `https://oauth.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(term)}&restrict_sr=1&limit=10&sort=relevance&t=all`
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': userAgent,
        },
        cache: 'no-store',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        if (data?.data?.children) {
          const posts = data.data.children.filter((child: any) => {
            const postData = child.data
            return postData && !postData.removed_by_category && postData.title
          })
          if (posts.length > 0) {
            allPosts = [...allPosts, ...posts]
            console.log(`[Reddit OAuth] Found ${posts.length} posts for "${term}"`)
          }
        }
      }
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error(`[Reddit OAuth] Error searching "${term}":`, err.message)
      }
    }
  }

  return allPosts
}

/**
 * Scrape Reddit using public JSON API (fallback)
 */
async function scrapeRedditPublicJSON(
  courseCode: string,
  subreddit: string,
  userAgent: string
): Promise<any[]> {
  const baseUrl = 'https://www.reddit.com'
  const searchTerms = [
    courseCode,
    courseCode.replace(/\s+/g, ''),
    courseCode.replace(/\s+/g, ' '),
    courseCode.match(/^([A-Z]+)/)?.[1] + ' ' + courseCode.match(/(\d+)/)?.[1],
  ].filter(Boolean) as string[]
  
  let allPosts: any[] = []

  // Try search endpoint
  console.log(`[Reddit Public JSON] Searching for course "${courseCode}" with terms:`, searchTerms)
  
  for (const term of searchTerms) {
      try {
        // Reddit JSON API: append .json to any Reddit URL - no auth required!
        const searchUrl = `${baseUrl}/r/${subreddit}/search.json`
        const params = new URLSearchParams({
          q: term,
          restrict_sr: '1',
          limit: '10',
          sort: 'relevance',
          t: 'all'
        })
        const fullUrl = `${searchUrl}?${params.toString()}`
        
        // Create AbortController for timeout on Vercel
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
        
        const response = await fetch(fullUrl, {
          headers: { 
            'User-Agent': userAgent,
            'Accept': 'application/json'
          },
          cache: 'no-store', // Don't cache on Vercel
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (response.ok) {
          const data = await response.json()
          
          // Reddit JSON structure: data.data.children contains posts
          if (data && data.data && data.data.children) {
            const posts = data.data.children.filter((child: any) => {
              // Filter out deleted/removed posts
              const postData = child.data || child
              return postData && !postData.removed_by_category && postData.title
            })
            
            if (posts && posts.length > 0) {
              allPosts = [...allPosts, ...posts]
              console.log(`[Reddit JSON API] Found ${posts.length} valid posts for "${term}"`)
            } else {
              console.log(`[Reddit JSON API] No valid posts found for "${term}" (may have been removed/deleted)`)
            }
          } else {
            console.warn(`[Reddit] Invalid response structure for "${term}" - data.data.children not found`)
          }
        } else {
          const statusText = response.statusText
          console.warn(`[Reddit] Search response not OK for "${term}": ${response.status} ${statusText}`)
          // Log response body for debugging (first 200 chars)
          try {
            const text = await response.text()
            console.warn(`[Reddit] Response body preview:`, text.substring(0, 200))
          } catch {
            // Ignore error reading response
          }
        }
        
        // Small delay between requests to avoid rate limiting (like Python script)
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.error(`[Reddit] Request timeout for "${term}" (10s timeout)`)
        } else {
          console.error(`[Reddit] Error searching "${term}":`, err.message || err)
        }
        // Continue to next search term even if one fails
      }
    }
    
    // Method 2: Fallback - Get recent posts from subreddit and filter client-side
    // This matches the Python script's approach when search fails
    if (allPosts.length === 0) {
      try {
        console.log(`[Reddit] Search returned no results, trying recent posts fallback`)
        // Reddit JSON API: /r/UCSC/new.json - no auth needed!
        const recentUrl = `${baseUrl}/r/${subreddit}/new.json?limit=25`
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)
        
        const response = await fetch(recentUrl, {
          headers: { 
            'User-Agent': userAgent,
            'Accept': 'application/json'
          },
          cache: 'no-store',
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (response.ok) {
          const data = await response.json()
          
          if (data && data.data && data.data.children) {
            const posts = data.data.children
            // Filter posts that mention the course code (client-side filtering)
            const courseCodeLower = courseCode.toLowerCase()
            const filtered = posts.filter((p: any) => {
              const postData = p.data || {}
              const title = (postData.title || '').toLowerCase()
              const text = (postData.selftext || '').toLowerCase()
              return title.includes(courseCodeLower) || text.includes(courseCodeLower)
            })
            
            if (filtered.length > 0) {
              allPosts = filtered
              console.log(`[Reddit JSON API] Found ${filtered.length} posts via fallback method`)
            }
          }
        } else {
          console.warn(`[Reddit] Fallback response not OK: ${response.status} ${response.statusText}`)
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.error(`[Reddit] Fallback request timeout (10s)`)
        } else {
          console.error(`[Reddit] Fallback method failed:`, err.message || err)
        }
      }
    }

  return allPosts
}

/**
 * Reddit Scraper - tries OAuth first, falls back to public JSON API
 */
async function scrapeRedditForCourse(
  courseCode: string,
  fullCourseName: string
): Promise<CourseFeedback> {
  const subreddit = 'UCSC'
  let allPosts: any[] = []
  
  const userAgent = process.env.REDDIT_USER_AGENT || 'SyllabusOS/1.0 (Node.js; +https://syllabusos.vercel.app)'
  const hasOAuth = !!(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET)
  
  try {
    // Try OAuth2 API first (more reliable, higher rate limits)
    if (hasOAuth) {
      try {
        console.log('[Reddit] Attempting OAuth2 authenticated API')
        allPosts = await scrapeRedditWithOAuth(courseCode, subreddit, userAgent)
        if (allPosts.length > 0) {
          console.log(`[Reddit OAuth] Found ${allPosts.length} posts`)
        }
      } catch (oauthError: any) {
        console.warn('[Reddit OAuth] Failed, falling back to public JSON API:', oauthError.message)
        // Fall through to public JSON API
      }
    }
    
    // Fallback to public JSON API if OAuth failed or not configured
    if (allPosts.length === 0) {
      console.log('[Reddit] Using public JSON API (no auth)')
      allPosts = await scrapeRedditPublicJSON(courseCode, subreddit, userAgent)
    }

    // Remove duplicates (like Python script's unique post handling)
    const uniquePosts = Array.from(
      new Map(allPosts.map((p: any) => {
        const permalink = p.data?.permalink || ''
        const postId = p.data?.id || ''
        return [permalink || postId, p]
      })).values()
    ).filter((p: any) => p && p.data)

    console.log(`[Reddit JSON API] Total unique posts found: ${uniquePosts.length}`)

    if (uniquePosts.length === 0) {
      console.warn(`[Reddit] No posts found for ${courseCode}`)
      console.log(`[Reddit] Environment: ${process.env.VERCEL ? 'Vercel' : 'Local'}`)
      console.log(`[Reddit] Using JSON API (no authentication required) - check User-Agent if blocked`)
    }

    // Always process posts, even if empty - processRedditPosts handles empty arrays
    return processRedditPosts(uniquePosts, courseCode, fullCourseName)
  } catch (error: any) {
    console.error('[Reddit] Critical error scraping:', error.message || error)
    // Even on error, try to return something useful with at least basic stats
    const defaultFeedback = getDefaultFeedback(courseCode, fullCourseName)
    console.warn('[Reddit] Returning default feedback due to error')
    return defaultFeedback
  }
}

function processRedditPosts(
  posts: any[],
  courseCode: string,
  fullCourseName: string
): CourseFeedback {
  const positiveFeedback: string[] = []
  const negativeFeedback: string[] = []
  
  const positiveKeywords = ['good', 'great', 'helpful', 'easy', 'clear', 'recommend', 'enjoy', 'useful']
  const negativeKeywords = ['hard', 'difficult', 'confusing', 'struggle', 'problem', 'bad', 'avoid']

  posts.forEach((post: any) => {
    const text = `${post.data.title || ''} ${post.data.selftext || ''}`.toLowerCase()
    const fullText = post.data.selftext || post.data.title || ''
    
    if (positiveKeywords.some(k => text.includes(k)) && fullText) {
      const excerpt = fullText.substring(0, 200).trim()
      if (excerpt && !positiveFeedback.includes(excerpt)) {
        positiveFeedback.push(excerpt)
      }
    }
    
    if (negativeKeywords.some(k => text.includes(k)) && fullText) {
      const excerpt = fullText.substring(0, 200).trim()
      if (excerpt && !negativeFeedback.includes(excerpt)) {
        negativeFeedback.push(excerpt)
      }
    }
  })

  // Extract difficulty
  const allText = posts.map(p => `${p.data?.title || ''} ${p.data?.selftext || ''}`).join(' ').toLowerCase()
  let difficulty: 'Easy' | 'Moderate' | 'Hard' | 'Very Hard' = 'Moderate'
  if (allText.includes('very hard') || allText.includes('extremely difficult')) {
    difficulty = 'Very Hard'
  } else if (allText.includes('hard') || allText.includes('difficult')) {
    difficulty = 'Hard'
  } else if (allText.includes('easy') && !allText.includes('not easy')) {
    difficulty = 'Easy'
  }

  // Format Reddit posts - ensure permalink starts with /r/
  const redditPosts = posts.slice(0, 5).map((post: any) => {
    const postData = post.data || post
    const permalink = postData.permalink || ''
    const url = permalink.startsWith('http') 
      ? permalink 
      : `https://www.reddit.com${permalink.startsWith('/') ? permalink : '/' + permalink}`
    
    return {
      title: postData.title || '',
      url: url,
      score: postData.score || 0,
      excerpt: (postData.selftext || postData.title || '').substring(0, 200),
      date: new Date((postData.created_utc || 0) * 1000).toLocaleDateString()
    }
  }).filter(p => p.title && p.url && p.url.includes('reddit.com'))

  // Default grade distributions
  const gradeDistributions: Record<string, { A: number, B: number, C: number, D: number, F: number }> = {
    'CSE 101': { A: 25, B: 35, C: 25, D: 10, F: 5 },
    'CSE 13S': { A: 20, B: 30, C: 30, D: 15, F: 5 },
    'CSE 102': { A: 15, B: 30, C: 35, D: 15, F: 5 },
    'CSE 115A': { A: 30, B: 40, C: 20, D: 7, F: 3 },
    'CSE 130': { A: 20, B: 35, C: 30, D: 10, F: 5 },
    'MATH 19A': { A: 15, B: 25, C: 35, D: 20, F: 5 },
    'MATH 19B': { A: 12, B: 28, C: 35, D: 20, F: 5 },
    'CSE 12': { A: 22, B: 33, C: 28, D: 12, F: 5 },
    'AMS 10': { A: 18, B: 32, C: 32, D: 13, F: 5 },
    'PHYS 5A': { A: 20, B: 30, C: 30, D: 15, F: 5 },
  }

  const averageGrades: Record<string, string> = {
    'Easy': 'A- to B+',
    'Moderate': 'B to B+',
    'Hard': 'B- to C+',
    'Very Hard': 'C to C+'
  }

  // Calculate professor rating from feedback sentiment
  const ratingMap: Record<string, number> = {
    'Easy': 4.5,
    'Moderate': 4.0,
    'Hard': 3.5,
    'Very Hard': 3.0
  }
  
  return {
    courseCode,
    courseName: fullCourseName,
    difficulty,
    averageGrade: averageGrades[difficulty] || 'B to B+',
    professorRating: ratingMap[difficulty] || 4.0,
    positiveFeedback: positiveFeedback.slice(0, 5),
    negativeFeedback: negativeFeedback.slice(0, 5),
    gradeDistribution: gradeDistributions[courseCode] || { A: 20, B: 30, C: 30, D: 15, F: 5 },
    redditPosts,
  }
}

function getDefaultFeedback(
  courseCode: string,
  fullCourseName: string
): CourseFeedback {
  const gradeDistributions: Record<string, { A: number, B: number, C: number, D: number, F: number }> = {
    'CSE 101': { A: 25, B: 35, C: 25, D: 10, F: 5 },
    'CSE 13S': { A: 20, B: 30, C: 30, D: 15, F: 5 },
    'CSE 102': { A: 15, B: 30, C: 35, D: 15, F: 5 },
    'CSE 115A': { A: 30, B: 40, C: 20, D: 7, F: 3 },
    'CSE 130': { A: 20, B: 35, C: 30, D: 10, F: 5 },
    'MATH 19A': { A: 15, B: 25, C: 35, D: 20, F: 5 },
    'MATH 19B': { A: 12, B: 28, C: 35, D: 20, F: 5 },
    'CSE 12': { A: 22, B: 33, C: 28, D: 12, F: 5 },
    'AMS 10': { A: 18, B: 32, C: 32, D: 13, F: 5 },
    'PHYS 5A': { A: 20, B: 30, C: 30, D: 15, F: 5 },
  }

  return {
    courseCode,
    courseName: fullCourseName,
    difficulty: 'Moderate',
    averageGrade: 'B to B+',
    professorRating: 4.0,
    positiveFeedback: [],
    negativeFeedback: [],
    gradeDistribution: gradeDistributions[courseCode] || { A: 20, B: 30, C: 30, D: 15, F: 5 },
    redditPosts: [],
  }
}
