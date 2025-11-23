import { getDb, generateId } from "@/lib/db"

export type Party = {
  id: string
  name: string
  address?: string
  type: "client" | "vendor" | "referral"
  created_at?: string
  updated_at?: string
}

export async function getParties(type?: "client" | "vendor" | "referral"): Promise<Party[]> {
  try {
    console.log(`Fetching parties${type ? ` of type ${type}` : ""}`)
    const db = await getDb()

    let parties: Party[] = []

    if (type) {
      parties = await db.all<Party[]>(`SELECT * FROM parties WHERE type = ? ORDER BY name`, [type])
    } else {
      parties = await db.all<Party[]>(`SELECT * FROM parties ORDER BY type, name`)
    }

    console.log(`Retrieved ${parties.length} parties`)
    return parties
  } catch (error) {
    console.error("Error fetching parties:", error)
    throw new Error(`Failed to fetch parties: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export async function getPartyById(id: string): Promise<Party | null> {
  try {
    console.log(`Fetching party with ID: ${id}`)
    const db = await getDb()

    const party = await db.get<Party>(`SELECT * FROM parties WHERE id = ?`, [id])

    console.log(party ? `Found party: ${party.name}` : `No party found with ID: ${id}`)
    return party
  } catch (error) {
    console.error(`Error fetching party ${id}:`, error)
    throw new Error(`Failed to fetch party: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export async function createParty(party: Omit<Party, "created_at" | "updated_at">): Promise<Party> {
  try {
    console.log(`Creating party: ${party.name} (${party.type})`)
    const db = await getDb()

    const partyId = party.id || generateId()
    console.log(`Using ID: ${partyId}`)

    await db.run(
      `INSERT INTO parties (id, name, address, type)
       VALUES (?, ?, ?, ?)`,
      [partyId, party.name, party.address || null, party.type],
    )

    console.log(`Party created successfully with ID: ${partyId}`)
    return { id: partyId, ...party }
  } catch (error) {
    console.error("Error creating party:", error)
    throw new Error(`Failed to create party: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export async function updateParty(
  id: string,
  updates: Partial<Omit<Party, "id" | "created_at" | "updated_at">>,
): Promise<Party> {
  try {
    console.log(`Updating party with ID: ${id}`, updates)
    const db = await getDb()

    // Build update query
    const fields = Object.keys(updates).filter((key) => updates[key] !== undefined)

    if (fields.length > 0) {
      const setClause = fields.map((field) => `${field} = ?`).join(", ")
      const values = fields.map((field) => updates[field])

      await db.run(
        `UPDATE parties 
         SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [...values, id],
      )
    }

    console.log(`Party updated successfully with ID: ${id}`)

    // Get the updated party
    const updatedParty = await getPartyById(id)
    if (!updatedParty) {
      throw new Error(`Party not found after update: ${id}`)
    }

    return updatedParty
  } catch (error) {
    console.error(`Error updating party ${id}:`, error)
    throw new Error(`Failed to update party: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export async function deleteParty(id: string) {
  try {
    console.log(`Attempting to delete party with ID: ${id}`)
    const db = await getDb()

    // Check if the party exists
    const party = await db.get("SELECT id FROM parties WHERE id = ?", [id])

    if (!party) {
      console.log(`Party with ID ${id} not found in database`)
      return { success: false, message: "Party not found in database" }
    }

    console.log(`Party found, proceeding with deletion`)

    // Delete operation
    const result = await db.run("DELETE FROM parties WHERE id = ?", [id])
    console.log(`Delete result:`, result)

    return {
      success: true,
      message: `Successfully deleted party with ID: ${id}. Changes: ${result.changes}`,
    }
  } catch (error) {
    console.error(`Error deleting party ${id}:`, error)
    return {
      success: false,
      message: `Failed to delete party: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}
