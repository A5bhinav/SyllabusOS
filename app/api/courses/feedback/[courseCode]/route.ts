import { NextRequest, NextResponse } from 'next/server'

interface RedditPost {
  title: string
  url: string
  score: number
  num_comments: number
  selftext?: string
  created_utc: number
  permalink: string
}

interface RedditSearchResponse {
  data: {
    children: Array<{
      data: RedditPost
    }>
  }
}

export interface CourseFeedback {
  courseCode: string
  courseName: string
  difficulty: 'Easy' | 'Moderate' | 'Hard' | 'Very Hard'
  averageGrade: string
  professorRating?: number
  positiveFeedback: string[]
  negativeFeedback: string[]
  gradeDistribution?: {
    A: number
    B: number
    C: number
    D: number
    F: number
  }
  redditPosts: Array<{
    title: string
    url: string
    score: number
    excerpt: string
    date: string
  }>
}

// Mapping of course codes to Reddit search terms and course names
const COURSE_CONFIG: Record<string, { searchTerms: string[], name: string, redditUrl?: string }> = {
  'CSE 101': {
    searchTerms: ['CSE101', 'CSE 101', 'CS101', 'CS 101 UCSC'],
    name: 'CSE 101 - Introduction to Data Structures and Algorithms',
    redditUrl: 'https://www.reddit.com/r/UCSC/search/?q=CSE101%20OR%20CSE%20101&restrict_sr=1&sort=relevance'
  },
  'CSE 13S': {
    searchTerms: ['CSE13S', 'CSE 13S', 'CS13S UCSC'],
    name: 'CSE 13S - Computer Systems and C Programming',
    redditUrl: 'https://www.reddit.com/r/UCSC/search/?q=CSE13S%20OR%20CSE%2013S&restrict_sr=1&sort=relevance'
  },
  'CSE 102': {
    searchTerms: ['CSE102', 'CSE 102', 'CS102 UCSC'],
    name: 'CSE 102 - Analysis of Algorithms',
    redditUrl: 'https://www.reddit.com/r/UCSC/search/?q=CSE102%20OR%20CSE%20102&restrict_sr=1&sort=relevance'
  },
  'CSE 115A': {
    searchTerms: ['CSE115A', 'CSE 115A', 'Software Engineering UCSC'],
    name: 'CSE 115A - Software Engineering',
    redditUrl: 'https://www.reddit.com/r/UCSC/search/?q=CSE115A%20OR%20Software%20Engineering&restrict_sr=1&sort=relevance'
  },
  'CSE 130': {
    searchTerms: ['CSE130', 'CSE 130', 'Programming Languages UCSC'],
    name: 'CSE 130 - Programming Languages',
    redditUrl: 'https://www.reddit.com/r/UCSC/search/?q=CSE130%20OR%20CSE%20130&restrict_sr=1&sort=relevance'
  },
  'MATH 19A': {
    searchTerms: ['MATH19A', 'MATH 19A', 'Calculus UCSC'],
    name: 'MATH 19A - Calculus for Science, Engineering, and Mathematics',
    redditUrl: 'https://www.reddit.com/r/UCSC/search/?q=MATH19A%20OR%20MATH%2019A&restrict_sr=1&sort=relevance'
  },
  'MATH 19B': {
    searchTerms: ['MATH19B', 'MATH 19B UCSC'],
    name: 'MATH 19B - Calculus for Science, Engineering, and Mathematics',
    redditUrl: 'https://www.reddit.com/r/UCSC/search/?q=MATH19B%20OR%20MATH%2019B&restrict_sr=1&sort=relevance'
  },
  'CSE 12': {
    searchTerms: ['CSE12', 'CSE 12', 'Computer Systems UCSC'],
    name: 'CSE 12 - Computer Systems and Assembly Language',
    redditUrl: 'https://www.reddit.com/r/UCSC/search/?q=CSE12%20OR%20CSE%2012&restrict_sr=1&sort=relevance'
  },
  'AMS 10': {
    searchTerms: ['AMS10', 'AMS 10', 'Mathematical Methods UCSC'],
    name: 'AMS 10 - Mathematical Methods for Engineers I',
    redditUrl: 'https://www.reddit.com/r/UCSC/search/?q=AMS10%20OR%20AMS%2010&restrict_sr=1&sort=relevance'
  },
  'PHYS 5A': {
    searchTerms: ['PHYS5A', 'PHYS 5A', 'Physics UCSC'],
    name: 'PHYS 5A - Introductory Physics I',
    redditUrl: 'https://www.reddit.com/r/UCSC/search/?q=PHYS5A%20OR%20PHYS%205A&restrict_sr=1&sort=relevance'
  },
}

