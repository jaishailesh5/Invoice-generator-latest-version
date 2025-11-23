/**
 * Date utilities for the invoice generator
 * This file contains all date-related functions used throughout the application
 */

// Define the Chicago timezone constant
export const CHICAGO_TIMEZONE = "America/Chicago"

/**
 * Get current date in Chicago timezone as YYYY-MM-DD
 * Uses a direct approach with Intl.DateTimeFormat
 */
export function getChicagoDate(): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: CHICAGO_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })

    const parts = formatter.formatToParts(new Date())

    const year = parts.find((p) => p.type === "year")?.value
    const month = parts.find((p) => p.type === "month")?.value
    const day = parts.find((p) => p.type === "day")?.value

    if (!year || !month || !day) {
      console.error("Failed to parse Chicago date parts")
      // Fallback to direct method
      const now = new Date()
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
    }

    return `${year}-${month}-${day}`
  } catch (error) {
    console.error("Error in getChicagoDate:", error)
    // Fallback to direct method
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  }
}

/**
 * For compatibility with existing code, maintain getCurrentDate as an alias
 */
export function getCurrentDate(): string {
  return getChicagoDate()
}

/**
 * Format a date string from YYYY-MM-DD to MM/DD/YYYY
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return ""

  try {
    // Check if the string matches YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      // Add noon time to avoid timezone shifts
      const dateWithTime = `${dateString}T12:00:00`
      const date = new Date(dateWithTime)
      const month = String(date.getMonth() + 1).padStart(2, "0")
      const day = String(date.getDate()).padStart(2, "0")
      const year = date.getFullYear()
      return `${month}/${day}/${year}`
    }

    // If it's already in MM/DD/YYYY format, return as is
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
      return dateString
    }

    // Try to parse as a date
    const date = new Date(dateString)
    if (!isNaN(date.getTime())) {
      return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}/${date.getFullYear()}`
    }

    // If all else fails, return the original string
    return dateString
  } catch (error) {
    console.error("Error formatting date for display:", error)
    return dateString || "" // Return original if parsing fails
  }
}

/**
 * Parse a date string in YYYY-MM-DD format
 */
export function parseDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null

  try {
    // If it's in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split("-")
      // Note: month is 0-indexed in JavaScript Date
      return new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))
    }

    // If it's in MM/DD/YYYY format
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
      const [month, day, year] = dateString.split("/")
      return new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))
    }

    // Try direct parsing
    const date = new Date(dateString)
    if (!isNaN(date.getTime())) {
      return date
    }

    return null
  } catch (error) {
    console.error("Error parsing date:", error)
    return null
  }
}

/**
 * Format a date for database storage (YYYY-MM-DD)
 */
export function formatDateForStorage(date: Date | string | null | undefined): string {
  if (!date) return ""

  try {
    if (typeof date === "string") {
      // If already in YYYY-MM-DD format, return as is
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date
      }

      // If in MM/DD/YYYY format, convert to YYYY-MM-DD
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(date)) {
        const [month, day, year] = date.split("/")
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
      }

      // Otherwise, parse it first
      date = new Date(date)
      if (isNaN(date.getTime())) {
        return ""
      }
    }

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")

    return `${year}-${month}-${day}`
  } catch (error) {
    console.error("Error formatting date for storage:", error)
    return ""
  }
}

/**
 * Get the first day of a month in YYYY-MM-DD format
 */
export function getFirstDayOfMonthISO(year: number, month: number): string {
  try {
    // Month is 1-based in our parameters but 0-based in Date constructor
    const date = new Date(year, month - 1, 1)
    return formatDateForStorage(date)
  } catch (error) {
    console.error("Error getting first day of month:", error)
    return ""
  }
}

/**
 * Get the last day of a month in YYYY-MM-DD format
 */
export function getLastDayOfMonthISO(year: number, month: number): string {
  try {
    // Create date for the first day of the next month, then subtract one day
    const date = new Date(year, month, 0)
    return formatDateForStorage(date)
  } catch (error) {
    console.error("Error getting last day of month:", error)
    return ""
  }
}

/**
 * Get Chicago date in ISO format (YYYY-MM-DD)
 */
export function getChicagoDateISO(): string {
  return getChicagoDate()
}

/**
 * Get month name from month number (1-12)
 */
export function getMonthName(month: number): string {
  try {
    const date = new Date(2000, month - 1, 1)
    return date.toLocaleString("default", { month: "long" })
  } catch (error) {
    console.error("Error getting month name:", error)
    return `Month ${month}`
  }
}

/**
 * Create a service period object for a given month and year
 */
