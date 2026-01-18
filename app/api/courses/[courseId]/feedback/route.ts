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
  { params }: { params: { courseId: string } }
) {
  try {
    const courseId = params.courseId
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
    // Fetch from Reddit JSON API
    // Try multiple search terms for better results
    const searchTerms = [
      courseCode,
      courseCode.replace(/\s+/g, ''), // CMPS101
    ].filter(Boolean)

    let allPosts: any[] = []

    // Search with different terms
    for (const term of searchTerms) {
      if (!term) continue
      
      try {
        // Use Reddit's search endpoint with proper query
        const searchUrl = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(term)}&limit=25&sort=relevance&restrict_sr=1&t=all`
        
        // Create timeout controller
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        
        const response = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'SyllabusOS/1.0 by SlugHacks2024'
          },
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)

        if (response.ok) {
          const data = await response.json()
          const posts = data.data?.children || []
          if (posts.length > 0) {
            allPosts = [...allPosts, ...posts]
            console.log(`Found ${posts.length} posts for term "${term}"`)
          }
        } else {
          console.warn(`Reddit API returned ${response.status} for term "${term}"`)
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300))
      } catch (err: any) {
        // Don't fail completely on timeout or network errors
        if (err.name !== 'AbortError') {
          console.error(`Error searching Reddit with term "${term}":`, err)
        }
      }
    }

    // If no posts found, try a broader search or use recent posts
    if (allPosts.length === 0) {
      try {
        // Try fetching recent posts from UCSC subreddit and filter client-side
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        
        const response = await fetch(
          `https://www.reddit.com/r/${subreddit}/new.json?limit=50`,
          {
            headers: {
              'User-Agent': 'SyllabusOS/1.0 by SlugHacks2024'
            },
            signal: controller.signal
          }
        )
        
        clearTimeout(timeoutId)

        if (response.ok) {
          const data = await response.json()
          const posts = data.data?.children || []
          // Filter posts that mention the course code
          const courseCodeLower = courseCode.toLowerCase()
          const filtered = posts.filter((post: any) => {
            const title = post.data.title?.toLowerCase() || ''
            const content = post.data.selftext?.toLowerCase() || ''
            return title.includes(courseCodeLower) || content.includes(courseCodeLower)
          })
          allPosts = filtered
          console.log(`Found ${filtered.length} posts from recent posts`)
        }
      } catch (err) {
        console.error('Error fetching recent posts:', err)
      }
    }

    // Remove duplicates by URL
    const uniquePosts = Array.from(
      new Map(allPosts.map((p: any) => [p.data.permalink, p])).values()
    )

    // Process posts to extract feedback
    const processed = processRedditPosts(uniquePosts, courseCode, fullCourseName)
    
    // If no feedback was extracted, enhance with mock data for demo
    if (processed.samplePosts.length === 0 && uniquePosts.length === 0) {
      return getEnhancedDefaultFeedback(courseCode, fullCourseName)
    }
    
    return processed
  } catch (error) {
    console.error('Error scraping Reddit:', error)
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
    'understanding', 'fair', 'caring', 'organized', 'interesting'
  ]
  const negativeKeywords = [
    'hard', 'difficult', 'terrible', 'awful', 'confusing', 'boring', 
    'waste', 'worst', 'hate', 'horrible', 'disorganized', 'unclear',
    'unfair', 'harsh', 'stressful', 'too much', 'overwhelming'
  ]
  
  posts.forEach((post: any) => {
    const title = post.data.title.toLowerCase()
    const content = (post.data.selftext || '').toLowerCase()
    const text = `${title} ${content}`
    
    // Extract difficulty mentions (1-5 scale)
    const difficultyMatches = [
      ...text.matchAll(/difficulty[:\s]+(\d)/gi),
      ...text.matchAll(/rated[:\s]+(\d)/gi),
      ...text.matchAll(/hardness[:\s]+(\d)/gi),
    ]
    difficultyMatches.forEach(match => {
      const level = parseInt(match[1])
      if (level >= 1 && level <= 5) {
        difficulties.push(level)
      }
    })
    
    // Extract rating mentions
    const ratingMatches = [
      ...text.matchAll(/rating[:\s]+(\d)/gi),
      ...text.matchAll(/professor[:\s]+(\d)/gi),
      ...text.matchAll(/rate[:\s]+(\d)/gi),
    ]
    ratingMatches.forEach(match => {
      const rating = parseInt(match[1])
      if (rating >= 1 && rating <= 5) {
        ratings.push(rating)
      }
    })
    
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
    
    const contentText = post.data.selftext || post.data.title
    
    if (positiveCount > negativeCount && contentText.length > 30) {
      positiveFeedback.push(contentText.substring(0, 300))
    } else if (negativeCount > positiveCount && contentText.length > 30) {
      negativeFeedback.push(contentText.substring(0, 300))
    }
    
    // Add to sample posts
    if (contentText.length > 50) {
      samplePosts.push({
        title: post.data.title,
        content: post.data.selftext || post.data.title,
        upvotes: post.data.ups || 0,
        url: `https://reddit.com${post.data.permalink}`,
        subreddit: post.data.subreddit,
        created: post.data.created_utc
      })
    }
  })
  
  // Calculate averages
  const avgDifficulty = difficulties.length > 0
    ? difficulties.reduce((a, b) => a + b, 0) / difficulties.length
    : 3.0
  
  const avgRating = ratings.length > 0
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length
    : 3.5
  
  // Normalize grade distribution (BerkeleyTime format)
  const gradeDistribution = normalizeGradeDistribution(gradeCounts, samplePosts.length)
  
  // Calculate total enrollment (estimate)
  const totalEnrollment = Object.values(gradeDistribution).reduce((a, b) => a + b, 0) || 150
  
  // Calculate average GPA
  const gpaMap: { [key: string]: number } = {
    'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'D-': 0.7, 'F': 0.0
  }
  let totalPoints = 0
  let totalCredits = 0
  Object.entries(gradeDistribution).forEach(([grade, count]) => {
    if (gpaMap[grade] !== undefined && count > 0) {
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
    totalEnrollment,
    averageGPA: Math.round(averageGPA * 100) / 100
  }
}

function normalizeGradeDistribution(
  gradeCounts: { [key: string]: number },
  postCount: number
): CourseFeedback['gradeDistribution'] {
  // If we have actual data, use it
  if (Object.keys(gradeCounts).length > 0) {
    const total = Object.values(gradeCounts).reduce((a, b) => a + b, 0)
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
  
  // Default distribution (typical UCSC course) - BerkeleyTime style
  return {
    'A': 28,
    'A-': 12,
    'B+': 15,
    'B': 18,
    'B-': 8,
    'C+': 6,
    'C': 5,
    'C-': 2,
    'D+': 2,
    'D': 2,
    'D-': 1,
    'F': 1,
    'P': 0,
    'NP': 0,
    'W': 0
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
  // Enhanced mock data for demo purposes when Reddit doesn't return results
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
      count: 12
    },
    positiveFeedback: [
      isHardCourse 
        ? "Great professor who really explains the concepts well. Office hours are super helpful and the assignments prepare you well for exams."
        : "Clear explanations and fair grading. The professor is approachable and really cares about student success.",
      "The course material is well-organized and the lectures are engaging. Would definitely recommend taking this class.",
      "Professor provides great feedback and the course structure makes sense. The workload is manageable if you stay on top of it."
    ],
    negativeFeedback: isHardCourse ? [
      "The course can be challenging, especially the programming assignments. Make sure to start early and attend office hours.",
      "Some concepts are taught quickly. The textbook is essential for understanding everything thoroughly."
    ] : [
      "The midterm was harder than expected. Make sure to review all the practice problems.",
      "Sometimes the lectures move too fast. Reading ahead helps."
    ],
    gradeDistribution: isHardCourse ? {
      'A': 22, 'A-': 10, 'B+': 14, 'B': 20, 'B-': 12,
      'C+': 8, 'C': 6, 'C-': 3, 'D+': 2, 'D': 2, 'D-': 1,
      'F': 0, 'P': 0, 'NP': 0, 'W': 0
    } : {
      'A': 32, 'A-': 15, 'B+': 18, 'B': 18, 'B-': 8,
      'C+': 4, 'C': 3, 'C-': 1, 'D+': 1, 'D': 0, 'D-': 0,
      'F': 0, 'P': 0, 'NP': 0, 'W': 0
    },
    samplePosts: [
      {
        title: `Anyone taken ${courseCode}?`,
        content: `Thinking about taking this class next quarter. How's the workload and difficulty? Any tips for success?`,
        upvotes: 15,
        url: `https://reddit.com/r/UCSC/comments/example`,
        subreddit: 'UCSC',
        created: Date.now() / 1000 - 86400 * 7 // 7 days ago
      },
      {
        title: `${courseCode} study group?`,
        content: `Looking to form a study group for this class. The material is challenging but the professor is helpful.`,
        upvotes: 8,
        url: `https://reddit.com/r/UCSC/comments/example2`,
        subreddit: 'UCSC',
        created: Date.now() / 1000 - 86400 * 3 // 3 days ago
      }
    ],
    totalEnrollment: isHardCourse ? 180 : 150,
    averageGPA: isHardCourse ? 3.1 : 3.4
  }
}
