/**
 * Utility to cache professor course queries
 * Reduces redundant database queries across API routes
 */

let courseCache: Map<string, { courses: Array<{ id: string }>; timestamp: number }> = new Map()
const CACHE_TTL = 60 * 1000 // 60 seconds
const MAX_CACHE_SIZE = 100 // Prevent unbounded memory growth

/**
 * Prune cache to prevent unbounded growth
 * Remove oldest entries when cache exceeds max size
 */
function pruneCache() {
  if (courseCache.size <= MAX_CACHE_SIZE) return

  // Sort by timestamp and remove oldest entries
  const entries = Array.from(courseCache.entries())
    .sort((a, b) => a[1].timestamp - b[1].timestamp)

  // Remove oldest 25% of entries
  const removeCount = Math.floor(MAX_CACHE_SIZE * 0.25)
  for (let i = 0; i < removeCount; i++) {
    courseCache.delete(entries[i][0])
  }
}

export async function getProfessorCourses(
  supabase: any,
  professorId: string,
  courseId?: string | null
): Promise<{ courseIds: string[] | null; singleCourse?: { id: string } | null }> {
  const cacheKey = `${professorId}-${courseId || 'all'}`
  const cached = courseCache.get(cacheKey)
  const now = Date.now()

  // Return cached result if still valid
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    if (courseId) {
      const course = cached.courses.find(c => c.id === courseId)
      return { courseIds: course ? [course.id] : null, singleCourse: course || null }
    }
    return { courseIds: cached.courses.map(c => c.id) }
  }

  // Fetch from database
  let query = supabase
    .from('courses')
    .select('id')
    .eq('professor_id', professorId)

  if (courseId) {
    query = query.eq('id', courseId).single()
    const { data: course, error } = await query
    
    if (error || !course) {
      return { courseIds: null, singleCourse: null }
    }
    
    // Cache result
    courseCache.set(cacheKey, { courses: [course], timestamp: now })
    pruneCache()
    return { courseIds: [course.id], singleCourse: course }
  } else {
    const { data: courses, error } = await query
    
    if (error || !courses || courses.length === 0) {
      return { courseIds: null }
    }
    
    // Cache result
    courseCache.set(cacheKey, { courses, timestamp: now })
    pruneCache()
    return { courseIds: courses.map((c: { id: string }) => c.id) }
  }
}

/**
 * Clear cache for a specific professor (useful after course creation/deletion)
 */
export function clearCourseCache(professorId: string) {
  const keysToDelete: string[] = []
  courseCache.forEach((_, key) => {
    if (key.startsWith(`${professorId}-`)) {
      keysToDelete.push(key)
    }
  })
  keysToDelete.forEach(key => courseCache.delete(key))
}

/**
 * Clear all course cache
 */
export function clearAllCourseCache() {
  courseCache.clear()
}