export function createServicePeriod(month: number, year: number): { month: string; start: string; end: string } {
  try {
    const monthName = getMonthName(month)
    const start = getFirstDayOfMonthISO(year, month)
    const end = getLastDayOfMonthISO(year, month)

    return {
      month: `${monthName} ${year}`,
      start,
      end,
    }
  } catch (error) {
    console.error("Error creating service period:", error)
    return {
      month: `${month}/${year}`,
      start: "",
      end: "",
    }
  }
}

/**
 * Debug function to log date information
 */
export function debugDateInfo(): void {
  console.log("=== DATE DEBUG INFO ===")
  console.log("Browser timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone)
  console.log("Current local date:", new Date().toString())
  console.log("Current local ISO:", new Date().toISOString())

  console.log("Chicago date:", getChicagoDate())
  console.log("Chicago date ISO:", getChicagoDateISO())

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  console.log("First day of current month:", getFirstDayOfMonthISO(year, month))
  console.log("Last day of current month:", getLastDayOfMonthISO(year, month))
  console.log("=== END DEBUG INFO ===")
}

/**
 * Validate all date functions
 */
export function validateDateFunctions(): { success: boolean; results: Record<string, any> } {
  const results: Record<string, any> = {}
  let success = true

  try {
    // Test getChicagoDate
    const chicagoDate = getChicagoDate()
    results.getChicagoDate = {
      value: chicagoDate,
      valid: /^\d{4}-\d{2}-\d{2}$/.test(chicagoDate),
    }
    if (!results.getChicagoDate.valid) success = false

    // Test formatDate
    const formattedDate = formatDate("2023-01-15")
    results.formatDate = {
      value: formattedDate,
      valid: formattedDate === "01/15/2023",
    }
    if (!results.formatDate.valid) success = false

    // Test parseDate
    const parsedDate = parseDate("2023-01-15")
    results.parseDate = {
      value: parsedDate?.toISOString(),
      valid: parsedDate?.getFullYear() === 2023 && parsedDate?.getMonth() === 0 && parsedDate?.getDate() === 15,
    }
    if (!results.parseDate.valid) success = false

    // Test formatDateForStorage
    const storedDate = formatDateForStorage(new Date(2023, 0, 15))
    results.formatDateForStorage = {
      value: storedDate,
      valid: storedDate === "2023-01-15",
    }
    if (!results.formatDateForStorage.valid) success = false

    // Test getFirstDayOfMonthISO
    const firstDay = getFirstDayOfMonthISO(2023, 1)
    results.getFirstDayOfMonthISO = {
      value: firstDay,
      valid: firstDay === "2023-01-01",
    }
    if (!results.getFirstDayOfMonthISO.valid) success = false

    // Test getLastDayOfMonthISO
    const lastDay = getLastDayOfMonthISO(2023, 1)
    results.getLastDayOfMonthISO = {
      value: lastDay,
      valid: lastDay === "2023-01-31",
    }
    if (!results.getLastDayOfMonthISO.valid) success = false

    // Test getMonthName
    const monthName = getMonthName(1)
    results.getMonthName = {
      value: monthName,
      valid: monthName === "January",
    }
    if (!results.getMonthName.valid) success = false

    // Test createServicePeriod
    const period = createServicePeriod(1, 2023)
    results.createServicePeriod = {
      value: period,
      valid: period.month === "January 2023" && period.start === "2023-01-01" && period.end === "2023-01-31",
    }
    if (!results.createServicePeriod.valid) success = false
  } catch (error) {
    console.error("Error validating date functions:", error)
    success = false
    results.error = {
      value: error instanceof Error ? error.message : String(error),
      valid: false,
    }
  }

  return { success, results }
}

/**
 * Get current date in Chicago timezone as a formatted string
 * @param options - Intl.DateTimeFormatOptions
 * @returns string
 */
export function getChicagoDateString(options: Intl.DateTimeFormatOptions): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: CHICAGO_TIMEZONE,
      ...options,
    })

    return formatter.format(new Date())
  } catch (error) {
    console.error("Error in getChicagoDateString:", error)
    return new Date().toLocaleDateString()
  }
}

/**
 * Format a date string ensuring timezone consistency
 * This prevents date shifts when converting between formats
 */
export function formatDateConsistent(dateString: string | null | undefined): string {
  if (!dateString) return ""

  try {
    // If the date doesn't have a time component, add noon to avoid timezone shifts
    const dateWithTime = dateString.includes("T") ? dateString : `${dateString}T12:00:00`
    const date = new Date(dateWithTime)

    if (isNaN(date.getTime())) {
      return dateString
    }

    // Use direct year/month/day extraction to avoid timezone issues
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")

    return `${month}/${day}/${year}`
  } catch (error) {
    console.error("Error in formatDateConsistent:", error)
    return dateString || ""
  }
}
