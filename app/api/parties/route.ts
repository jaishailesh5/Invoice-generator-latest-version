import { NextResponse } from "next/server"
import { getParties, createParty } from "@/lib/data/parties"
import type { Party } from "@/lib/data/parties"

export async function GET() {
  try {
    console.log("API: Fetching all parties from database")
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

export async function POST(request: Request) {
  try {
    const party = (await request.json()) as Omit<Party, "created_at" | "updated_at">
    console.log("API: Creating new party:", party)

    if (!party.name || !party.type) {
      return NextResponse.json({ success: false, message: "Name and type are required" }, { status: 400 })
    }

    const newParty = await createParty(party)
    return NextResponse.json({ success: true, party: newParty })
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
