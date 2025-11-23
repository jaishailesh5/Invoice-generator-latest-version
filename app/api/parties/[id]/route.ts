import { type NextRequest, NextResponse } from "next/server"
import { getPartyById, updateParty, deleteParty } from "@/lib/data/parties"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    console.log(`API: Fetching party with ID: ${id}`)

    const party = await getPartyById(id)

    if (!party) {
      return NextResponse.json({ success: false, message: "Party not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, party })
  } catch (error) {
    console.error(`Error fetching party ${params.id}:`, error)
    return NextResponse.json(
      {
        success: false,
        message: `Failed to fetch party: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    console.log(`API: Updating party with ID: ${id}`)

    const updates = await request.json()

    // Verify party exists
    const existingParty = await getPartyById(id)
    if (!existingParty) {
      return NextResponse.json({ success: false, message: "Party not found" }, { status: 404 })
    }

    const result = await updateParty(id, updates)
    return NextResponse.json({ success: true, party: result })
  } catch (error) {
    console.error(`Error updating party ${params.id}:`, error)
    return NextResponse.json(
      {
        success: false,
        message: `Failed to update party: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    console.log(`API: Deleting party with ID: ${id}`)

    const result = await deleteParty(id)
    console.log(`Delete party result:`, result)

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: "Party deleted successfully" })
  } catch (error) {
    console.error(`Error deleting party ${params.id}:`, error)
    return NextResponse.json(
      {
        success: false,
        message: `Failed to delete party: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    )
  }
}
