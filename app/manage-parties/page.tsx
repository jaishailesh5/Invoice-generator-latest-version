"use client"

import type React from "react"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Pencil, Trash2, AlertCircle, Database, RefreshCw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface Party {
  id: string
  name: string
  address: string
  type: "vendor" | "client" | "referral"
}

interface DbStatus {
  isConnected: boolean
  message: string
  error?: string
}

export default function ManageParties() {
  const [parties, setParties] = useState<Party[]>([])
  const [activeTab, setActiveTab] = useState<"vendor" | "client" | "referral">("vendor")
  const [vendorForm, setVendorForm] = useState({ id: "", name: "", address: "" })
  const [clientForm, setClientForm] = useState({ id: "", name: "", address: "" })
  const [referralForm, setReferralForm] = useState({ id: "", name: "", address: "" })
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [dbStatus, setDbStatus] = useState<DbStatus>({ isConnected: false, message: "Checking database connection..." })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)

  // Initialize database and load parties
  useEffect(() => {
    async function initialize() {
      setIsLoading(true)

      try {
        // Always load from localStorage first for immediate UI display
        let storedParties: Party[] = []
        try {
          storedParties = JSON.parse(localStorage.getItem("parties") || "[]")
          setParties(storedParties)
        } catch (localStorageError) {
          console.error("Error loading from localStorage:", localStorageError)
          setParties([])
        }

        // Try to check database connection status
        try {
          const response = await fetch("/api/db/test")

          if (!response.ok) {
            throw new Error(`Server error: ${response.status} ${response.statusText}`)
          }

          const result = await response.json()

          if (result.success) {
            setDbStatus({
              isConnected: true,
              message: `Connected to SQLite database at ${result.path || "unknown path"}`,
            })

            // Only try to load from database if connection is successful
            try {
              const partiesResponse = await fetch("/api/parties")

              if (partiesResponse.ok) {
                const partiesData = await partiesResponse.json()

                if (partiesData.success && Array.isArray(partiesData.parties)) {
                  setParties(partiesData.parties)
                  console.log("Loaded parties from database:", partiesData.parties)

                  // Update localStorage with database data
                  localStorage.setItem("parties", JSON.stringify(partiesData.parties))
                }
              }
            } catch (loadError) {
              console.error("Error loading parties from database:", loadError)
              // Keep using the localStorage data we already loaded
            }
          } else {
            // Database connection failed
            setDbStatus({
              isConnected: false,
              message: result.message || "Database connection failed",
              error: result.error || "Unknown error",
            })

            // Already using localStorage data
            console.log("Using localStorage data due to database connection failure")
          }
        } catch (connectionError) {
          console.error("Error checking database connection:", connectionError)
          setDbStatus({
            isConnected: false,
            message: "Database connection error",
            error: connectionError instanceof Error ? connectionError.message : String(connectionError),
          })

          // Already using localStorage data
          console.log("Using localStorage data due to connection error")
        }
      } catch (error) {
        console.error("Error in initialization:", error)
        setDbStatus({
          isConnected: false,
          message: "Initialization error",
          error: error instanceof Error ? error.message : String(error),
        })

        // Ensure we have empty parties array if all else fails
        setParties([])
      } finally {
        setIsLoading(false)
      }
    }

    initialize()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    switch (activeTab) {
      case "vendor":
        setVendorForm((prev) => ({ ...prev, [name]: value }))
        break
      case "client":
        setClientForm((prev) => ({ ...prev, [name]: value }))
        break
      case "referral":
        setReferralForm((prev) => ({ ...prev, [name]: value }))
        break
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      // Get the current form data based on active tab
      const currentForm = activeTab === "vendor" ? vendorForm : activeTab === "client" ? clientForm : referralForm

      // Validate form
      if (!currentForm.name || !currentForm.address) {
        toast.destructive({
          title: "Error",
          description: "Please fill in all fields",
        })
        setIsSaving(false)
        return
      }

      let newParty: Party
      let updatedParties: Party[]

      if (isEditing) {
        // Update existing party
        newParty = {
          id: currentForm.id,
          name: currentForm.name,
          address: currentForm.address,
          type: activeTab,
        }

        updatedParties = parties.map((party) => (party.id === currentForm.id ? newParty : party))
      } else {
        // Create new party
        newParty = {
          id: Date.now().toString(),
          name: currentForm.name,
          address: currentForm.address,
          type: activeTab,
        }

        updatedParties = [...parties, newParty]
      }

      // Always save to localStorage first
      localStorage.setItem("parties", JSON.stringify(updatedParties))
      setParties(updatedParties)

      // Try to save to database if connected
      if (dbStatus.isConnected) {
        try {
          const url = isEditing ? `/api/parties/${currentForm.id}` : "/api/parties"
          const method = isEditing ? "PUT" : "POST"

          const response = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newParty),
          })

          if (!response.ok) {
            throw new Error(`Server error: ${response.status} ${response.statusText}`)
          }

          console.log(`Party ${isEditing ? "updated in" : "saved to"} database successfully`)
        } catch (dbError) {
          console.error(`Error ${isEditing ? "updating" : "creating"} party in database:`, dbError)
          toast({
            title: "Warning",
            description: `Party saved in local storage but database ${isEditing ? "update" : "save"} failed`,
            variant: "destructive",
          })
        }
      }

      toast.default({
        title: "Success",
        description: `${activeTab === "vendor" ? "Vendor" : activeTab === "client" ? "Client" : "Referral"} ${
          isEditing ? "updated" : "created"
        } successfully`,
      })

      // Reset form
      resetForm()
    } catch (error) {
      console.error("Error saving party:", error)
      toast.destructive({
        title: "Error",
        description: "Failed to save. Please try again.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (party: Party) => {
    const formData = {
      id: party.id,
      name: party.name,
      address: party.address,
    }

    switch (party.type) {
      case "vendor":
        setVendorForm(formData)
        break
      case "client":
        setClientForm(formData)
        break
      case "referral":
        setReferralForm(formData)
        break
    }

    setIsEditing(true)
    setActiveTab(party.type)
  }

  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(id)

      // Update local state immediately for better UX
      const updatedParties = parties.filter((party) => party.id !== id)
      localStorage.setItem("parties", JSON.stringify(updatedParties))
      setParties(updatedParties)

      // Try to delete from database if connected
      if (dbStatus.isConnected) {
        try {
          const response = await fetch(`/api/parties/${id}`, {
            method: "DELETE",
          })

          if (!response.ok) {
            throw new Error(`Server error: ${response.status} ${response.statusText}`)
          }

          console.log("Party deleted from database successfully")
        } catch (dbError) {
          console.error("Error deleting party from database:", dbError)
          toast({
            title: "Warning",
            description: "Party removed from UI but database deletion failed",
            variant: "destructive",
          })
        }
      }

      toast.default({
        title: "Deleted",
        description: "Party has been removed from the system",
      })
    } catch (error) {
      console.error("Error deleting party:", error)
      toast.destructive({
        title: "Error",
        description: `Failed to delete: ${error instanceof Error ? error.message : String(error)}`,
      })
    } finally {
      setIsDeleting(null)
    }
  }

  const resetForm = () => {
    setVendorForm({ id: "", name: "", address: "" })
    setClientForm({ id: "", name: "", address: "" })
    setReferralForm({ id: "", name: "", address: "" })
    setIsEditing(false)
  }

  const initializeDatabase = async () => {
    setIsInitializing(true)

    try {
      const response = await fetch("/api/db/init", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success) {
        toast.default({
          title: "Success",
          description: "Database initialized successfully",
        })

        // Refresh the page to reload everything
        window.location.reload()
      } else {
        throw new Error(result.message || "Failed to initialize database")
      }
    } catch (error) {
      console.error("Error initializing database:", error)
      toast.destructive({
        title: "Error",
        description: `Failed to initialize database: ${error instanceof Error ? error.message : String(error)}`,
      })
    } finally {
      setIsInitializing(false)
    }
  }

  const filteredParties = parties.filter((party) => party.type === activeTab)

  const getPartyTypeName = (type: "vendor" | "client" | "referral") => {
    switch (type) {
      case "vendor":
        return "Vendor"
      case "client":
        return "Client"
      case "referral":
        return "Referral"
      default:
        return type
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <h2 className="mt-4 text-xl font-semibold">Loading...</h2>
          <p className="text-muted-foreground">Checking database connection and loading data</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Manage Vendors, Clients & Referrals</h1>
        <Link href="/">
          <Button variant="outline">Back to Home</Button>
        </Link>
      </div>

      <Alert className="mb-6" variant={dbStatus.isConnected ? "default" : "destructive"}>
        {dbStatus.isConnected ? <Database className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
        <AlertTitle>{dbStatus.isConnected ? "Database Connected" : "Database Disconnected"}</AlertTitle>
        <AlertDescription>
          {dbStatus.message}
          {!dbStatus.isConnected && dbStatus.error && <div className="mt-2 text-sm font-mono">{dbStatus.error}</div>}
          {!dbStatus.isConnected && (
            <div className="mt-2 flex items-center gap-2">
              <span>Changes will be saved to browser local storage only. Try initializing the database:</span>
              <Button size="sm" onClick={initializeDatabase} disabled={isInitializing} className="h-7 px-2">
                {isInitializing ? (
                  <>
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-1 h-3 w-3" />
                    Initialize DB
                  </>
                )}
              </Button>
            </div>
          )}
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Add New {getPartyTypeName(activeTab)}</CardTitle>
            <CardDescription>
              Enter details to add a new {getPartyTypeName(activeTab).toLowerCase()} to the system
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <Tabs
                value={activeTab}
                onValueChange={(value) => {
                  setActiveTab(value as "vendor" | "client" | "referral")
                  // If we were editing, reset editing mode when changing tabs
                  if (isEditing) {
                    setIsEditing(false)
                  }
                }}
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="vendor">Vendor</TabsTrigger>
                  <TabsTrigger value="client">Client</TabsTrigger>
                  <TabsTrigger value="referral">Referral</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="space-y-2">
                <Label htmlFor="name">{getPartyTypeName(activeTab)} Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={
                    activeTab === "vendor"
                      ? vendorForm.name
                      : activeTab === "client"
                        ? clientForm.name
                        : referralForm.name
                  }
                  onChange={handleChange}
                  placeholder={
                    activeTab === "vendor"
                      ? "ABC Consulting"
                      : activeTab === "client"
                        ? "XYZ Corporation"
                        : "Referral Partners Inc."
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  name="address"
                  value={
                    activeTab === "vendor"
                      ? vendorForm.address
                      : activeTab === "client"
                        ? clientForm.address
                        : referralForm.address
                  }
                  onChange={handleChange}
                  placeholder="123 Main Street&#10;City, State 12345"
                  rows={4}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              {isEditing && (
                <Button type="button" variant="outline" onClick={resetForm} disabled={isSaving}>
                  Cancel
                </Button>
              )}
              <Button type="submit" className={isEditing ? "" : "w-full"} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    {isEditing ? "Update" : "Add"} {getPartyTypeName(activeTab)}
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{getPartyTypeName(activeTab)} List</CardTitle>
            <CardDescription>
              Manage your {activeTab === "vendor" ? "vendors" : activeTab === "client" ? "clients" : "referrals"} and
              their details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "vendor" | "client" | "referral")}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="vendor">Vendors</TabsTrigger>
                <TabsTrigger value="client">Clients</TabsTrigger>
                <TabsTrigger value="referral">Referrals</TabsTrigger>
              </TabsList>
            </Tabs>

            {filteredParties.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <p>
                  No {activeTab === "vendor" ? "vendors" : activeTab === "client" ? "clients" : "referrals"} found. Add
                  your first one to get started.
                </p>
              </div>
            ) : (
              <Table className="mt-4">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredParties.map((party) => (
                    <TableRow key={party.id}>
                      <TableCell className="font-medium">{party.name}</TableCell>
                      <TableCell className="whitespace-pre-line">{party.address}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(party)} title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(party.id)}
                            title="Delete"
                            className="text-destructive hover:text-destructive"
                            disabled={isDeleting === party.id}
                          >
                            {isDeleting === party.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
