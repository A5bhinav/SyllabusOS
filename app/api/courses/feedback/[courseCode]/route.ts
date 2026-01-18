import { NextRequest, NextResponse } from 'next/server'
import { createErrorResponse } from '@/lib/utils/api-errors'

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
    // For now, we'll use a simplified version
    const feedback = await scrapeRedditForCourse(courseCode, fullCourseName)
    
    return NextResponse.json(feedback)
  } catch (error) {
    console.error('Error fetching course feedback:', error)
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

// Simplified Reddit scraping - reuse the core logic from [courseId]/feedback
async function scrapeRedditForCourse(
  courseCode: string,
  fullCourseName: string
): Promise<CourseFeedback> {
  const subreddit = 'UCSC'
  let allPosts: any[] = []
  
  try {
    const searchTerms = [courseCode, courseCode.replace(/\s+/g, '')]
    
    for (const term of searchTerms) {
      try {
        const searchUrl = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(term)}&restrict_sr=1&limit=10&sort=relevance&t=all`
        const response = await fetch(searchUrl, {
          headers: { 'User-Agent': 'SyllabusOS/1.0' },
          next: { revalidate: 300 }
        })
        
        if (response.ok) {
          const data = await response.json()
          const posts = data.data?.children || []
          allPosts = [...allPosts, ...posts]
        }
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (err) {
        console.error(`Error searching "${term}":`, err)
      }
    }

    // Remove duplicates
    const uniquePosts = Array.from(
      new Map(allPosts.map((p: any) => [p.data?.permalink || p.data?.id, p])).values()
    ).filter((p: any) => p.data)

    // Process posts
    return processRedditPosts(uniquePosts, courseCode, fullCourseName)
  } catch (error) {
    console.error('[Reddit] Error scraping:', error)
    return getDefaultFeedback(courseCode, fullCourseName)
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

  // Format Reddit posts
  const redditPosts = posts.slice(0, 5).map((post: any) => ({
    title: post.data?.title || '',
    url: `https://www.reddit.com${post.data?.permalink || ''}`,
    score: post.data?.score || 0,
    excerpt: (post.data?.selftext || post.data?.title || '').substring(0, 200),
    date: new Date((post.data?.created_utc || 0) * 1000).toLocaleDateString()
  })).filter(p => p.url && p.url.includes('reddit.com'))

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
