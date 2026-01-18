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
    // Fetch HTML with proper headers to mimic a browser
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    const posts: RedditPost[] = []

    // Old Reddit HTML structure - posts are in div.thing elements with class "thing"
    // Old Reddit is server-rendered HTML, perfect for scraping!
    const postSelectors = [
      'div.thing[data-subreddit]',  // Old Reddit structure
      'div.thing',                   // Fallback for old Reddit
      'shreddit-post',               // Try modern Reddit if somehow loaded
      'article[data-testid="post-container"]',
      'div.Post',
    ]

    let $posts: ReturnType<typeof $> | null = null
    for (const selector of postSelectors) {
      $posts = $(selector)
      if ($posts.length > 0) {
        console.log(`[Reddit HTML] Found ${$posts.length} posts using selector: ${selector}`)
        break
      }
    }

    if (!$posts || $posts.length === 0) {
      console.warn(`[Reddit HTML] No posts found with any selector. Trying fallback method...`)
      return await scrapeRedditHTMLFallback(subreddit, query, limit)
    }

    // Extract post data
    $posts.slice(0, limit).each((index, element) => {
      try {
        const $post = $(element)
        
        // Check if this is old Reddit structure (div.thing)
        const isOldReddit = $post.hasClass('thing') || $post.attr('class')?.includes('thing')
        
        // Extract title - Old Reddit uses a.title, Modern Reddit uses different selectors
        const titleSelectors = isOldReddit ? [
          'a.title',                    // Old Reddit primary
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

        // Extract URL/permalink - Old Reddit uses a.title href
        let url = ''
        const linkSelectors = isOldReddit ? [
          'a.title',                    // Old Reddit primary
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

        // Extract score - Old Reddit uses .score.unvoted, Modern Reddit uses different selectors
        const scoreSelectors = isOldReddit ? [
          '.score.unvoted',             // Old Reddit primary
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

        // Extract selftext/excerpt - Old Reddit uses .usertext-body
        const textSelectors = isOldReddit ? [
          '.usertext-body',             // Old Reddit primary
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

        // Extract timestamp/date - Old Reddit uses time tag with title attribute
        let date = new Date().toLocaleDateString() // Default to today if not found
        const timeSelectors = isOldReddit ? [
          'time',                       // Old Reddit primary (has title attribute)
          'time[title]',                // Old Reddit with title
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

  try {
    const response = await fetch(recentUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      cache: 'no-store',
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
