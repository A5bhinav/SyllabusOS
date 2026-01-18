import { parse } from 'csv-parse/sync'
import ExcelJS from 'exceljs'
import type { ScheduleEntry } from '../../types/api'

export interface ParsedScheduleResult {
  entries: ScheduleEntry[]
  errors: string[]
}

/**
 * Detect file format from file name or buffer
 */
export function detectFileFormat(fileName: string): 'csv' | 'excel' | 'unknown' {
  const extension = fileName.toLowerCase().split('.').pop()
  
  if (extension === 'csv') {
    return 'csv'
  } else if (extension === 'xlsx' || extension === 'xls') {
    return 'excel'
  }
  
  return 'unknown'
}

/**
 * Parse CSV schedule file
 */
export function parseCSVSchedule(
  csvContent: string | Buffer,
  fileName: string
): ParsedScheduleResult {
  const errors: string[] = []
  const entries: ScheduleEntry[] = []
  
  try {
    const records = parse(csvContent, {
      columns: true, // Use first line as column headers
      skip_empty_lines: true,
      trim: true,
    })
    
    for (const record of records as Record<string, any>[]) {
      try {
        // Try to find week number column (case-insensitive)
        const weekKey = Object.keys(record).find(
          key => key.toLowerCase().includes('week') || key.toLowerCase() === 'week_number'
        ) || 'week'
        
        const weekNumber = parseInt(record[weekKey] || record.week || record.Week || record['Week Number'], 10)
        
        if (isNaN(weekNumber)) {
          errors.push(`Invalid week number in row: ${JSON.stringify(record)}`)
          continue
        }
        
        // Try to find topic column (case-insensitive)
        const topicKey = Object.keys(record).find(
          key => key.toLowerCase().includes('topic') || key.toLowerCase() === 'topic'
        ) || 'topic'
        
        const topic = record[topicKey] || record.topic || record.Topic || ''
        
        if (!topic) {
          errors.push(`Missing topic in row: ${JSON.stringify(record)}`)
          continue
        }
        
        // Try to find assignments column (optional)
        const assignmentsKey = Object.keys(record).find(
          key => key.toLowerCase().includes('assignment') || key.toLowerCase() === 'assignments'
        )
        const assignments = assignmentsKey ? record[assignmentsKey] : null
        
        // Try to find readings column (optional)
        const readingsKey = Object.keys(record).find(
          key => key.toLowerCase().includes('reading') || key.toLowerCase() === 'readings'
        )
        const readings = readingsKey ? record[readingsKey] : null
        
        // Try to find due date column (optional)
        const dueDateKey = Object.keys(record).find(
          key => key.toLowerCase().includes('due') || key.toLowerCase().includes('date')
        )
        const dueDate = dueDateKey ? record[dueDateKey] : null
        
        entries.push({
          weekNumber,
          topic: topic.trim(),
          assignments: assignments ? assignments.trim() : null,
          readings: readings ? readings.trim() : null,
          dueDate: dueDate ? dueDate.trim() : null,
        })
      } catch (error) {
        errors.push(`Error parsing row: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  } catch (error) {
    errors.push(`Failed to parse CSV: ${error instanceof Error ? error.message : String(error)}`)
  }
  
  return { entries, errors }
}

/**
 * Parse Excel schedule file
 */
export async function parseExcelSchedule(
  excelBuffer: Buffer,
  fileName: string
): Promise<ParsedScheduleResult> {
  const errors: string[] = []
  const entries: ScheduleEntry[] = []
  
  try {
    const workbook = new ExcelJS.Workbook()
    // ExcelJS accepts Buffer, ArrayBuffer, or Uint8Array
    // Use type assertion to work around TypeScript strict typing
    await workbook.xlsx.load(excelBuffer as any)
    
    // Get the first sheet
    const worksheet = workbook.worksheets[0]
    if (!worksheet) {
      errors.push('Excel file has no sheets')
      return { entries, errors }
    }
    
    // Convert worksheet to JSON array
    const data: Record<string, any>[] = []
    const headers: string[] = []
    
    // Get headers from first row
    worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
      headers[colNumber - 1] = cell.value ? String(cell.value) : ''
    })
    
    // Get data rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return // Skip header row
      
      const record: Record<string, any> = {}
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const header = headers[colNumber - 1] || ''
        record[header] = cell.value ? String(cell.value) : ''
      })
      data.push(record)
    })
    
    for (const record of data) {
      try {
        // Try to find week number column (case-insensitive)
        const weekKey = Object.keys(record).find(
          key => key.toLowerCase().includes('week') || key.toLowerCase() === 'week_number'
        ) || 'week'
        
        const weekNumber = parseInt(
          record[weekKey] || record.week || record.Week || record['Week Number'] || record['week_number'],
          10
        )
        
        if (isNaN(weekNumber)) {
          errors.push(`Invalid week number in row: ${JSON.stringify(record)}`)
          continue
        }
        
        // Try to find topic column (case-insensitive)
        const topicKey = Object.keys(record).find(
          key => key.toLowerCase().includes('topic') || key.toLowerCase() === 'topic'
        ) || 'topic'
        
        const topic = record[topicKey] || record.topic || record.Topic || ''
        
        if (!topic) {
          errors.push(`Missing topic in row: ${JSON.stringify(record)}`)
          continue
        }
        
        // Try to find assignments column (optional)
        const assignmentsKey = Object.keys(record).find(
          key => key.toLowerCase().includes('assignment') || key.toLowerCase() === 'assignments'
        )
        const assignments = assignmentsKey ? record[assignmentsKey] : null
        
        // Try to find readings column (optional)
        const readingsKey = Object.keys(record).find(
          key => key.toLowerCase().includes('reading') || key.toLowerCase() === 'readings'
        )
        const readings = readingsKey ? record[readingsKey] : null
        
        // Try to find due date column (optional)
        const dueDateKey = Object.keys(record).find(
          key => key.toLowerCase().includes('due') || key.toLowerCase().includes('date')
        )
        const dueDate = dueDateKey ? record[dueDateKey] : null
        
        entries.push({
          weekNumber,
          topic: String(topic).trim(),
          assignments: assignments ? String(assignments).trim() : null,
          readings: readings ? String(readings).trim() : null,
          dueDate: dueDate ? String(dueDate).trim() : null,
        })
      } catch (error) {
        errors.push(`Error parsing row: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  } catch (error) {
    errors.push(`Failed to parse Excel file: ${error instanceof Error ? error.message : String(error)}`)
  }
  
  return { entries, errors }
}

/**
 * Parse schedule file (CSV or Excel)
 */
export async function parseScheduleFile(
  file: File
): Promise<ParsedScheduleResult> {
  const format = detectFileFormat(file.name)
  
  if (format === 'unknown') {
    return {
      entries: [],
      errors: [`Unsupported file format: ${file.name}. Supported formats: CSV, XLSX, XLS`],
    }
  }
  
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  
  if (format === 'csv') {
    const csvContent = buffer.toString('utf-8')
    return parseCSVSchedule(csvContent, file.name)
  } else {
    return await parseExcelSchedule(buffer, file.name)
  }
}

