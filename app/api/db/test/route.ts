import { NextResponse } from "next/server"
import { testDbConnection } from "@/lib/db"
import fs from "fs"
import path from "path"

export async function GET() {
  try {
    // Actually test the database connection
    const dbResult = await testDbConnection()

    // Get additional system information
    const systemInfo = {
      cwd: process.cwd(),
      nodeVersion: process.version,
      platform: process.platform,
      env: {
        DB_PATH: process.env.DB_PATH || "not set",
        NODE_ENV: process.env.NODE_ENV || "not set",
      },
    }

    // Check directory permissions
    const dataDir = process.env.DB_PATH || path.join("c:/project/invoice-generator/app/data")
    let dirInfo = {}

    try {
      const stats = fs.statSync(dataDir)
      dirInfo = {
        exists: true,
        isDirectory: stats.isDirectory(),
        permissions: stats.mode.toString(8),
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
      }

      // Try to write a test file
      const testFile = path.join(dataDir, `test-write-${Date.now()}.tmp`)
      fs.writeFileSync(testFile, "test")
      fs.unlinkSync(testFile)
      dirInfo = { ...dirInfo, writable: true }
    } catch (error) {
      dirInfo = {
        ...dirInfo,
        error: error instanceof Error ? error.message : String(error),
        writable: false,
      }
    }

    return NextResponse.json({
      ...dbResult,
      systemInfo,
      dirInfo,
    })
  } catch (error) {
    console.error("Database test error:", error)
    return NextResponse.json(
      {
        success: false,
        message: `Database test failed: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error.stack : String(error),
      },
      { status: 500 },
    )
  }
}
