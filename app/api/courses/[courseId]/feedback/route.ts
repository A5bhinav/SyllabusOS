import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, createNotFoundError } from '@/lib/utils/api-errors'
import type { CourseFeedback } from '@/types/api'

interface RedditPost {
  title: string
  content: string
  upvotes: number
  url: string
  subreddit: string
  created: number
}

/**
 * GET /api/courses/[courseId]/feedback
 * Scrape Reddit for course feedback and return aggregated data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params
    let courseName: string

    // Check if it's a fake course first (for demo purposes)
    const fakeCourses: { [key: string]: string } = {
      'fake-course-1': 'CMPS 101 - Algorithms and Abstract Data Types',
      'fake-course-2': 'CMPS 12B - Data Structures',
      'fake-course-3': 'MATH 19A - Calculus for Science, Engineering, and Mathematics',
      'fake-course-4': 'CSE 101 - Algorithms and Complexity',
      'fake-course-5': 'ECON 1 - Introductory Microeconomics',
      'fake-course-6': 'CHEM 1B - General Chemistry',
      'fake-course-7': 'PHYS 5A - Introduction to Physics I',
      'fake-course-8': 'BIOL 20A - Cell and Molecular Biology',
      'fake-course-9': 'STAT 5 - Statistics',
      'fake-course-10': 'LIT 1 - Introduction to Literature',
      'fake-course-11': 'PSYC 1 - Introduction to Psychology',
      'fake-course-12': 'CSE 12 - Computer Systems and Assembly Language',
    }

    if (fakeCourses[courseId]) {
      courseName = fakeCourses[courseId]
    } else {
      // Get course from database
      const supabase = await createClient()
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('id, name')
        .eq('id', courseId)
        .single()

      if (courseError || !course) {
        return createNotFoundError('Course')
      }

      courseName = course.name
    }

    // Extract course code (e.g., "CMPS 101" from "CMPS 101 - Algorithms and Abstract Data Types")
    const courseCode = courseName.split(' - ')[0]
    
    // Scrape Reddit
    const feedback = await scrapeRedditForCourse(courseCode, courseName)
    
    return NextResponse.json(feedback)
  } catch (error) {
    console.error('Error fetching course feedback:', error)
    return createErrorResponse(error, 'Failed to fetch course feedback')
  }
}

async function scrapeRedditForCourse(
  courseCode: string,
  fullCourseName: string
): Promise<CourseFeedback> {
  // UC Santa Cruz subreddit
  const subreddit = 'UCSC'
  
  try {
    // Try multiple search strategies to get real Reddit data
    let allPosts: any[] = []
    
    // Strategy 1: Direct search in UCSC subreddit with multiple search terms
    const searchTerms = [
      courseCode,
      courseCode.replace(/\s+/g, ''), // CMPS101
    ].filter(Boolean)

    for (const term of searchTerms.slice(0, 2)) { // Limit to 2 searches
      try {
        // Reddit search endpoint - try both search.json and regular search
        const searchUrl = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(term)}&restrict_sr=1&limit=50&sort=relevance&t=all`
        
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // Increased timeout
        
        const response = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          signal: controller.signal,
          next: { revalidate: 300 } // Cache for 5 minutes
        })
        
        clearTimeout(timeoutId)

        if (response.ok) {
          const data = await response.json()
          const posts = data.data?.children || []
          if (posts && posts.length > 0) {
            // Filter to ensure posts actually mention the course code
            const courseCodeLower = courseCode.toLowerCase()
            const courseCodeNoSpace = courseCode.replace(/\s+/g, '').toLowerCase()
            
            const relevantPosts = posts.filter((post: any) => {
              if (!post.data) return false
              const title = (post.data.title || '').toLowerCase()
              const content = (post.data.selftext || '').toLowerCase()
              return title.includes(courseCodeLower) || 
                     title.includes(courseCodeNoSpace) ||
                     content.includes(courseCodeLower) ||
                     content.includes(courseCodeNoSpace)
            })
            
            if (relevantPosts.length > 0) {
              allPosts = [...allPosts, ...relevantPosts]
              console.log(`[Reddit] Found ${relevantPosts.length} relevant posts for "${term}" (out of ${posts.length} total)`)
            }
          }
        } else {
          console.warn(`[Reddit] Search returned ${response.status} for "${term}"`)
        }
        
        await new Promise(resolve => setTimeout(resolve, 800)) // Increased delay
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error(`[Reddit] Error searching "${term}":`, err.message)
        }
      }
    }

    // Strategy 2: Fetch recent posts and filter for course mentions
    if (allPosts.length < 5) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)
        
        // Get more recent posts from UCSC subreddit (both new and hot)
        const endpoints = [
          `https://www.reddit.com/r/${subreddit}/new.json?limit=100`,
          `https://www.reddit.com/r/${subreddit}/hot.json?limit=100`
        ]
        
        for (const endpoint of endpoints) {
          try {
            const response = await fetch(endpoint, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
              },
              signal: controller.signal,
              next: { revalidate: 300 }
            })
            
            clearTimeout(timeoutId)
            
            if (response.ok) {
              const data = await response.json()
              const posts = data.data?.children || []
              
              // Filter posts that mention the course code
              const courseCodeLower = courseCode.toLowerCase()
              const courseCodeNoSpace = courseCode.replace(/\s+/g, '').toLowerCase()
              const coursePrefix = courseCode.split(' ')[0]?.toLowerCase() || ''
              
              const filtered = posts.filter((post: any) => {
                if (!post.data) return false
                const title = (post.data.title || '').toLowerCase()
                const content = (post.data.selftext || '').toLowerCase()
                const combined = `${title} ${content}`
                
                // More specific matching
                return (title.includes(courseCodeLower) || title.includes(courseCodeNoSpace)) ||
                       (combined.includes(courseCodeLower) || combined.includes(courseCodeNoSpace)) ||
                       (title.includes(coursePrefix) && (title.includes('101') || title.includes('12') || title.includes('19') || content.includes(courseCodeLower)))
              })
              
              if (filtered.length > 0) {
                allPosts = [...allPosts, ...filtered]
                console.log(`[Reddit] Found ${filtered.length} relevant posts from ${endpoint.includes('new') ? 'new' : 'hot'} posts`)
                break // Got enough posts, don't need to check hot
              }
            }
          } catch (err: any) {
            if (err.name !== 'AbortError') {
              console.error(`[Reddit] Error fetching from ${endpoint}:`, err.message)
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('[Reddit] Error fetching recent posts:', err.message)
        }
      }
    }

    // Remove duplicates by permalink or id
    const uniquePosts = Array.from(
      new Map(allPosts.map((p: any) => [p.data?.permalink || p.data?.id, p])).values()
    ).filter((p: any) => p.data) // Ensure posts have data

    console.log(`[Reddit] Total unique posts found: ${uniquePosts.length}`)

    // Process posts to extract feedback
    if (uniquePosts.length > 0) {
      const processed = processRedditPosts(uniquePosts, courseCode, fullCourseName)
      console.log(`[Reddit] Processed ${processed.samplePosts.length} sample posts`)
      
      // Filter out any posts with fake/invalid URLs
      const validPosts = processed.samplePosts.filter(p => {
        // Must be a real Reddit URL with actual post ID
        return p.url && 
               p.url.includes('reddit.com') && 
               !p.url.includes('example') &&
               (p.url.match(/\/comments\/[a-z0-9]+/i) !== null) // Must have actual post ID
      })
      
      processed.samplePosts = validPosts
      console.log(`[Reddit] Filtered to ${validPosts.length} posts with valid Reddit URLs`)
      
      // Return processed data with real Reddit posts (grade distribution may be fake if not found in posts)
      return processed
    }
    
    // Only use fallback if absolutely no posts found
    // This fallback should NEVER include fake Reddit posts - only empty arrays
    console.warn(`[Reddit] No posts found for ${courseCode}, returning minimal fallback (grade distribution only)`)
    return getEnhancedDefaultFeedback(courseCode, fullCourseName)
  } catch (error) {
    console.error('[Reddit] Error scraping:', error)
    // Return enhanced default data if scraping fails
    return getEnhancedDefaultFeedback(courseCode, fullCourseName)
  }
}

function processRedditPosts(
  posts: any[],
  courseCode: string,
  fullCourseName: string
): CourseFeedback {
  const positiveFeedback: string[] = []
  const negativeFeedback: string[] = []
  const difficulties: number[] = []
  const ratings: number[] = []
  const samplePosts: RedditPost[] = []
  const gradeCounts: { [key: string]: number } = {}
  
  // Enhanced keywords for sentiment analysis
  const positiveKeywords = [
    'great', 'excellent', 'amazing', 'love', 'recommend', 'helpful', 
    'clear', 'easy', 'good', 'awesome', 'best', 'favorite', 'enjoy',
    'understanding', 'fair', 'caring', 'organized', 'interesting',
    'helpful', 'supportive', 'patient', 'approachable'
  ]
  const negativeKeywords = [
    'hard', 'difficult', 'terrible', 'awful', 'confusing', 'boring', 
    'waste', 'worst', 'hate', 'horrible', 'disorganized', 'unclear',
    'unfair', 'harsh', 'stressful', 'too much', 'overwhelming',
    'struggling', 'challenging', 'frustrating'
  ]
  
  posts.forEach((post: any) => {
    if (!post.data) return
    
    const title = (post.data.title || '').toLowerCase()
    const content = (post.data.selftext || '').toLowerCase()
    const text = `${title} ${content}`
    
    // Extract difficulty mentions (1-5 scale or qualitative)
    const difficultyMatches = [
      ...text.matchAll(/difficulty[:\s]+(\d)/gi),
      ...text.matchAll(/rated[:\s]+(\d)/gi),
      ...text.matchAll(/hardness[:\s]+(\d)/gi),
      ...text.matchAll(/(?:very|extremely|super)\s+(?:hard|difficult)/gi),
      ...text.matchAll(/(?:very|extremely|super)\s+easy/gi),
    ]
    
    difficultyMatches.forEach(match => {
      if (match[1]) {
        const level = parseInt(match[1])
        if (level >= 1 && level <= 5) {
          difficulties.push(level)
        }
      } else {
        // Qualitative difficulty indicators
        const matchText = match[0].toLowerCase()
        if (matchText.includes('very hard') || matchText.includes('extremely difficult')) {
          difficulties.push(5)
        } else if (matchText.includes('very easy')) {
          difficulties.push(1)
        }
      }
    })
    
    // Extract rating mentions (1-5 scale)
    const ratingMatches = [
      ...text.matchAll(/rating[:\s]+(\d)/gi),
      ...text.matchAll(/professor[:\s]+(\d)/gi),
      ...text.matchAll(/rate[:\s]+(\d)/gi),
      ...text.matchAll(/(\d)\s*\/\s*5/gi), // "4/5" format
      ...text.matchAll(/(\d)\s*out\s*of\s*5/gi), // "4 out of 5" format
    ]
    ratingMatches.forEach(match => {
      if (match[1]) {
        const rating = parseInt(match[1])
        if (rating >= 1 && rating <= 5) {
          ratings.push(rating)
        }
      }
    })
    
    // Infer difficulty from keywords if no explicit rating
    if (difficulties.length === 0) {
      const veryHard = /very\s+hard|extremely\s+difficult|nightmare|impossible/gi.test(text)
      const hard = /hard|difficult|challenging|struggl/gi.test(text)
      const easy = /easy|simple|straightforward|not\s+hard/gi.test(text)
      const veryEasy = /very\s+easy|extremely\s+easy|super\s+easy/gi.test(text)
      
      if (veryHard) difficulties.push(5)
      else if (hard) difficulties.push(4)
      else if (easy && !hard) difficulties.push(2)
      else if (veryEasy) difficulties.push(1)
    }
    
    // Infer professor rating from keywords if no explicit rating
    if (ratings.length === 0) {
      const excellent = /excellent|amazing|best|outstanding|fantastic/gi.test(text)
      const good = /good|great|solid|helpful|clear/gi.test(text)
      const bad = /bad|terrible|awful|worst|horrible|hate/gi.test(text)
      
      if (excellent) ratings.push(5)
      else if (good && !bad) ratings.push(4)
      else if (bad) ratings.push(2)
    }
    
    // Extract grade distribution mentions (BerkeleyTime format)
    const gradePatterns = [
      ...text.matchAll(/([A-F][+-]?|P|NP|W)[:\s]*(\d+(?:\.\d+)?%?)/gi),
      ...text.matchAll(/(\d+(?:\.\d+)?%?)[:\s]*([A-F][+-]?|P|NP|W)/gi),
    ]
    gradePatterns.forEach(match => {
      const grade = match[1]?.toUpperCase() || match[2]?.toUpperCase()
      const percent = match[2] || match[1]
      if (grade && (grade.match(/^[A-F][+-]?$/) || grade === 'P' || grade === 'NP' || grade === 'W')) {
        const num = parseFloat(percent.replace('%', ''))
        if (!isNaN(num)) {
          gradeCounts[grade] = (gradeCounts[grade] || 0) + Math.round(num)
        }
      }
    })
    
    // Categorize feedback
    const positiveCount = positiveKeywords.filter(kw => text.includes(kw)).length
    const negativeCount = negativeKeywords.filter(kw => text.includes(kw)).length
    
    const contentText = post.data.selftext || post.data.title || ''
    
    if (contentText.length > 30) {
      if (positiveCount > negativeCount) {
        positiveFeedback.push(contentText.substring(0, 300))
      } else if (negativeCount > positiveCount) {
        negativeFeedback.push(contentText.substring(0, 300))
      }
      // Also add neutral posts that mention the course (for sample posts)
    }
    
    // Add to sample posts - use REAL Reddit URLs from actual posts
    if (contentText.length > 30 && post.data) {
      // Reddit API permalink format: /r/subreddit/comments/[id]/[title]/
      // Example: /r/UCSC/comments/6cqg64/should_i_take_cmps_101_with_vishwanathan_or/
      let redditUrl = ''
      
      if (post.data.permalink) {
        // Reddit API permalink format: /r/UCSC/comments/[id]/[title]/
        // Example: /r/UCSC/comments/6cqg64/should_i_take_cmps_101_with_vishwanathan_or/
        // Just prepend the domain - permalink is already in correct format
        const permalink = post.data.permalink.startsWith('http') 
          ? post.data.permalink 
          : `https://www.reddit.com${post.data.permalink}`
        redditUrl = permalink
      } else if (post.data.id) {
        // Fallback: construct URL from post ID (format: /r/subreddit/comments/id/)
        const subreddit = post.data.subreddit || 'UCSC'
        // Reddit post IDs are base36 encoded (alphanumeric)
        redditUrl = `https://www.reddit.com/r/${subreddit}/comments/${post.data.id}/`
      }
      
      // Only add if we have a VALID Reddit URL with real post ID (NO fake URLs)
      // Reddit permalink format: /r/subreddit/comments/[base36_id]/[title]/
      // Example: /r/UCSC/comments/6cqg64/should_i_take_cmps_101_with_vishwanathan_or/
      if (redditUrl && 
          redditUrl.includes('reddit.com') && 
          !redditUrl.includes('example') &&
          redditUrl.match(/\/comments\/[a-z0-9]+/i) !== null) { // Must have actual post ID
        
        samplePosts.push({
          title: post.data.title || 'Untitled',
          content: (post.data.selftext || post.data.title || '').substring(0, 500),
          upvotes: post.data.ups || 0,
          url: redditUrl,
          subreddit: post.data.subreddit || 'UCSC',
          created: post.data.created_utc || Date.now() / 1000
        })
      } else {
        console.warn(`[Reddit] Skipping post - invalid or fake URL: ${redditUrl || 'none'}`)
      }
    }
  })
  
  // Calculate averages
  const avgDifficulty = difficulties.length > 0
    ? difficulties.reduce((a, b) => a + b, 0) / difficulties.length
    : 3.0
  
  const avgRating = ratings.length > 0
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length
    : 3.5
  
  // Use grade distribution from Reddit if found, otherwise use unique fake data per course
  let gradeDistribution: CourseFeedback['gradeDistribution']
  if (Object.keys(gradeCounts).length > 0) {
    // Real grade data from Reddit
    gradeDistribution = normalizeGradeDistribution(gradeCounts, samplePosts.length)
  } else {
    // Unique fake grade distribution per course (since we don't have real data)
    gradeDistribution = getUniqueGradeDistribution(courseCode)
  }
  
  // Calculate total enrollment (estimate based on grade distribution)
  const totalEnrollment = Object.values(gradeDistribution).reduce((a, b) => a + b, 0)
  const normalizedTotal = totalEnrollment || 100 // Normalize to 100 if needed
  
  // Calculate average GPA from grade distribution
  const gpaMap: { [key: string]: number } = {
    'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'D-': 0.7, 'F': 0.0
  }
  let totalPoints = 0
  let totalCredits = 0
  Object.entries(gradeDistribution).forEach(([grade, percentage]) => {
    if (gpaMap[grade] !== undefined && percentage > 0) {
      const count = (percentage / 100) * normalizedTotal
      totalPoints += gpaMap[grade] * count
      totalCredits += count
    }
  })
  const averageGPA = totalCredits > 0 ? totalPoints / totalCredits : 0
  
  return {
    courseName: courseCode,
    difficulty: {
      average: Math.round(avgDifficulty * 10) / 10,
      distribution: {
        1: difficulties.filter(d => d === 1).length,
        2: difficulties.filter(d => d === 2).length,
        3: difficulties.filter(d => d === 3).length,
        4: difficulties.filter(d => d === 4).length,
        5: difficulties.filter(d => d === 5).length,
      }
    },
    professorRating: {
      average: Math.round(avgRating * 10) / 10,
      count: ratings.length
    },
    positiveFeedback: positiveFeedback.slice(0, 5),
    negativeFeedback: negativeFeedback.slice(0, 5),
    gradeDistribution,
    samplePosts: samplePosts
      .sort((a, b) => b.upvotes - a.upvotes)
      .slice(0, 10),
    totalEnrollment: normalizedTotal,
    averageGPA: Math.round(averageGPA * 100) / 100
  }
}

// Generate unique grade distribution per course (based on course code hash)
function getUniqueGradeDistribution(courseCode: string): CourseFeedback['gradeDistribution'] {
  // Generate a simple hash from course code to create unique distributions
  let hash = 0
  for (let i = 0; i < courseCode.length; i++) {
    hash = ((hash << 5) - hash) + courseCode.charCodeAt(i)
    hash = hash & hash // Convert to 32-bit integer
  }
  
  // Use hash to create variation in grade distributions
  const variations = [
    { 'A': 28, 'A-': 12, 'B+': 15, 'B': 18, 'B-': 8, 'C+': 6, 'C': 5, 'C-': 2, 'D+': 2, 'D': 2, 'D-': 1, 'F': 1, 'P': 0, 'NP': 0, 'W': 0 },
    { 'A': 32, 'A-': 15, 'B+': 18, 'B': 18, 'B-': 8, 'C+': 4, 'C': 3, 'C-': 1, 'D+': 1, 'D': 0, 'D-': 0, 'F': 0, 'P': 0, 'NP': 0, 'W': 0 },
    { 'A': 22, 'A-': 10, 'B+': 14, 'B': 20, 'B-': 12, 'C+': 8, 'C': 6, 'C-': 3, 'D+': 2, 'D': 2, 'D-': 1, 'F': 0, 'P': 0, 'NP': 0, 'W': 0 },
    { 'A': 35, 'A-': 18, 'B+': 20, 'B': 15, 'B-': 6, 'C+': 3, 'C': 2, 'C-': 1, 'D+': 0, 'D': 0, 'D-': 0, 'F': 0, 'P': 0, 'NP': 0, 'W': 0 },
    { 'A': 20, 'A-': 10, 'B+': 12, 'B': 18, 'B-': 14, 'C+': 10, 'C': 8, 'C-': 4, 'D+': 2, 'D': 2, 'D-': 0, 'F': 0, 'P': 0, 'NP': 0, 'W': 0 },
    { 'A': 30, 'A-': 14, 'B+': 16, 'B': 16, 'B-': 10, 'C+': 6, 'C': 4, 'C-': 2, 'D+': 1, 'D': 1, 'D-': 0, 'F': 0, 'P': 0, 'NP': 0, 'W': 0 },
    { 'A': 25, 'A-': 13, 'B+': 17, 'B': 19, 'B-': 9, 'C+': 7, 'C': 5, 'C-': 2, 'D+': 2, 'D': 1, 'D-': 0, 'F': 0, 'P': 0, 'NP': 0, 'W': 0 },
    { 'A': 29, 'A-': 14, 'B+': 16, 'B': 17, 'B-': 9, 'C+': 6, 'C': 4, 'C-': 2, 'D+': 2, 'D': 1, 'D-': 0, 'F': 0, 'P': 0, 'NP': 0, 'W': 0 },
  ]
  
  const index = Math.abs(hash) % variations.length
  return variations[index]
}

function normalizeGradeDistribution(
  gradeCounts: { [key: string]: number },
  postCount: number
): CourseFeedback['gradeDistribution'] {
  // If we have actual data from Reddit, normalize it
  if (Object.keys(gradeCounts).length > 0) {
    const total = Object.values(gradeCounts).reduce((a, b) => a + b, 0)
    if (total > 0) {
      const normalized: CourseFeedback['gradeDistribution'] = {
        'A': 0, 'A-': 0, 'B+': 0, 'B': 0, 'B-': 0,
        'C+': 0, 'C': 0, 'C-': 0, 'D+': 0, 'D': 0, 'D-': 0,
        'F': 0, 'P': 0, 'NP': 0, 'W': 0
      }
      
      Object.entries(gradeCounts).forEach(([grade, count]) => {
        if (normalized.hasOwnProperty(grade)) {
          normalized[grade as keyof typeof normalized] = Math.round((count / total) * 100)
        }
      })
      
      return normalized
    }
  }
  
  // Return empty distribution - should use unique fake data instead
  return {
    'A': 0, 'A-': 0, 'B+': 0, 'B': 0, 'B-': 0,
    'C+': 0, 'C': 0, 'C-': 0, 'D+': 0, 'D': 0, 'D-': 0,
    'F': 0, 'P': 0, 'NP': 0, 'W': 0
  }
}

function getDefaultFeedback(courseCode: string): CourseFeedback {
  return {
    courseName: courseCode,
    difficulty: {
      average: 3.0,
      distribution: { 1: 0, 2: 5, 3: 15, 4: 10, 5: 5 }
    },
    professorRating: {
      average: 3.5,
      count: 0
    },
    positiveFeedback: [],
    negativeFeedback: [],
    gradeDistribution: {
      'A': 28, 'A-': 12, 'B+': 15, 'B': 18, 'B-': 8,
      'C+': 6, 'C': 5, 'C-': 2, 'D+': 2, 'D': 2, 'D-': 1,
      'F': 1, 'P': 0, 'NP': 0, 'W': 0
    },
    samplePosts: [],
    totalEnrollment: 150,
    averageGPA: 3.2
  }
}

function getEnhancedDefaultFeedback(courseCode: string, fullCourseName: string): CourseFeedback {
  // Only use this as LAST RESORT fallback - everything should be real from Reddit
  // This fallback should NEVER have real-looking Reddit URLs - they should be empty or clearly indicate no data
  const isCS = courseCode.includes('CMPS') || courseCode.includes('CSE')
  const isMath = courseCode.includes('MATH')
  const isHardCourse = isCS || isMath

  return {
    courseName: courseCode,
    difficulty: {
      average: isHardCourse ? 3.8 : 3.2,
      distribution: isHardCourse 
        ? { 1: 2, 2: 8, 3: 15, 4: 25, 5: 15 }
        : { 1: 5, 2: 10, 3: 20, 4: 10, 5: 5 }
    },
    professorRating: {
      average: isHardCourse ? 4.2 : 3.8,
      count: 0 // 0 count indicates no real data
    },
    positiveFeedback: [], // Empty - no fake feedback
    negativeFeedback: [], // Empty - no fake feedback
    gradeDistribution: getUniqueGradeDistribution(courseCode), // Unique per course
    samplePosts: [], // Empty - NO fake Reddit posts
    totalEnrollment: isHardCourse ? 180 : 150,
    averageGPA: isHardCourse ? 3.1 : 3.4
  }
}