async function searchReddit(query: string): Promise<RedditPost[]> {
  try {
    // Use Reddit's JSON API (no auth required for public data)
    const url = `https://www.reddit.com/r/UCSC/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=relevance&limit=10&t=all`
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SyllabusOS/1.0 (Educational Course Feedback Tool)'
      }
    })

    if (!response.ok) {
      console.error(`Reddit API error: ${response.status}`)
      return []
    }

    const data: RedditSearchResponse = await response.json()
    return data.data.children.map(child => child.data)
  } catch (error) {
    console.error('Error fetching Reddit data:', error)
    return []
  }
}

function analyzeFeedback(posts: RedditPost[], courseCode: string): Partial<CourseFeedback> {
  const feedback: Partial<CourseFeedback> = {
    positiveFeedback: [],
    negativeFeedback: [],
  }

  if (!posts || posts.length === 0) {
    return feedback
  }

  // Extract positive and negative feedback from posts
  const positiveKeywords = ['good', 'great', 'helpful', 'easy', 'clear', 'recommend', 'enjoy', 'learned', 'useful', 'worth it', 'excellent', 'awesome', 'love', 'best']
  const negativeKeywords = ['hard', 'difficult', 'confusing', 'too much', 'struggle', 'problem', 'issue', 'bad', 'avoid', 'overwhelming', 'terrible', 'worst', 'stressful']

  // Extract specific feedback from posts
  posts.forEach(post => {
    const text = `${post.title} ${post.selftext || ''}`.toLowerCase()
    const fullText = post.selftext || post.title || ''
    
    // Check for positive keywords in this post
    const hasPositive = positiveKeywords.some(keyword => text.includes(keyword))
    // Check for negative keywords in this post
    const hasNegative = negativeKeywords.some(keyword => text.includes(keyword))
    
    if (hasPositive && fullText) {
      // Extract a meaningful excerpt (try to get a sentence or at least 100 chars)
      let excerpt = fullText.substring(0, 200).trim()
      // Try to end at a sentence
      const lastPeriod = excerpt.lastIndexOf('.')
      const lastSpace = excerpt.lastIndexOf(' ')
      if (lastPeriod > 100) {
        excerpt = excerpt.substring(0, lastPeriod + 1)
      } else if (lastSpace > 100) {
        excerpt = excerpt.substring(0, lastSpace) + '...'
      } else if (excerpt.length === 200) {
        excerpt += '...'
      }
      
      if (excerpt && !feedback.positiveFeedback?.includes(excerpt)) {
        feedback.positiveFeedback?.push(excerpt)
      }
    }
    
    if (hasNegative && fullText) {
      // Extract a meaningful excerpt
      let excerpt = fullText.substring(0, 200).trim()
      const lastPeriod = excerpt.lastIndexOf('.')
      const lastSpace = excerpt.lastIndexOf(' ')
      if (lastPeriod > 100) {
        excerpt = excerpt.substring(0, lastPeriod + 1)
      } else if (lastSpace > 100) {
        excerpt = excerpt.substring(0, lastSpace) + '...'
      } else if (excerpt.length === 200) {
        excerpt += '...'
      }
      
      if (excerpt && !feedback.negativeFeedback?.includes(excerpt)) {
        feedback.negativeFeedback?.push(excerpt)
      }
    }
  })

  // Limit feedback items and ensure we have arrays
  feedback.positiveFeedback = (feedback.positiveFeedback || []).slice(0, 5)
  feedback.negativeFeedback = (feedback.negativeFeedback || []).slice(0, 5)

  // If no feedback extracted, provide some default feedback based on common patterns
  if (feedback.positiveFeedback.length === 0 && feedback.negativeFeedback.length === 0 && posts.length > 0) {
    // Use post titles as fallback feedback
    posts.slice(0, 3).forEach(post => {
      if (post.title) {
        const titleLower = post.title.toLowerCase()
        if (positiveKeywords.some(k => titleLower.includes(k))) {
          feedback.positiveFeedback?.push(post.title)
        } else if (negativeKeywords.some(k => titleLower.includes(k))) {
          feedback.negativeFeedback?.push(post.title)
        }
      }
    })
  }

  return feedback
}

