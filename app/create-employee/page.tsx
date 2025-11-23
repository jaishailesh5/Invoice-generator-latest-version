"use client"

import { Checkbox } from "@/components/ui/checkbox"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { AlertCircle, Plus, Trash2, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

// Interface for referral company with fee
interface ReferralWithFee {
  id: string
  name: string
  fee: number
}

// Update the interface for formData to include referrals
interface FormData {
  firstName: string
  lastName: string
  dateOfJoining: string
  billRate: string
  payRate: string
  billToPartyId: string
  referrals: ReferralWithFee[]
  employeeType: "W2-Employee" | "1099-Contractor"
}

// Add an interface for parties
interface Party {
  id: string
  name: string
  address: string
  type: "vendor" | "client" | "referral"
}

export default function CreateEmployee() {
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    dateOfJoining: "",
    billRate: "",
    payRate: "",
    billToPartyId: "",
    referrals: [],
    employeeType: "W2-Employee", // Default to W2-Employee
  })
  const [clients, setClients] = useState<Party[]>([])
  const [referrals, setReferrals] = useState<Party[]>([])
  const [validationError, setValidationError] = useState<string | null>(null)
  const [nextEmployeeNumber, setNextEmployeeNumber] = useState<string>("EMP-0001")
  const [currentReferral, setCurrentReferral] = useState<string>("")
  const [currentReferralFee, setCurrentReferralFee] = useState<string>("0")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [useDatabase, setUseDatabase] = useState(true)
  const [isLoadingParties, setIsLoadingParties] = useState(true)

  useEffect(() => {
    async function loadData() {
      setIsLoadingParties(true)
      try {
        // First try to load from localStorage for immediate display
        let localClients: Party[] = []
        let localReferrals: Party[] = []

        try {
          const storedParties = JSON.parse(localStorage.getItem("parties") || "[]")
          localClients = storedParties.filter((party: Party) => party.type === "client")
          localReferrals = storedParties.filter((party: Party) => party.type === "referral")

          // Set initial state from localStorage
          setClients(localClients)
          setReferrals(localReferrals)
        } catch (error) {
          console.error("Error loading parties from localStorage:", error)
        }

        // Then try to load from database
        try {
          const response = await fetch("/api/parties")
          if (response.ok) {
            const data = await response.json()
            if (data.success && Array.isArray(data.parties)) {
              const dbClients = data.parties.filter((party: Party) => party.type === "client")
              const dbReferrals = data.parties.filter((party: Party) => party.type === "referral")

              // Update state with database data
              setClients(dbClients)
              setReferrals(dbReferrals)

              // Update localStorage with database data
              localStorage.setItem("parties", JSON.stringify(data.parties))
              console.log("Loaded parties from database:", data.parties)
            }
          } else {
            console.error("Failed to fetch parties from database:", await response.text())
            // If database fetch fails but we have localStorage data, keep using that
            if (localClients.length === 0 && localReferrals.length === 0) {
              toast.destructive({
                title: "Error",
                description: "Failed to load parties from database and no local data available.",
              })
            }
          }
        } catch (error) {
          console.error("Error fetching parties from database:", error)
          // If database fetch fails but we have localStorage data, keep using that
          if (localClients.length === 0 && localReferrals.length === 0) {
            toast.destructive({
              title: "Error",
              description: "Failed to load parties. Please check your connection.",
            })
          }
        }

        // Generate next employee number - check both localStorage and database
        try {
          // First check localStorage
          const existingEmployees = JSON.parse(localStorage.getItem("employees") || "[]")
          let highestNumber = 0

          if (existingEmployees.length > 0) {
            // Find the highest employee number in localStorage
            const employeeNumbers = existingEmployees
              .map((emp: any) => emp.employeeNumber || "EMP-0000")
              .filter((num: string) => num.startsWith("EMP-"))
              .map((num: string) => Number.parseInt(num.replace("EMP-", ""), 10))

            highestNumber = Math.max(...employeeNumbers, 0)
          }

          // Then check database for potentially higher numbers
          try {
            const dbResponse = await fetch("/api/employees/next-number")
            if (dbResponse.ok) {
              const data = await dbResponse.json()
              if (data.success && data.nextNumber) {
                // Use the higher of localStorage and database numbers
                highestNumber = Math.max(highestNumber, data.nextNumber - 1)
              }
            }
          } catch (dbError) {
            console.error("Error fetching next employee number from database:", dbError)
            // Continue with localStorage number if database fetch fails
          }

          // Set the next number
          const nextNumber = highestNumber + 1
          setNextEmployeeNumber(`EMP-${nextNumber.toString().padStart(4, "0")}`)
        } catch (error) {
          console.error("Error generating next employee number:", error)
          // Fallback to default
          setNextEmployeeNumber("EMP-0001")
        }
      } catch (error) {
        console.error("Error in data loading process:", error)
        toast.destructive({
          title: "Error",
          description: "An unexpected error occurred while loading data.",
        })
      } finally {
        setIsLoadingParties(false)
      }
    }

    loadData()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    // Auto-capitalize first letter for names
    if (name === "firstName" || name === "lastName") {
      const capitalizedValue = value.charAt(0).toUpperCase() + value.slice(1)
      setFormData((prev) => ({ ...prev, [name]: capitalizedValue }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }

    // Clear validation error when user types
    if (validationError) {
      setValidationError(null)
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear validation error when user selects
    if (validationError) {
      setValidationError(null)
    }
  }

  const handleAddReferral = () => {
    if (!currentReferral || currentReferral === "none") {
      toast.destructive({
        title: "Error",
        description: "Please select a referral company",
      })
      return
    }

    const fee = Number.parseFloat(currentReferralFee)
    if (isNaN(fee) || fee < 0) {
      toast.destructive({
        title: "Error",
        description: "Please enter a valid referral fee",
      })
      return
    }

    // Check if this referral is already added
    if (formData.referrals.some((ref) => ref.id === currentReferral)) {
      toast.destructive({
        title: "Error",
        description: "This referral company is already added",
      })
      return
    }

    // Find the referral company name
    const referralCompany = referrals.find((ref) => ref.id === currentReferral)
    if (!referralCompany) return

    // Add to referrals list
    const newReferral: ReferralWithFee = {
      id: currentReferral,
      name: referralCompany.name,
      fee: fee,
    }

    console.log("Adding referral with fee:", newReferral)

    setFormData((prev) => ({
      ...prev,
      referrals: [...prev.referrals, newReferral],
    }))

    // Reset selection
    setCurrentReferral("")
    setCurrentReferralFee("0")
  }

  const handleRemoveReferral = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      referrals: prev.referrals.filter((ref) => ref.id !== id),
    }))
  }

  const validateForm = () => {
    // Check if all required fields are filled
    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.dateOfJoining ||
      !formData.billRate ||
      !formData.payRate ||
      !formData.billToPartyId
    ) {
      setValidationError("Please fill in all required fields")
      return false
    }

    // Check if pay rate is not more than bill rate
    const billRate = Number.parseFloat(formData.billRate)
    const payRate = Number.parseFloat(formData.payRate)

    if (payRate > billRate) {
      setValidationError("Pay rate cannot be more than bill rate")
      return false
    }

    return true
  }

  const saveToDatabase = async (employee: any, processedReferrals: any[]) => {
    try {
      // Convert to the format expected by the API
      const apiEmployee = {
        id: employee.id,
        employee_number: employee.employeeNumber,
        first_name: employee.firstName,
        last_name: employee.lastName,
        date_of_joining: employee.dateOfJoining,
        bill_rate: employee.billRate,
        pay_rate: employee.payRate,
        vendor_name: employee.vendorName,
        bill_to_party_id: employee.billToPartyId,
        status: employee.status,
        termination_date: employee.terminationDate,
        employee_type: employee.employeeType,
      }

      // Save employee to database via API
      const response = await fetch("/api/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...apiEmployee,
          referrals: processedReferrals, // Add referrals to the request body
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || "Failed to save employee to database")
      }

      console.log("Employee saved to database:", result)
      return true
    } catch (error) {
      console.error("Error saving to database:", error)
      toast.destructive({
        title: "Database Error",
        description: `Failed to save to database: ${error instanceof Error ? error.message : String(error)}`,
      })
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      // Get existing employees or initialize empty array
      const existingEmployees = JSON.parse(localStorage.getItem("employees") || "[]")

      // Find the selected client to get the name
      const selectedClient = clients.find((client) => client.id === formData.billToPartyId)
      const clientName = selectedClient ? selectedClient.name : ""

      // Ensure referral fees are numbers
      const processedReferrals = formData.referrals.map((ref) => ({
        ...ref,
        fee: Number(ref.fee), // Ensure fee is a number
      }))

      console.log("Processed referrals before saving:", processedReferrals)

      // Create new employee with unique ID and employee number
      const newEmployee = {
        id: Date.now().toString(),
        employeeNumber: nextEmployeeNumber,
        firstName: formData.firstName,
        lastName: formData.lastName,
        fullName: `${formData.firstName} ${formData.lastName}`,
        dateOfJoining: formData.dateOfJoining, // This is already in YYYY-MM-DD format from the date input
        billRate: Number.parseFloat(formData.billRate),
        payRate: Number.parseFloat(formData.payRate),
        billToPartyId: formData.billToPartyId,
        vendorName: clientName, // Keep vendorName for backward compatibility
        referrals: processedReferrals, // Use processed referrals with numeric fees
        status: "active", // Add status field for active/terminated
        terminationDate: null, // Add termination date field
        employeeType: formData.employeeType, // Add employee type
      }

      console.log("Saving new employee with referrals:", newEmployee)

      // Save to localStorage
      localStorage.setItem("employees", JSON.stringify([...existingEmployees, newEmployee]))

      // If database option is enabled, also save to database
      if (useDatabase) {
        await saveToDatabase(newEmployee, processedReferrals)
      }

      toast.default({
        title: "Success",
        description: "Employee created successfully",
      })

      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        dateOfJoining: "",
        billRate: "",
        payRate: "",
        billToPartyId: "",
        referrals: [],
        employeeType: "W2-Employee",
      })

      // Redirect to employee list
      router.push("/employee-list")
    } catch (error) {
      console.error("Error saving employee:", error)
      toast.destructive({
        title: "Error",
        description: "Failed to save employee. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoadingParties) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <h2 className="mt-4 text-xl font-semibold">Loading...</h2>
            <p className="text-muted-foreground">Loading parties data</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Create Employee</h1>
        <Link href="/">
          <Button variant="outline">Back to Home</Button>
        </Link>
      </div>

      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle>Employee Details</CardTitle>
          <CardDescription>Add a new employee to the system</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {validationError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="employeeNumber">Employee Number</Label>
              <Input id="employeeNumber" value={nextEmployeeNumber} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Employee number is auto-generated</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="John"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="billToParty">Bill to Party</Label>
              <Select
                value={formData.billToPartyId}
                onValueChange={(value) => handleSelectChange("billToPartyId", value)}
              >
                <SelectTrigger id="billToParty">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No clients available. Please add clients first.
                    </SelectItem>
                  ) : (
                    clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {clients.length === 0 && (
                <div className="mt-1 text-xs text-muted-foreground">
                  <Link href="/manage-parties" className="text-primary hover:underline">
                    Add clients
                  </Link>{" "}
                  before creating employees.
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateOfJoining">Date of Joining</Label>
              <Input
                id="dateOfJoining"
                name="dateOfJoining"
                type="date"
                value={formData.dateOfJoining}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="billRate">Bill Rate ($/hour)</Label>
              <Input
                id="billRate"
                name="billRate"
                type="number"
                min="0"
                step="0.01"
                value={formData.billRate}
                onChange={handleChange}
                placeholder="50.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payRate">Pay Rate ($/hour)</Label>
              <Input
                id="payRate"
                name="payRate"
                type="number"
                min="0"
                step="0.01"
                value={formData.payRate}
                onChange={handleChange}
                placeholder="25.00"
              />
              <p className="text-xs text-muted-foreground">Enter the hourly pay rate for this employee</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="employeeType">Employee Type</Label>
              <Select
                value={formData.employeeType}
                onValueChange={(value) =>
                  handleSelectChange("employeeType", value as "W2-Employee" | "1099-Contractor")
                }
              >
                <SelectTrigger id="employeeType">
                  <SelectValue placeholder="Select employee type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="W2-Employee">W2-Employee</SelectItem>
                  <SelectItem value="1099-Contractor">1099-Contractor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4">
              <Label className="mb-2 block">Referral Companies</Label>

              {formData.referrals.length > 0 && (
                <div className="mb-4 space-y-2">
                  {formData.referrals.map((referral) => (
                    <div key={referral.id} className="flex items-center justify-between rounded-md border p-2">
                      <div>
                        <span className="font-medium">{referral.name}</span>
                        <Badge variant="outline" className="ml-2">
                          ${referral.fee}/hr
                        </Badge>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveReferral(referral.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-6">
                  <Select value={currentReferral} onValueChange={setCurrentReferral}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select referral" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {referrals.map((referral) => (
                        <SelectItem key={referral.id} value={referral.id}>
                          {referral.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-4">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Fee/hr"
                    value={currentReferralFee}
                    onChange={(e) => setCurrentReferralFee(e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Button type="button" variant="outline" className="w-full" onClick={handleAddReferral}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {referrals.length === 0 && (
                <div className="mt-1 text-xs text-muted-foreground">
                  <Link href="/manage-parties" className="text-primary hover:underline">
                    Add referral companies
                  </Link>{" "}
                  if needed.
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="useDatabase"
                checked={useDatabase}
                onCheckedChange={(checked) => setUseDatabase(!!checked)}
              />
              <Label htmlFor="useDatabase">Also save to database</Label>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={clients.length === 0 || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Employee...
                </>
              ) : (
                "Create Employee"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
