import { type NextRequest, NextResponse } from "next/server"
import { getParties, createParty } from "@/lib/data/parties"

export async function GET() {
  try {
    const parties = await getParties()
    return NextResponse.json({ success: true, parties })
  } catch (error) {
    console.error("Error fetching parties:", error)
    return NextResponse.json(
      {
        success: false,
        message: `Failed to fetch parties: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const party = await request.json()
    const result = await createParty(party)
    return NextResponse.json({ success: true, party: result })
  } catch (error) {
    console.error("Error creating party:", error)
    return NextResponse.json(
      {
        success: false,
        message: `Failed to create party: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    )
  }
}