function extractDifficulty(posts: RedditPost[]): 'Easy' | 'Moderate' | 'Hard' | 'Very Hard' {
  const allText = posts.map(p => `${p.title} ${p.selftext || ''}`).join(' ').toLowerCase()
  
  if (allText.includes('very hard') || allText.includes('extremely difficult')) {
    return 'Very Hard'
  }
  if (allText.includes('hard') || allText.includes('difficult')) {
    return 'Hard'
  }
  if (allText.includes('moderate') || allText.includes('medium')) {
    return 'Moderate'
  }
  if (allText.includes('easy') && !allText.includes('not easy')) {
    return 'Easy'
  }
  
  // Default based on course level
  return 'Moderate'
}

function getDefaultGradeDistribution(courseCode: string) {
  // Default grade distributions based on typical UCSC course patterns
  const distributions: Record<string, { A: number, B: number, C: number, D: number, F: number }> = {
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
  
  return distributions[courseCode] || { A: 20, B: 30, C: 30, D: 15, F: 5 }
}

/**
 * GET /api/courses/feedback/[courseCode]
 * Scrape Reddit for course feedback by course code (e.g., "CSE 101")
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseCode: string }> }
) {
  try {
    const { courseCode: rawCourseCode } = await params

    if (!rawCourseCode) {
      return NextResponse.json(
        { error: 'Course code is required' },
        { status: 400 }
      )
    }

    // Normalize course code to match COURSE_CONFIG format
    function normalizeCourseCode(code: string): string | null {
      // Remove any encoding issues
      const decoded = decodeURIComponent(code).trim()
      
      // Try exact match first
      if (COURSE_CONFIG[decoded]) {
        return decoded
      }
      
      // Try to normalize: "CSE101" -> "CSE 101", "CSE13S" -> "CSE 13S"
      const match = decoded.match(/^([A-Z]+)\s*(\d+)([A-Z]*)$/i)
      if (match) {
        const [, department, number, suffix] = match
        const normalized = `${department.toUpperCase()} ${number}${suffix.toUpperCase()}`.trim()
        if (COURSE_CONFIG[normalized]) {
          return normalized
        }
      }
      
      // Try case-insensitive search
      for (const key in COURSE_CONFIG) {
        if (key.toLowerCase() === decoded.toLowerCase()) {
          return key
        }
      }
      
      return null
    }

    const courseCode = normalizeCourseCode(rawCourseCode)

    if (!courseCode) {
      return NextResponse.json(
        { error: `Course not found: ${rawCourseCode}. Available courses: ${Object.keys(COURSE_CONFIG).join(', ')}` },
        { status: 404 }
      )
    }

    const config = COURSE_CONFIG[courseCode]

    // Search Reddit for course feedback
    const searchQuery = config.searchTerms.join(' OR ')
    const posts = await searchReddit(searchQuery)

    // Analyze feedback from posts
    const analysis = analyzeFeedback(posts, courseCode)
    const difficulty = extractDifficulty(posts)

    // Format Reddit posts for display
    const redditPosts = posts.slice(0, 5).map(post => ({
      title: post.title,
      url: `https://www.reddit.com${post.permalink}`,
      score: post.score,
      excerpt: (post.selftext || post.title).substring(0, 200) + (post.selftext && post.selftext.length > 200 ? '...' : ''),
      date: new Date(post.created_utc * 1000).toLocaleDateString()
    }))

    // Determine average grade based on difficulty
    const averageGrades: Record<string, string> = {
      'Easy': 'A- to B+',
      'Moderate': 'B to B+',
      'Hard': 'B- to C+',
      'Very Hard': 'C to C+'
    }

    const feedback: CourseFeedback = {
      courseCode,
      courseName: config.name,
      difficulty,
      averageGrade: averageGrades[difficulty] || 'B to B+',
      professorRating: undefined, // Could be enhanced with RateMyProfessors API
      positiveFeedback: analysis.positiveFeedback || [],
      negativeFeedback: analysis.negativeFeedback || [],
      gradeDistribution: getDefaultGradeDistribution(courseCode),
      redditPosts,
    }

    return NextResponse.json(feedback)
  } catch (error: any) {
    console.error('Error fetching course feedback:', error)
    return NextResponse.json(
      { error: 'Failed to fetch course feedback', details: error.message },
      { status: 500 }
    )
  }
}

