/**
 * Reddit HTML Scraper - No API needed!
 * Scrapes Reddit HTML directly using Cheerio (works perfectly on Vercel)
 */

import * as cheerio from 'cheerio'

export interface RedditPost {
  title: string
  url: string
  score: number
  excerpt: string
  date: string
  selftext: string
  permalink: string
}

/**
 * Scrape Reddit HTML search page for a given query
 */
export async function scrapeRedditHTML(
  subreddit: string,
  query: string,
  options: {
    limit?: number
    sort?: 'relevance' | 'hot' | 'top' | 'new'
  } = {}
): Promise<RedditPost[]> {
  const limit = options.limit || 10
  const sort = options.sort || 'relevance'

  // Use old.reddit.com - it has server-rendered HTML that we can actually scrape!
  // Modern Reddit (www.reddit.com) is JavaScript-heavy and doesn't work with static HTML scraping
  const searchUrl = `https://old.reddit.com/r/${subreddit}/search?q=${encodeURIComponent(query)}&restrict_sr=1&sort=${sort}&t=all`

  try {
    // Fetch HTML with proper headers to mimic a real browser
    // IMPORTANT: On Vercel/serverless, avoid Connection: keep-alive and Accept-Encoding
    // Node.js fetch automatically handles encoding, and serverless doesn't keep connections
    const isVercel = !!process.env.VERCEL
    
    // Set up timeout for Vercel (they have strict timeouts)
    let signal: AbortSignal | undefined = undefined
    if (isVercel) {
      const controller = new AbortController()
      setTimeout(() => controller.abort(), 25000) // 25 seconds
      signal = controller.signal
    }
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        // Don't set Accept-Encoding on Vercel - Node.js fetch handles it automatically
        // Some servers reject compression requests from serverless functions
        ...(isVercel ? {} : { 'Accept-Encoding': 'gzip, deflate, br' }),
        'DNT': '1',
        // Don't use keep-alive on serverless (Vercel)
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
        // Add Referer to look more like a real browser
        'Referer': `https://old.reddit.com/r/${subreddit}/`,
      },
      cache: 'no-store',
      ...(signal ? { signal } : {}),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unable to read error response')
      console.error(`[Reddit HTML] HTTP ${response.status}: ${response.statusText}`)
      console.error(`[Reddit HTML] Error response preview: ${errorText.substring(0, 500)}`)
      console.error(`[Reddit HTML] Environment: ${isVercel ? 'Vercel' : 'Local'}`)
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()
    
    // Debug: Log HTML length to see if we got content
    console.log(`[Reddit HTML] Fetched HTML length: ${html.length} characters`)
    console.log(`[Reddit HTML] URL: ${searchUrl}`)
    console.log(`[Reddit HTML] Environment: ${isVercel ? 'Vercel' : 'Local'}`)
    console.log(`[Reddit HTML] Response status: ${response.status}`)
    
    // Check if Reddit blocked us
    if (html.includes('Blocked') || html.includes('please register') || html.toLowerCase().includes('access denied')) {
      console.error(`[Reddit HTML] Reddit blocked the request. HTML preview: ${html.substring(0, 500)}`)
      throw new Error('Reddit blocked the request. This may be due to rate limiting or bot detection.')
    }
    
    const $ = cheerio.load(html)

    const posts: RedditPost[] = []

    // Old Reddit search results use div.search-result, not div.thing!
    // Regular listings use div.thing, but search pages use different structure
    const postSelectors = [
      'div.search-result',           // Old Reddit search results structure (PRIMARY)
      'div.search-result-link',      // Old Reddit search result links
      'div.thing[data-subreddit]',   // Old Reddit regular listing structure
      'div.thing',                   // Fallback for old Reddit regular listings
      'shreddit-post',               // Try modern Reddit if somehow loaded
      'article[data-testid="post-container"]',
      'div.Post',
    ]

    let $posts: ReturnType<typeof $> | null = null
    let usedSelector = ''
    for (const selector of postSelectors) {
      $posts = $(selector)
      if ($posts.length > 0) {
        usedSelector = selector
        console.log(`[Reddit HTML] Found ${$posts.length} posts using selector: ${selector}`)
        break
      }
    }

    if (!$posts || $posts.length === 0) {
      // Debug: Check what HTML structure we actually got
      console.warn(`[Reddit HTML] No posts found with any selector. Checking HTML structure...`)
      const bodyText = $('body').text().substring(0, 500)
      console.log(`[Reddit HTML] Body preview: ${bodyText}`)
      console.log(`[Reddit HTML] Trying fallback method...`)
      return await scrapeRedditHTMLFallback(subreddit, query, limit)
    }

    // Extract post data
    $posts.slice(0, limit).each((index, element) => {
      try {
        const $post = $(element)
        
        // Check if this is old Reddit structure (div.thing or div.search-result)
        const isOldReddit = $post.hasClass('thing') || $post.hasClass('search-result') || $post.attr('class')?.includes('thing') || $post.attr('class')?.includes('search-result')
        
        // Extract title - Old Reddit search uses a.search-title, regular listings use a.title
        const titleSelectors = isOldReddit ? [
          'a.search-title',             // Old Reddit search results primary
          'a.title',                    // Old Reddit regular listings
          'a.title.may-blank',          // Old Reddit with class
          'p.title a',                  // Old Reddit alternative
        ] : [
          'h3[slot="title"]',
          'a[data-testid="post-title"]',
          'h3 a',
          'a[slot="title"]',
          'h3',
        ]
        
        let title = ''
        for (const selector of titleSelectors) {
          const titleEl = $post.find(selector).first()
          if (titleEl.length > 0) {
            title = titleEl.text().trim()
            if (title) break
          }
        }

        // Extract URL/permalink - Old Reddit search uses a.search-title, regular uses a.title
        let url = ''
        const linkSelectors = isOldReddit ? [
          'a.search-title',             // Old Reddit search results primary
          'a.title',                    // Old Reddit regular listings
          'a.title.may-blank',          // Old Reddit with class
          'p.title a',                  // Old Reddit alternative
        ] : [
          'a[data-testid="post-title"]',
          'h3 a',
          'a[slot="title"]',
          'a[href*="/r/"]',
        ]
        
        for (const selector of linkSelectors) {
          const linkEl = $post.find(selector).first()
          if (linkEl.length > 0) {
            let href = linkEl.attr('href') || ''
            
            // Old Reddit sometimes uses relative URLs that need conversion
            if (href.startsWith('/r/') || href.startsWith('/comments/')) {
              url = `https://www.reddit.com${href}`
            } else if (href.startsWith('http')) {
              url = href
            } else if (href.startsWith('/')) {
              url = `https://www.reddit.com${href}`
            } else {
              url = `https://www.reddit.com/r/${subreddit}/${href}`
            }
            if (url) break
          }
        }

        // Extract score - Old Reddit search uses .search-score, regular uses .score.unvoted
        const scoreSelectors = isOldReddit ? [
          '.search-score',              // Old Reddit search results primary
          '.score.unvoted',             // Old Reddit regular listings
          '.score',                     // Old Reddit fallback
          '.score.likes',               // Old Reddit with likes
        ] : [
          '[data-testid="vote-arrows"]',
          'faceplate-number',
          '.score',
          '[slot="score"]',
        ]
        let score = 0
        for (const selector of scoreSelectors) {
          const scoreEl = $post.find(selector).first()
          if (scoreEl.length > 0) {
            const scoreText = scoreEl.text().trim()
            // Handle "1.2k", "5k", etc.
            const scoreMatch = scoreText.match(/([\d.]+)([kmKM])?/)
            if (scoreMatch) {
              const num = parseFloat(scoreMatch[1])
              const suffix = scoreMatch[2]?.toLowerCase()
              score = suffix === 'k' ? Math.round(num * 1000) : suffix === 'm' ? Math.round(num * 1000000) : Math.round(num)
            } else {
              score = parseInt(scoreText, 10) || 0
            }
            if (score > 0) break
          }
        }

        // Extract selftext/excerpt - Old Reddit search uses .search-result-body .md, regular uses .usertext-body
        const textSelectors = isOldReddit ? [
          '.search-result-body .md',    // Old Reddit search results primary
          '.search-expando .md',        // Old Reddit search expando
          '.usertext-body',             // Old Reddit regular listings
          '.md',                        // Old Reddit markdown content
          'div.usertext-body p',        // Old Reddit nested
        ] : [
          'p[data-testid="post-content"]',
          '[slot="text"]',
          '.Post__text',
          'p',
        ]
        let selftext = ''
        for (const selector of textSelectors) {
          const textEl = $post.find(selector).first()
          if (textEl.length > 0) {
            selftext = textEl.text().trim()
            if (selftext.length > 0) break
          }
        }

        // Extract timestamp/date - Old Reddit search uses .search-time time, regular uses time[title]
        let date = new Date().toLocaleDateString() // Default to today if not found
        const timeSelectors = isOldReddit ? [
          '.search-time time',          // Old Reddit search results primary
          'time[title]',                // Old Reddit with title attribute
          'time',                       // Old Reddit fallback
        ] : [
          'time',
          '[data-testid="post-timestamp"]',
          'faceplate-timeago',
          '[slot="timestamp"]',
        ]
        for (const selector of timeSelectors) {
          const timeEl = $post.find(selector).first()
          if (timeEl.length > 0) {
            const datetime = timeEl.attr('datetime') || timeEl.attr('title') || timeEl.attr('timestamp') || ''
            if (datetime) {
              try {
                const dateObj = new Date(datetime)
                if (!isNaN(dateObj.getTime())) {
                  date = dateObj.toLocaleDateString()
                } else {
                  date = timeEl.text().trim() || date
                }
              } catch {
                date = timeEl.text().trim() || date
              }
            } else {
              const textDate = timeEl.text().trim()
              if (textDate) {
                date = textDate
              }
            }
            break
          }
        }

        // Extract permalink from URL
        const permalink = url.replace('https://www.reddit.com', '') || `/r/${subreddit}/`

        // Only add if we have at least a title
        if (title && url) {
          posts.push({
            title,
            url,
            score,
            excerpt: (selftext || title).substring(0, 200),
            date,
            selftext,
            permalink,
          })
        } else {
          console.warn(`[Reddit HTML] Skipping post ${index}: missing title (${!!title}) or url (${!!url})`)
        }
      } catch (err: any) {
        console.warn(`[Reddit HTML] Error parsing post ${index}:`, err.message)
      }
    })

    console.log(`[Reddit HTML] Successfully scraped ${posts.length} posts for query: "${query}"`)
    return posts
  } catch (error: any) {
    console.error(`[Reddit HTML] Error scraping search page:`, error.message)
    throw error
  }
}

/**
 * Fallback: Scrape recent posts from subreddit and filter by query
 */
async function scrapeRedditHTMLFallback(
  subreddit: string,
  query: string,
  limit: number
): Promise<RedditPost[]> {
  // Use old.reddit.com for fallback too - it's the only reliable way to scrape
  const recentUrl = `https://old.reddit.com/r/${subreddit}/new/`
  const isVercel = !!process.env.VERCEL

  // Set up timeout for Vercel
  let signal: AbortSignal | undefined = undefined
  if (isVercel) {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 25000) // 25 seconds
    signal = controller.signal
  }

  try {
    const response = await fetch(recentUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        // Don't set Accept-Encoding on Vercel
        ...(isVercel ? {} : { 'Accept-Encoding': 'gzip, deflate, br' }),
        'DNT': '1',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Referer': `https://old.reddit.com/r/${subreddit}/`,
      },
      cache: 'no-store',
      ...(signal ? { signal } : {}),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    const posts: RedditPost[] = []
    const queryLower = query.toLowerCase()

    // Old Reddit selectors for fallback
    const postSelectors = [
      'div.thing[data-subreddit]',  // Old Reddit structure
      'div.thing',                   // Old Reddit fallback
    ]
    let $posts: ReturnType<typeof $> | null = null
    for (const selector of postSelectors) {
      $posts = $(selector)
      if ($posts.length > 0) {
        console.log(`[Reddit HTML Fallback] Found ${$posts.length} posts using selector: ${selector}`)
        break
      }
    }

    if (!$posts || $posts.length === 0) {
      console.warn(`[Reddit HTML Fallback] No posts found with selectors`)
      return []
    }

    $posts.slice(0, 50).each((index, element) => {
      try {
        const $post = $(element)
        // Old Reddit title extraction
        const title = $post.find('a.title, p.title a').first().text().trim()
        const text = $post.find('.usertext-body, .md').first().text().trim()

        // Filter by query
        if (title.toLowerCase().includes(queryLower) || text.toLowerCase().includes(queryLower)) {
          // Old Reddit URL extraction
          const href = $post.find('a.title, p.title a').first().attr('href') || ''
          const url = href.startsWith('http') ? href : `https://www.reddit.com${href}`
          // Old Reddit score extraction
          const scoreText = $post.find('.score.unvoted, .score').first().text().trim().replace(/\D/g, '')
          const score = parseInt(scoreText, 10) || 0

          if (title && url) {
            posts.push({
              title,
              url,
              score,
              excerpt: (text || title).substring(0, 200),
              date: 'Unknown',
              selftext: text,
              permalink: href,
            })
          }
        }
      } catch (err: any) {
        // Skip this post
      }
    })

    return posts.slice(0, limit)
  } catch (error: any) {
    console.error(`[Reddit HTML] Fallback scraping failed:`, error.message)
    return []
  }
}

/**
 * Scrape multiple search terms and combine results
 */
export async function scrapeRedditHTMLMultiple(
  subreddit: string,
  searchTerms: string[],
  options: {
    limit?: number
    sort?: 'relevance' | 'hot' | 'top' | 'new'
  } = {}
): Promise<RedditPost[]> {
  const allPosts: RedditPost[] = []
  const seenUrls = new Set<string>()

  for (const term of searchTerms) {
    try {
      const posts = await scrapeRedditHTML(subreddit, term, options)
      
      for (const post of posts) {
        if (!seenUrls.has(post.url)) {
          seenUrls.add(post.url)
          allPosts.push(post)
        }
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (error: any) {
      console.error(`[Reddit HTML] Error searching "${term}":`, error.message)
      // Continue to next term
    }
  }

  return allPosts
}
