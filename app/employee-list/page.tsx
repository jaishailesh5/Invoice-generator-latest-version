"use client"

import type React from "react"
import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Loader2, AlertCircle, Pencil, UserX, ArrowUpDown, Info, RefreshCw, Download } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { deleteEmployeeAction } from "@/app/actions/delete-actions"
import {
  getMonthlyHoursAction,
  updateMonthlyHoursAction,
  updateBulkMonthlyHoursAction,
} from "@/app/actions/hours-actions"
import { saveInvoiceToDbAction } from "@/app/actions/invoice-actions"
import { updateEmployeeStatusAction, updateEmployeeDetailsAction } from "@/app/actions/employee-actions"
import {
  uploadEmployeeSowAction,
  getEmployeeSowAction,
  checkEmployeeSowStatusAction,
} from "@/app/actions/document-actions"
import { FileText, Upload, Eye, Download as DownloadIcon } from "lucide-react"

interface Employee {
  id: string
  employeeNumber?: string
  firstName: string
  lastName: string
  dateOfJoining: string
  billRate: number
  payRate: number
  vendorName: string
  billToPartyId?: string
  status?: "active" | "terminated"
  terminationDate?: string | null
  referrals?: any[] // Add referrals property
  employeeType?: "W2-Employee" | "1099-Contractor"
}

interface EmployeeHours {
  [employeeId: string]: number
}

interface MonthlyHours {
  [monthYear: string]: EmployeeHours
}

interface Party {
  id: string
  name: string
  address: string
  type: "vendor" | "client" | "referral"
}

export default function EmployeeList() {
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState<string>("")
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedMonthNumber, setSelectedMonthNumber] = useState<string>("")
  const [hoursWorked, setHoursWorked] = useState<EmployeeHours>({})
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [savingEmployeeId, setSavingEmployeeId] = useState<string | null>(null)
  const [vendors, setVendors] = useState<Party[]>([])
  const [clients, setClients] = useState<Party[]>([])
  const [showVendorDialog, setShowVendorDialog] = useState(false)
  const [selectedVendorId, setSelectedVendorId] = useState<string>("")
  const [activeTab, setActiveTab] = useState<"active" | "terminated">("active")
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showTerminateDialog, setShowTerminateDialog] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [terminatingEmployee, setTerminatingEmployee] = useState<Employee | null>(null)
  const [terminationDate, setTerminationDate] = useState<string>("")

  useEffect(() => {
    setTerminationDate(new Date().toISOString().split("T")[0])
  }, [])
  const [validationError, setValidationError] = useState<string | null>(null)
  const [sortField, setSortField] = useState<string>("vendorName")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [showDateFilterInfo, setShowDateFilterInfo] = useState(false)
  const [hiddenEmployeeCount, setHiddenEmployeeCount] = useState(0)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isRefreshingParties, setIsRefreshingParties] = useState(false)
  const [isLoadingHours, setIsLoadingHours] = useState(false)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [isExporting, setIsExporting] = useState(false)


  const [referrals, setReferrals] = useState<Party[]>([])
  const [sowStatus, setSowStatus] = useState<{ [key: string]: boolean }>({})
  const [isUploadingSow, setIsUploadingSow] = useState<string | null>(null)
  const [isViewingSow, setIsViewingSow] = useState<string | null>(null)
  const [currentReferral, setCurrentReferral] = useState<string>("")
  const [currentReferralFee, setCurrentReferralFee] = useState<string>("")

  // Generate array of month options (without years)
  const months = [
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ]

  // Generate array of year options (current year and 3 previous years)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 4 }, (_, i) => currentYear - i)

  // Set current month as default
  useEffect(() => {
    const currentMonth = new Date().getMonth() + 1
    const formattedMonth = currentMonth < 10 ? `0${currentMonth}` : `${currentMonth}`
    setSelectedMonthNumber(formattedMonth)
    setSelectedYear(currentYear)
  }, [currentYear])

  // Combine selected month and year into monthYear format
  useEffect(() => {
    if (selectedMonthNumber && selectedYear) {
      setSelectedMonth(`${selectedMonthNumber}-${selectedYear}`)
    }
  }, [selectedMonthNumber, selectedYear])

  // Load parties from database and localStorage
  const loadParties = async () => {
    try {
      setIsRefreshingParties(true)

      // Try to load from localStorage first
      const localPartiesJson = localStorage.getItem("parties")
      let localParties: Party[] = []

      if (localPartiesJson) {
        try {
          localParties = JSON.parse(localPartiesJson)
          // Set initial state from localStorage
          setVendors(localParties.filter((party) => party.type === "vendor"))
          setClients(localParties.filter((party) => party.type === "client"))
          setReferrals(localParties.filter((party) => party.type === "referral"))
          console.log(`Loaded ${localParties.length} parties from localStorage`)
        } catch (error) {
          console.error("Error parsing parties from localStorage:", error)
        }
      }

      // If localStorage is empty or has an error, fetch from database
      if (localParties.length === 0) {
        try {
          console.log("No parties found in localStorage, fetching from database")
          const { loadPartiesFromDb } = await import("@/lib/data-loader")
          const dbParties = await loadPartiesFromDb()

          if (dbParties.length > 0) {
            // Update state with database data
            setVendors(dbParties.filter((party) => party.type === "vendor"))
            setClients(dbParties.filter((party) => party.type === "client"))
            setReferrals(dbParties.filter((party) => party.type === "referral"))
            console.log(`Loaded ${dbParties.length} parties from database`)
          } else {
            console.log("No parties found in database")
          }
        } catch (dbError) {
          console.error("Error fetching parties from database:", dbError)
          toast.destructive({
            title: "Error",
            description: "Failed to load parties. Please check your connection.",
          })
        }
      } else {
        // If we have localStorage data, still try to update from database in the background
        try {
          const response = await fetch("/api/parties")
          if (response.ok) {
            const data = await response.json()
            if (data.success && Array.isArray(data.parties)) {
              // Update state with database data
              setVendors(data.parties.filter((party) => party.type === "vendor"))
              setClients(data.parties.filter((party) => party.type === "client"))
              setReferrals(data.parties.filter((party) => party.type === "referral"))

              // Update localStorage with database data
              localStorage.setItem("parties", JSON.stringify(data.parties))
              console.log("Updated parties from database:", data.parties)
            }
          }
        } catch (updateError) {
          console.error("Error updating parties from database:", updateError)
        }
      }
    } catch (error) {
      console.error("Error in loadParties:", error)
    } finally {
      setIsRefreshingParties(false)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        // Try to load employees from localStorage first
        const storedEmployeesJson = localStorage.getItem("employees")
        let employeeData = []

        if (storedEmployeesJson) {
          // If localStorage has data, use it
          const storedEmployees = JSON.parse(storedEmployeesJson)

          // Ensure all employees have a status field
          employeeData = storedEmployees.map((emp: Employee) => ({
            ...emp,
            status: emp.status || "active",
            terminationDate: emp.terminationDate || null,
          }))

          console.log(`Loaded ${employeeData.length} employees from localStorage`)
        } else {
          // If localStorage is empty, fetch from database with error handling
          console.log("No employees found in localStorage, fetching from database")
          try {
            // Import the server action dynamically
            const { loadEmployeesFromDbAction } = await import("@/app/actions/data-loader-actions")

            // Call the server action directly
            const result = await loadEmployeesFromDbAction()

            if (!result.success) {
              throw new Error(result.message || "Failed to load employees from database")
            }

            employeeData = result.employees || []
            console.log(`Loaded ${employeeData.length} employees from database`)

            // Save to localStorage for future use
            if (employeeData.length > 0) {
              localStorage.setItem("employees", JSON.stringify(employeeData))
            }
          } catch (dbError) {
            console.error("Error loading employees from database:", dbError)
            toast.destructive({
              title: "Database Error",
              description: "Failed to load employees from database. Please check your connection.",
            })
            employeeData = [] // Ensure we have an empty array
          }
        }

        setEmployees(employeeData)

        // Load parties
        await loadParties()
      } catch (error) {
        console.error("Error loading data:", error)
        toast.destructive({
          title: "Error",
          description: "Failed to load data. Please refresh the page.",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadData()

  }, [])

  // Check SOW status for all employees
  useEffect(() => {
    const checkSowStatus = async () => {
      if (employees.length === 0) return

      const statusMap: { [key: string]: boolean } = {}

      // Check status for each employee
      // In a real app, we might want to batch this or include it in the initial employee load
      await Promise.all(
        employees.map(async (emp) => {
          try {
            const result = await checkEmployeeSowStatusAction(emp.id)
            if (result.success && result.exists) {
              statusMap[emp.id] = true
            }
          } catch (error) {
            console.error(`Error checking SOW for ${emp.id}:`, error)
          }
        })
      )

      setSowStatus(prev => ({ ...prev, ...statusMap }))
    }

    checkSowStatus()
  }, [employees])

  // Filter employees based on selected month
  useEffect(() => {
    if (!selectedMonth || !employees.length) return

    const [month, year] = selectedMonth.split("-")
    const lastDayOfMonth = new Date(Number.parseInt(year), Number.parseInt(month), 0).getDate()
    const selectedMonthEndDate = `${year}-${month}-${lastDayOfMonth}`

    // Filter employees who joined on or before the end of the selected month
    const filtered = employees.filter((emp) => {
      // Skip filtering for terminated employees tab
      if (activeTab === "terminated") return true

      // If no date of joining, include them (data integrity issue)
      if (!emp.dateOfJoining) return true

      return emp.dateOfJoining <= selectedMonthEndDate
    })

    // Count how many employees were filtered out
    const hiddenCount = employees.length - filtered.length
    setHiddenEmployeeCount(hiddenCount)

    // Show info alert if any employees were filtered out
    setShowDateFilterInfo(hiddenCount > 0)

    setFilteredEmployees(filtered)
  }, [selectedMonth, employees, activeTab])

  // Load hours when month changes or employees are loaded
  useEffect(() => {
    if (selectedMonth && employees.length > 0) {
      const fetchHours = async () => {
        await loadHoursForMonth(selectedMonth)
      }
      fetchHours()
    }
  }, [selectedMonth, employees])

  // Update selectAll state when individual selections change
  useEffect(() => {
    const visibleEmployees = getSortedEmployees()
    setSelectAll(selectedEmployees.size === visibleEmployees.length && visibleEmployees.length > 0)
  }, [selectedEmployees, filteredEmployees, activeTab, searchQuery])

  // Clear selections when switching tabs
  useEffect(() => {
    setSelectedEmployees(new Set())
  }, [activeTab])

  const loadHoursForMonth = async (monthYear: string) => {
    try {
      setIsLoadingHours(true)
      console.log(`Loading hours for month ${monthYear} from database`)

      // Get hours from database using server action
      const result = await getMonthlyHoursAction(monthYear)

      if (!result.success) {
        throw new Error(result.message || "Failed to load hours from database")
      }

      const monthData = result.data || {}
      console.log("Retrieved hours from database:", monthData)

      // Initialize hours for all employees
      const initialHours: EmployeeHours = {}
      employees.forEach((employee) => {
        initialHours[employee.id] = monthData[employee.id] || 0
      })

      setHoursWorked(initialHours)
    } catch (error) {
      console.error("Error loading hours:", error)
      toast.destructive({
        title: "Error",
        description: "Failed to load hours data. Please try again.",
      })

      // Fallback to localStorage if database fails
      try {
        const storedMonthlyHours: MonthlyHours = JSON.parse(localStorage.getItem("monthlyHours") || "{}")
        const monthData = storedMonthlyHours[monthYear] || {}

        const initialHours: EmployeeHours = {}
        employees.forEach((employee) => {
          initialHours[employee.id] = monthData[employee.id] || 0
        })

        setHoursWorked(initialHours)
      } catch (fallbackError) {
        console.error("Fallback error loading hours:", fallbackError)
      }
    } finally {
      setIsLoadingHours(false)
    }
  }

  // Save hours to database
  const saveHoursToStorage = useCallback(
    async (employeeId: string, hours: number) => {
      try {
        setSavingEmployeeId(employeeId)

        console.log(`Saving ${hours} hours for employee ${employeeId} in month ${selectedMonth} to database`)

        // Save to database using server action
        const result = await updateMonthlyHoursAction(employeeId, selectedMonth, hours)

        if (!result.success) {
          throw new Error(result.message || "Failed to save hours to database")
        }

        // Also update localStorage as a backup
        const storedMonthlyHours: MonthlyHours = JSON.parse(localStorage.getItem("monthlyHours") || "{}")
        const monthData = storedMonthlyHours[selectedMonth] || {}
        const updatedMonthData = {
          ...monthData,
          [employeeId]: hours,
        }
        const updatedMonthlyHours = {
          ...storedMonthlyHours,
          [selectedMonth]: updatedMonthData,
        }
        localStorage.setItem("monthlyHours", JSON.stringify(updatedMonthlyHours))

        // Simulate a small delay to show the saving indicator
        await new Promise((resolve) => setTimeout(resolve, 300))

        setSavingEmployeeId(null)
      } catch (error) {
        console.error("Error saving hours:", error)
        toast.destructive({
          title: "Error",
          description: "Failed to save hours. Please try again.",
        })
        setSavingEmployeeId(null)
      }
    },
    [selectedMonth],
  )

  // Debounce function to prevent too many saves
  const debounce = (func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout
    return (...args: any) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        func(...args)
      }, delay)
    }
  }

  // Create a debounced version of saveHoursToStorage
  const debouncedSaveHours = useCallback(
    debounce((employeeId: string, hours: number) => {
      saveHoursToStorage(employeeId, hours)
    }, 500),
    [saveHoursToStorage],
  )

  const handleHoursChange = (employeeId: string, hours: string) => {
    const parsedHours = Number.parseFloat(hours) || 0

    // Update local state immediately for responsive UI
    setHoursWorked((prev) => ({
      ...prev,
      [employeeId]: parsedHours,
    }))

    // Save to database with debounce
    debouncedSaveHours(employeeId, parsedHours)
  }

  const handleSelectEmployee = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedEmployees)

    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }

    setSelectedEmployees(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select all visible employees in the current tab
      const visibleEmployees = getSortedEmployees()
      const allIds = new Set(visibleEmployees.map((emp) => emp.id))
      setSelectedEmployees(allIds)
    } else {
      // Deselect all
      setSelectedEmployees(new Set())
    }
    setSelectAll(checked)
  }

  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(id)

      // First delete from SQLite database using server action
      const result = await deleteEmployeeAction(id)

      if (!result.success) {
        throw new Error(result.message || "Failed to delete from database")
      }

      // Then update local state
      const updatedEmployees = employees.filter((emp) => emp.id !== id)
      localStorage.setItem("employees", JSON.stringify(updatedEmployees))
      setEmployees(updatedEmployees)

      // Also remove hours data for this employee
      const newHoursWorked = { ...hoursWorked }
      delete newHoursWorked[id]
      setHoursWorked(newHoursWorked)

      // Update localStorage
      const storedMonthlyHours: MonthlyHours = JSON.parse(localStorage.getItem("monthlyHours") || "{}")

      Object.keys(storedMonthlyHours).forEach((month) => {
        if (storedMonthlyHours[month][id]) {
          delete storedMonthlyHours[month][id]
        }
      })

      localStorage.setItem("monthlyHours", JSON.stringify(storedMonthlyHours))

      // Remove from selected employees if present
      if (selectedEmployees.has(id)) {
        const newSelected = new Set(selectedEmployees)
        newSelected.delete(id)
        setSelectedEmployees(newSelected)
      }

      toast.default({
        title: "Employee Deleted",
        description: "The employee has been removed from the system and database",
      })
    } catch (error) {
      console.error("Error deleting employee:", error)
      toast.destructive({
        title: "Error",
        description: `Failed to delete employee: ${error instanceof Error ? error.message : String(error)}`,
      })
    } finally {
      setIsDeleting(null)
    }
  }

  const deleteSelected = async () => {
    if (selectedEmployees.size === 0) return

    try {
      // Delete each selected employee from the database
      const deletePromises = Array.from(selectedEmployees).map(async (id) => {
        const result = await deleteEmployeeAction(id)
        if (!result.success) {
          throw new Error(`Failed to delete employee ${id}: ${result.message}`)
        }
        return id
      })

      await Promise.all(deletePromises)

      // Filter out selected employees from local state
      const updatedEmployees = employees.filter((emp) => !selectedEmployees.has(emp.id))
      localStorage.setItem("employees", JSON.stringify(updatedEmployees))
      setEmployees(updatedEmployees)

      // Update hours data
      const newHoursWorked = { ...hoursWorked }
      selectedEmployees.forEach((id) => {
        delete newHoursWorked[id]
      })
      setHoursWorked(newHoursWorked)

      // Update monthly hours in localStorage
      const storedMonthlyHours: MonthlyHours = JSON.parse(localStorage.getItem("monthlyHours") || "{}")

      Object.keys(storedMonthlyHours).forEach((month) => {
        selectedEmployees.forEach((id) => {
          if (storedMonthlyHours[month][id]) {
            delete storedMonthlyHours[month][id]
          }
        })
      })

      localStorage.setItem("monthlyHours", JSON.stringify(storedMonthlyHours))

      // Clear selection
      setSelectedEmployees(new Set())

      toast.default({
        title: "Employees Deleted",
        description: `${selectedEmployees.size} employee(s) have been removed from the system and database`,
      })
    } catch (error) {
      console.error("Error deleting employees:", error)
      toast.destructive({
        title: "Error",
        description: `Failed to delete employees: ${error instanceof Error ? error.message : String(error)}`,
      })
    }
  }

  const setBulkHours = async () => {
    if (selectedEmployees.size === 0) return

    // Prompt for hours
    const hours = window.prompt("Enter hours for selected employees:")
    if (hours === null) return

    const parsedHours = Number.parseFloat(hours) || 0
    if (parsedHours < 0) {
      toast.destructive({
        title: "Invalid Hours",
        description: "Hours must be a positive number",
      })
      return
    }

    try {
      // Update local state immediately for responsive UI
      const newHoursWorked = { ...hoursWorked }
      selectedEmployees.forEach((id) => {
        newHoursWorked[id] = parsedHours
      })
      setHoursWorked(newHoursWorked)

      // Save to database using server action
      const result = await updateBulkMonthlyHoursAction(Array.from(selectedEmployees), selectedMonth, parsedHours)

      if (!result.success) {
        throw new Error(result.message || "Failed to set hours in database")
      }

      // Also update localStorage as a backup
      const storedMonthlyHours: MonthlyHours = JSON.parse(localStorage.getItem("monthlyHours") || "{}")
      const monthData = storedMonthlyHours[selectedMonth] || {}

      selectedEmployees.forEach((id) => {
        monthData[id] = parsedHours
      })

      storedMonthlyHours[selectedMonth] = monthData
      localStorage.setItem("monthlyHours", JSON.stringify(storedMonthlyHours))

      toast.default({
        title: "Hours Updated",
        description: `Set ${parsedHours} hours for ${selectedEmployees.size} employee(s)`,
      })
    } catch (error) {
      console.error("Error setting bulk hours:", error)
      toast.destructive({
        title: "Error",
        description: "Failed to set hours. Please try again.",
      })
    }
  }



  const handleFileUpload = async (employeeId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== "application/pdf") {
      toast.destructive({
        title: "Invalid File",
        description: "Please upload a PDF file",
      })
      return
    }

    try {
      setIsUploadingSow(employeeId)
      const formData = new FormData()
      formData.append("file", file)

      const result = await uploadEmployeeSowAction(employeeId, formData)

      if (result.success) {
        toast.default({
          title: "Success",
          description: "SOW uploaded successfully",
        })
        setSowStatus((prev) => ({ ...prev, [employeeId]: true }))
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error("Error uploading SOW:", error)
      toast.destructive({
        title: "Error",
        description: "Failed to upload SOW",
      })
    } finally {
      setIsUploadingSow(null)
      // Reset the input value so the same file can be selected again if needed
      event.target.value = ""
    }
  }

  const handleViewSow = async (employeeId: string) => {
    try {
      setIsViewingSow(employeeId)
      console.log(`Viewing SOW for employee: ${employeeId}`)
      const result = await getEmployeeSowAction(employeeId)
      console.log("SOW Action Result:", result)

      if (result.success && result.data) {
        console.log("SOW Data received, length:", result.data.content.length)
        try {
          // Sanitize base64 string
          const cleanContent = result.data.content.replace(/\s/g, '')
          const byteCharacters = atob(cleanContent)
          const byteNumbers = new Array(byteCharacters.length)
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i)
          }
          const byteArray = new Uint8Array(byteNumbers)
          const blob = new Blob([byteArray], { type: result.data.fileType })

          // Create URL and open in new tab
          const url = URL.createObjectURL(blob)
          window.open(url, "_blank")

          // Clean up URL after a delay
          setTimeout(() => URL.revokeObjectURL(url), 1000)
        } catch (decodeError) {
          console.error("Base64 decoding failed:", decodeError)
          throw new Error("Failed to decode document data")
        }
      } else {
        console.error("SOW retrieval failed:", result.message)
        throw new Error(result.message || "Failed to retrieve SOW")
      }
    } catch (error) {
      console.error("Error viewing SOW:", error)
      toast.destructive({
        title: "Error",
        description: "Failed to view SOW",
      })
    } finally {
      setIsViewingSow(null)
    }
  }

  const handleDownloadSow = async (employeeId: string, employeeName: string) => {
    try {
      setIsViewingSow(employeeId) // Reuse loading state
      console.log(`Downloading SOW for employee: ${employeeId}`)
      const result = await getEmployeeSowAction(employeeId)
      console.log("SOW Action Result (Download):", result)

      if (result.success && result.data) {
        try {
          // Sanitize base64 string
          const cleanContent = result.data.content.replace(/\s/g, '')
          const byteCharacters = atob(cleanContent)
          const byteNumbers = new Array(byteCharacters.length)
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i)
          }
          const byteArray = new Uint8Array(byteNumbers)
          const blob = new Blob([byteArray], { type: result.data.fileType })

          // Create download link
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = result.data.fileName || `${employeeName.replace(/\s+/g, "_")}_SOW.pdf`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)

          // Clean up URL
          URL.revokeObjectURL(url)
        } catch (decodeError) {
          console.error("Base64 decoding failed (download):", decodeError)
          throw new Error("Failed to decode document data for download")
        }
      } else {
        throw new Error(result.message || "Failed to retrieve SOW")
      }
    } catch (error) {
      console.error("Error downloading SOW:", error)
      toast.destructive({
        title: "Error",
        description: "Failed to download SOW",
      })
    } finally {
      setIsViewingSow(null)
    }
  }

  const handleGenerateInvoice = () => {
    if (selectedEmployees.size === 0) {
      toast.destructive({
        title: "No Employees Selected",
        description: "Please select at least one employee to generate invoices",
      })
      return
    }

    if (vendors.length === 0) {
      toast.destructive({
        title: "No Vendors Available",
        description: "Please add at least one vendor before generating invoices",
      })
      router.push("/manage-parties")
      return
    }

    // Show vendor selection dialog
    setShowVendorDialog(true)
    // Set default vendor if available
    if (vendors.length > 0) {
      setSelectedVendorId(vendors[0].id)
    }
  }

  // Function to get invoice date string
  const getInvoiceDateString = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0") // Month is 0-indexed
    const day = String(now.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const generateInvoicesForSelectedEmployees = async () => {
    if (!selectedVendorId) {
      toast.destructive({
        title: "No Vendor Selected",
        description: "Please select a vendor to generate invoices",
      })
      return
    }

    try {
      // Show loading state
      toast.default({
        title: "Generating Invoices",
        description: "Please wait while we generate and save your invoices...",
      })

      const selectedVendor = vendors.find((v) => v.id === selectedVendorId)
      if (!selectedVendor) {
        throw new Error("Selected vendor not found")
      }

      // Get the month and year from selectedMonth
      const [month, year] = selectedMonth.split("-")
      const monthNumber = Number.parseInt(month, 10)
      const yearNumber = Number.parseInt(year, 10)

      // Calculate first and last day of the month
      const firstDay = new Date(yearNumber, monthNumber - 1, 1)
      const lastDay = new Date(yearNumber, monthNumber, 0) // Last day of the month

      // Format dates for the invoice
      const startDate = firstDay.toISOString().split("T")[0]
      const endDate = lastDay.toISOString().split("T")[0]

      // Get current date using our simplified approach
      const currentDate = getInvoiceDateString()

      console.log("BULK INVOICE GENERATION - CURRENT DATE CHECK")
      console.log("Invoice date (direct):", currentDate)

      // Get month name for display
      const date = new Date(yearNumber, monthNumber - 1, 1)
      const monthName = date.toLocaleString("default", { month: "long" })

      // Get monthly hours from database
      console.log(`Getting monthly hours for ${selectedMonth} from database`)
      const result = await getMonthlyHoursAction(selectedMonth)

      if (!result.success) {
        throw new Error(result.message || "Failed to get hours from database")
      }

      const monthData = result.data || {}
      console.log("Retrieved hours from database:", monthData)

      // Generate invoices for each selected employee
      const generatedInvoices = []
      const dbSaveResults = []
      const selectedEmployeesList = Array.from(selectedEmployees)

      for (const employeeId of selectedEmployeesList) {
        const employee = employees.find((emp) => emp.id === employeeId)
        if (!employee) continue

        // Skip if no hours worked
        const hours = monthData[employeeId] || 0
        if (hours === 0) continue

        // Find the client associated with this employee
        const clientId = employee.billToPartyId
        const client = clients.find((c) => c.id === clientId)
        if (!client) continue

        const totalBillAmount = employee.billRate * hours
        const totalPayAmount = employee.payRate * hours
        const profit = totalBillAmount - totalPayAmount

        const newInvoice = {
          invoiceNumber: `INV-${Date.now().toString().slice(-6)}-${employeeId.slice(-3)}`,
          date: currentDate,
          paymentTerms: "Net 60",
          vendor: {
            name: selectedVendor.name,
            address: selectedVendor.address,
            id: selectedVendor.id,
          },
          billTo: {
            name: client.name,
            address: client.address,
            id: client.id,
          },
          serviceFor: "IT Consulting Services",
          employee: {
            name: `${employee.firstName} ${employee.lastName}`,
            id: employee.id,
            referrals: employee.referrals || [], // Make sure referrals array with fees is included
          },
          period: {
            month: `${monthName} ${year}`,
            start: startDate,
            end: endDate,
          },
          hours,
          billRate: employee.billRate,
          payRate: employee.payRate,
          totalBillAmount,
          totalPayAmount,
          profit,
          status: "pending",
        }

        generatedInvoices.push(newInvoice)

        // Save to database
        console.log(`Saving invoice for employee ${employee.firstName} ${employee.lastName} to database`)
        const dbResult = await saveInvoiceToDbAction(newInvoice)
        dbSaveResults.push({
          employee: `${employee.firstName} ${employee.lastName}`,
          success: dbResult.success,
          message: dbResult.message,
          invoiceId: dbResult.invoiceId,
        })
      }

      if (generatedInvoices.length === 0) {
        toast.destructive({
          title: "No Invoices Generated",
          description: "No hours recorded for selected employees or missing client information",
        })
        setShowVendorDialog(false)
        return
      }

      // Save invoices to localStorage as backup
      const existingInvoices = JSON.parse(localStorage.getItem("invoices") || "[]")
      localStorage.setItem("invoices", JSON.stringify([...existingInvoices, ...generatedInvoices]))

      // Count successful and failed saves
      const successCount = dbSaveResults.filter((r) => r.success).length
      const failCount = dbSaveResults.filter((r) => !r.success).length

      if (failCount > 0) {
        toast.destructive({
          title: "Some Invoices Failed to Save",
          description: `${successCount} invoices saved successfully, ${failCount} failed. Check console for details.`,
        })
        console.error(
          "Failed invoice saves:",
          dbSaveResults.filter((r) => !r.success),
        )
      } else {
        toast.default({
          title: "Invoices Generated",
          description: `Successfully generated and saved ${generatedInvoices.length} invoice(s) to the database`,
        })
      }

      // Close dialog and redirect to invoice history
      setShowVendorDialog(false)
      router.push("/invoice-history")
    } catch (error) {
      console.error("Error generating invoices:", error)
      toast.destructive({
        title: "Error",
        description: `Failed to generate invoices: ${error instanceof Error ? error.message : String(error)}`,
      })
      setShowVendorDialog(false)
    }
  }

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee({ ...employee })
    setShowEditDialog(true)
    setValidationError(null)
  }

  const handleTerminateEmployee = (employee: Employee) => {
    setTerminatingEmployee(employee)
    setShowTerminateDialog(true)
    // Set default termination date to today
    setTerminationDate(new Date().toISOString().split("T")[0])
  }

  const saveEmployeeEdit = async () => {
    if (!editingEmployee) return

    // Validate pay rate vs bill rate
    if (editingEmployee.payRate > editingEmployee.billRate) {
      setValidationError("Pay rate cannot be more than bill rate")
      return
    }

    try {
      setIsLoading(true)

      // Process referrals to ensure fees are numbers
      const processedReferrals =
        editingEmployee.referrals?.map((ref) => ({
          id: ref.id,
          fee: Number(ref.fee),
        })) || []

      // First update the database using server action
      const result = await updateEmployeeDetailsAction(editingEmployee.id, {
        firstName: editingEmployee.firstName,
        lastName: editingEmployee.lastName,
        billRate: editingEmployee.billRate,
        payRate: editingEmployee.payRate,
        employeeType: editingEmployee.employeeType,
        billToPartyId: editingEmployee.billToPartyId,
        dateOfJoining: editingEmployee.dateOfJoining,
        vendorName: editingEmployee.vendorName,
        referrals: processedReferrals, // Add referrals to the update
      })

      if (!result.success) {
        throw new Error(result.message || "Failed to update employee in database")
      }

      // Update employee in the local state
      const updatedEmployees = employees.map((emp) => (emp.id === editingEmployee.id ? editingEmployee : emp))

      // Save to localStorage
      localStorage.setItem("employees", JSON.stringify(updatedEmployees))
      setEmployees(updatedEmployees)

      // Close dialog
      setShowEditDialog(false)
      setEditingEmployee(null)

      toast.default({
        title: "Employee Updated",
        description: "Employee details have been updated successfully in the database",
      })
    } catch (error) {
      console.error("Error updating employee:", error)
      toast.destructive({
        title: "Error",
        description: `Failed to update employee: ${error instanceof Error ? error.message : String(error)}`,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const terminateEmployee = async () => {
    if (!terminatingEmployee) return

    try {
      // Show loading state
      setIsLoading(true)

      // Update employee status in the database first
      const result = await updateEmployeeStatusAction(terminatingEmployee.id, "terminated", terminationDate)

      if (!result.success) {
        throw new Error(result.message || "Failed to update employee status in database")
      }

      // Update employee status in local state
      const updatedEmployees = employees.map((emp) =>
        emp.id === terminatingEmployee.id ? { ...emp, status: "terminated", terminationDate: terminationDate } : emp,
      )

      // Save to localStorage
      localStorage.setItem("employees", JSON.stringify(updatedEmployees))
      setEmployees(updatedEmployees)

      // Remove from selected employees if present
      if (selectedEmployees.has(terminatingEmployee.id)) {
        const newSelected = new Set(selectedEmployees)
        newSelected.delete(terminatingEmployee.id)
        setSelectedEmployees(newSelected)
      }

      // Close dialog
      setShowTerminateDialog(false)
      setTerminatingEmployee(null)

      toast.default({
        title: "Employee Terminated",
        description: "Employee has been marked as terminated in the database and UI",
      })
    } catch (error) {
      console.error("Error terminating employee:", error)
      toast.destructive({
        title: "Error",
        description: `Failed to terminate employee: ${error instanceof Error ? error.message : String(error)}`,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingEmployee) return

    const { name, value } = e.target

    // Auto-capitalize first letter for names
    if (name === "firstName" || name === "lastName") {
      const capitalizedValue = value.charAt(0).toUpperCase() + value.slice(1)
      setEditingEmployee({ ...editingEmployee, [name]: capitalizedValue })
    } else if (name === "billRate" || name === "payRate") {
      setEditingEmployee({ ...editingEmployee, [name]: Number.parseFloat(value) })
      // Clear validation error when user types
      if (validationError) {
        setValidationError(null)
      }
    } else {
      setEditingEmployee({ ...editingEmployee, [name]: value })
    }
  }

  const handleEditSelectChange = (name: string, value: string) => {
    if (!editingEmployee) return
    setEditingEmployee({ ...editingEmployee, [name]: value })
  }

  const handleAddReferralToEdit = () => {
    if (!editingEmployee) return

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
    if (editingEmployee.referrals?.some((ref) => ref.id === currentReferral)) {
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
    const newReferral = {
      id: currentReferral,
      name: referralCompany.name,
      fee: fee,
    }

    const updatedReferrals = [...(editingEmployee.referrals || []), newReferral]

    setEditingEmployee({
      ...editingEmployee,
      referrals: updatedReferrals,
    })

    // Reset selection
    setCurrentReferral("")
    setCurrentReferralFee("0")
  }

  const handleRemoveReferralFromEdit = (id: string) => {
    if (!editingEmployee) return

    const updatedReferrals = editingEmployee.referrals?.filter((ref) => ref.id !== id) || []

    setEditingEmployee({
      ...editingEmployee,
      referrals: updatedReferrals,
    })
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A"
    try {
      // Parse the date string and handle timezone issues
      // Add time component to avoid timezone shifts
      const dateWithTime = dateString.includes("T") ? dateString : `${dateString}T12:00:00`
      const date = new Date(dateWithTime)

      // Format with explicit year, month, day components to avoid timezone shifts
      const year = date.getFullYear()
      const month = date.getMonth() + 1 // getMonth() is 0-indexed
      const day = date.getDate()

      return `${month.toString().padStart(2, "0")}/${day.toString().padStart(2, "0")}/${year}`
    } catch (error) {
      console.error("Error formatting date:", error)
      return dateString || "N/A"
    }
  }

  const getMonthName = (monthYear: string) => {
    if (!monthYear) return "Unknown Month"
    const [monthNumber, year] = monthYear.split("-")
    const month = months.find((m) => m.value === monthNumber)
    return month ? `${month.label} ${year}` : "Unknown Month"
  }

  const handleSort = (field: string) => {
    if (field === sortField) {
      // Toggle direction if same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      // New field, default to ascending
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  // Export to Excel functionality
  const handleExportToExcel = async () => {
    if (!selectedMonth) {
      toast.destructive({
        title: "No Month Selected",
        description: "Please select a month to export data for",
      })
      return
    }

    try {
      setIsExporting(true)

      // Get the visible employees (filtered and sorted)
      const visibleEmployees = getSortedEmployees()

      if (visibleEmployees.length === 0) {
        toast.destructive({
          title: "No Data to Export",
          description: "No employees found for the selected criteria",
        })
        return
      }

      // Prepare data for Excel export
      const exportData = visibleEmployees.map((employee) => {
        const hours = hoursWorked[employee.id] || 0
        const totalBillAmount = employee.billRate * hours
        const totalPayAmount = employee.payRate * hours
        const profit = totalBillAmount - totalPayAmount

        return {
          "Employee #": employee.employeeNumber || "N/A",
          "First Name": employee.firstName,
          "Last Name": employee.lastName,
          "Employee Type": employee.employeeType || "W2-Employee",
          Client: employee.vendorName,
          "Date of Joining": formatDate(employee.dateOfJoining),
          "Bill Rate ($/hr)": employee.billRate.toFixed(2),
          "Pay Rate ($/hr)": employee.payRate.toFixed(2),
          "Hours Worked": hours,
          "Total Bill Amount": totalBillAmount.toFixed(2),
          "Total Pay Amount": totalPayAmount.toFixed(2),
          Profit: profit.toFixed(2),
          Status: employee.status || "active",
        }
      })

      // Convert to CSV format (Excel can open CSV files)
      const headers = Object.keys(exportData[0])
      const csvContent = [
        headers.join(","),
        ...exportData.map((row) =>
          headers
            .map((header) => {
              const value = row[header as keyof typeof row]
              // Escape commas and quotes in values
              return typeof value === "string" && (value.includes(",") || value.includes('"'))
                ? `"${value.replace(/"/g, '""')}"`
                : value
            })
            .join(","),
        ),
      ].join("\n")

      // Create and download the file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `employee-list-${getMonthName(selectedMonth).replace(" ", "-")}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.default({
        title: "Export Successful",
        description: `Exported ${exportData.length} employee records for ${getMonthName(selectedMonth)}`,
      })
    } catch (error) {
      console.error("Error exporting to Excel:", error)
      toast.destructive({
        title: "Export Failed",
        description: "Failed to export employee data. Please try again.",
      })
    } finally {
      setIsExporting(false)
    }
  }

  // Sort and filter employees
  const getSortedEmployees = () => {
    // First filter by active/terminated status
    const statusFiltered = filteredEmployees.filter((emp) =>
      activeTab === "active" ? emp.status === "active" || !emp.status : emp.status === "terminated",
    )

    // Then filter by search query
    const searchedEmployees = statusFiltered.filter((emp) => {
      const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase()
      return (
        fullName.includes(searchQuery.toLowerCase()) ||
        emp.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.lastName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })

    // Then sort
    return searchedEmployees.sort((a, b) => {
      let valueA, valueB

      if (sortField === "vendorName") {
        valueA = a.vendorName || ""
        valueB = b.vendorName || ""
      } else if (sortField === "name") {
        valueA = `${a.firstName} ${a.lastName}`
        valueB = `${b.firstName} ${b.lastName}`
      } else if (sortField === "billRate") {
        valueA = a.billRate
        valueB = b.billRate
      } else if (sortField === "payRate") {
        valueA = a.payRate
        valueB = b.payRate
      } else if (sortField === "dateOfJoining" || sortField === "terminationDate") {
        valueA = new Date((a[sortField as keyof Employee] as string) || "").getTime() || 0
        valueB = new Date((b[sortField as keyof Employee] as string) || "").getTime() || 0
      } else if (sortField === "employeeType") {
        valueA = a.employeeType || ""
        valueB = b.employeeType || ""
      } else {
        valueA = a[sortField as keyof Employee] || ""
        valueB = b[sortField as keyof Employee] || ""
      }

      if (sortDirection === "asc") {
        return valueA > valueB ? 1 : -1
      } else {
        return valueA < valueB ? 1 : -1
      }
    })
  }

  const handleRefreshParties = async () => {
    await loadParties()
    toast.default({
      title: "Data Refreshed",
      description: "Parties data has been refreshed from the database",
    })
  }

  const visibleEmployees = getSortedEmployees()

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <h2 className="mt-4 text-xl font-semibold">Loading...</h2>
            <p className="text-muted-foreground">Loading employee data</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Employee List</h1>
        <div className="space-x-2">
          <Button variant="outline" size="sm" onClick={handleRefreshParties} disabled={isRefreshingParties}>
            {isRefreshingParties ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-1 h-3 w-3" />
                Refresh Parties
              </>
            )}
          </Button>
          {activeTab === "active" && selectedMonth && (
            <Button variant="outline" size="sm" onClick={handleExportToExcel} disabled={isExporting}>
              {isExporting ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-1 h-3 w-3" />
                  Export to Excel
                </>
              )}
            </Button>
          )}
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
          <Button variant="secondary" onClick={handleGenerateInvoice} disabled={selectedEmployees.size === 0}>
            Generate Invoice
          </Button>
          <Link href="/create-employee">
            <Button>Add Employee</Button>
          </Link>
        </div>
      </div>

      <div className="mb-6">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "active" | "terminated")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">Active Employees</TabsTrigger>
            <TabsTrigger value="terminated">Terminated Employees</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {activeTab === "active" && employees.length > 0 && (
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Hours</CardTitle>
              <CardDescription>
                Select a month to view and edit hours worked for each employee. Hours are saved automatically as you
                type.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                <div className="flex w-full space-x-2 sm:w-64">
                  <div className="w-1/2">
                    <Select
                      value={selectedYear.toString()}
                      onValueChange={(value) => setSelectedYear(Number.parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-1/2">
                    <Select value={selectedMonthNumber} onValueChange={setSelectedMonthNumber}>
                      <SelectTrigger>
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((month) => (
                          <SelectItem key={month.value} value={month.value}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">Hours are saved automatically</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showDateFilterInfo && activeTab === "active" && (
        <Alert className="mb-6 bg-blue-50">
          <Info className="h-4 w-4" />
          <AlertDescription>
            {hiddenEmployeeCount} employee(s) who joined after {getMonthName(selectedMonth)} are not shown.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{activeTab === "active" ? "Active Employees" : "Terminated Employees"}</CardTitle>
            <CardDescription>
              {activeTab === "active"
                ? "Manage your active employees and their details"
                : "View terminated employees and their details"}
              {activeTab === "active" && selectedMonth && (
                <span className="ml-1">
                  - Hours for <strong>{getMonthName(selectedMonth)}</strong>
                </span>
              )}
            </CardDescription>
          </div>
          {selectedEmployees.size > 0 && activeTab === "active" && (
            <div className="mt-4 flex items-center space-x-2 sm:mt-0">
              <span className="text-sm text-muted-foreground">{selectedEmployees.size} selected</span>
              <Button variant="outline" size="sm" onClick={setBulkHours}>
                Set Hours
              </Button>
              <Button variant="destructive" size="sm" onClick={deleteSelected}>
                Delete Selected
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input type="text" placeholder="Search by name..." value={searchQuery} onChange={handleSearchChange} />
          </div>
          {visibleEmployees.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>
                {activeTab === "active"
                  ? hiddenEmployeeCount > 0
                    ? `No employees available for ${getMonthName(selectedMonth)}. All employees joined later.`
                    : "No active employees found. Add your first employee to get started."
                  : "No terminated employees found."}
              </p>
              {activeTab === "active" && hiddenEmployeeCount === 0 && (
                <Link href="/create-employee">
                  <Button className="mt-4">Add Employee</Button>
                </Link>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {activeTab === "active" && (
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectAll}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all employees"
                      />
                    </TableHead>
                  )}
                  <TableHead>Employee #</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>
                    <div className="flex items-center">
                      Name
                      {sortField === "name" && <ArrowUpDown className="ml-1 h-4 w-4" />}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("vendorName")}>
                    <div className="flex items-center">
                      Client
                      {sortField === "vendorName" && <ArrowUpDown className="ml-1 h-4 w-4" />}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("billRate")}>
                    <div className="flex items-center">
                      Bill Rate ($/hr)
                      {sortField === "billRate" && <ArrowUpDown className="ml-1 h-4 w-4" />}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("payRate")}>
                    <div className="flex items-center">
                      Pay Rate ($/hr)
                      {sortField === "payRate" && <ArrowUpDown className="ml-1 h-4 w-4" />}
                    </div>
                  </TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[150px]">SOW</TableHead>
                  {activeTab === "active" && selectedMonth && <TableHead>Hours Worked</TableHead>}
                  <TableHead className="text-right">Actions</TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort(activeTab === "active" ? "dateOfJoining" : "terminationDate")}
                  >
                    <div className="flex items-center">
                      {activeTab === "active" ? "Date of Joining" : "Termination Date"}
                      {sortField === (activeTab === "active" ? "dateOfJoining" : "terminationDate") && (
                        <ArrowUpDown className="ml-1 h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("employeeType")}>
                    <div className="flex items-center">
                      Type
                      {sortField === "employeeType" && <ArrowUpDown className="ml-1 h-4 w-4" />}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    {activeTab === "active" && (
                      <TableCell>
                        <Checkbox
                          checked={selectedEmployees.has(employee.id)}
                          onCheckedChange={(checked) => handleSelectEmployee(employee.id, !!checked)}
                          aria-label={`Select ${employee.firstName} ${employee.lastName}`}
                        />
                      </TableCell>
                    )}
                    <TableCell>{employee.employeeNumber || "N/A"}</TableCell>
                    <TableCell className="font-medium">
                      {employee.firstName} {employee.lastName}
                    </TableCell>
                    <TableCell>{employee.vendorName}</TableCell>
                    <TableCell>${employee.billRate.toFixed(2)}</TableCell>
                    <TableCell>${employee.payRate.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={employee.status === "active" ? "default" : "secondary"}>
                        {employee.status === "active" ? "Active" : "Terminated"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {sowStatus[employee.id] ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewSow(employee.id)}
                              disabled={isViewingSow === employee.id}
                              title="View SOW"
                            >
                              {isViewingSow === employee.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Eye className="h-4 w-4 text-blue-600" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownloadSow(employee.id, `${employee.firstName} ${employee.lastName}`)}
                              disabled={isViewingSow === employee.id}
                              title="Download SOW"
                            >
                              <DownloadIcon className="h-4 w-4 text-green-600" />
                            </Button>
                            <div className="relative">
                              <input
                                type="file"
                                accept="application/pdf"
                                className="absolute inset-0 opacity-0 cursor-pointer w-8 h-8"
                                onChange={(e) => handleFileUpload(employee.id, e)}
                                disabled={isUploadingSow === employee.id}
                                title="Update SOW"
                              />
                              <Button variant="ghost" size="icon" disabled={isUploadingSow === employee.id}>
                                {isUploadingSow === employee.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Upload className="h-4 w-4 text-gray-500" />
                                )}
                              </Button>
                            </div>
                          </>
                        ) : (
                          <div className="relative">
                            <input
                              type="file"
                              accept="application/pdf"
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              onChange={(e) => handleFileUpload(employee.id, e)}
                              disabled={isUploadingSow === employee.id}
                              title="Upload SOW"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full gap-1"
                              disabled={isUploadingSow === employee.id}
                            >
                              {isUploadingSow === employee.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Upload className="h-3 w-3" />
                              )}
                              Upload
                            </Button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    {activeTab === "active" && selectedMonth && (
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {isLoadingHours ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : (
                            <Input
                              type="number"
                              min="0"
                              step="0.5"
                              value={hoursWorked[employee.id] || ""}
                              onChange={(e) => handleHoursChange(employee.id, e.target.value)}
                              className="w-20"
                            />
                          )}
                          {savingEmployeeId === employee.id && (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        {activeTab === "active" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditEmployee(employee)}
                              title="Edit Employee"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleTerminateEmployee(employee)}
                              title="Terminate Employee"
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(employee.id)}
                          disabled={isDeleting === employee.id}
                        >
                          {isDeleting === employee.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {activeTab === "active"
                        ? formatDate(employee.dateOfJoining)
                        : formatDate(employee.terminationDate)}
                    </TableCell>
                    <TableCell>{employee.employeeType || "W2-Employee"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Vendor Selection Dialog */}
      <Dialog open={showVendorDialog} onOpenChange={setShowVendorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Vendor for Invoices</DialogTitle>
            <DialogDescription>
              Choose the vendor that will be issuing the invoices for the selected employees.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {vendors.length === 0 ? (
              <div className="flex items-center rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-800">
                <AlertCircle className="mr-2 h-5 w-5" />
                <p>No vendors available. Please add vendors first.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="vendorId">Select Vendor</Label>
                <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                  <SelectTrigger id="vendorId">
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVendorDialog(false)}>
              Cancel
            </Button>
            <Button onClick={generateInvoicesForSelectedEmployees} disabled={vendors.length === 0}>
              Generate Invoices
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => !open && setShowEditDialog(false)}>
        <DialogContent className="max-h-[90vh] w-full overflow-y-auto sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>Update employee details. Click save when you're done.</DialogDescription>
          </DialogHeader>

          {validationError && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-6 py-4">
            {/* Employee Number - Read Only */}
            <div className="space-y-2">
              <Label htmlFor="edit-employeeNumber">Employee #</Label>
              <Input id="edit-employeeNumber" value={editingEmployee?.employeeNumber || ""} disabled />
            </div>

            {/* First Name */}
            <div className="space-y-2">
              <Label htmlFor="edit-firstName">First Name</Label>
              <Input
                id="edit-firstName"
                name="firstName"
                value={editingEmployee?.firstName || ""}
                onChange={handleEditInputChange}
              />
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <Label htmlFor="edit-lastName">Last Name</Label>
              <Input
                id="edit-lastName"
                name="lastName"
                value={editingEmployee?.lastName || ""}
                onChange={handleEditInputChange}
              />
            </div>

            {/* Employee Type */}
            <div className="space-y-2">
              <Label htmlFor="edit-employeeType">Employee Type</Label>
              <Select
                value={editingEmployee?.employeeType || "W2-Employee"}
                onValueChange={(value) => handleEditSelectChange("employeeType", value)}
              >
                <SelectTrigger id="edit-employeeType">
                  <SelectValue placeholder="Select employee type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="W2-Employee">W2-Employee</SelectItem>
                  <SelectItem value="1099-Contractor">1099-Contractor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Client */}
            <div className="space-y-2">
              <Label htmlFor="edit-billToParty">Client</Label>
              <Select
                value={editingEmployee?.billToPartyId || ""}
                onValueChange={(value) => handleEditSelectChange("billToPartyId", value)}
              >
                <SelectTrigger id="edit-billToParty">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date of Joining */}
            <div className="space-y-2">
              <Label htmlFor="edit-dateOfJoining">Date of Joining</Label>
              <Input
                id="edit-dateOfJoining"
                name="dateOfJoining"
                type="date"
                value={editingEmployee?.dateOfJoining || ""}
                onChange={handleEditInputChange}
              />
            </div>

            {/* Bill Rate */}
            <div className="space-y-2">
              <Label htmlFor="edit-billRate">Bill Rate ($/hr)</Label>
              <Input
                id="edit-billRate"
                name="billRate"
                type="number"
                min="0"
                step="0.01"
                value={editingEmployee?.billRate || ""}
                onChange={handleEditInputChange}
              />
            </div>

            {/* Pay Rate */}
            <div className="space-y-2">
              <Label htmlFor="edit-payRate">Pay Rate ($/hr)</Label>
              <Input
                id="edit-payRate"
                name="payRate"
                type="number"
                min="0"
                step="0.01"
                value={editingEmployee?.payRate || ""}
                onChange={handleEditInputChange}
              />
              <p className="text-xs text-muted-foreground">Pay rate cannot exceed bill rate</p>
            </div>

            {/* Referrals Section */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Referral Companies</Label>
                {referrals.length === 0 && (
                  <Link href="/manage-parties" className="text-xs text-primary hover:underline">
                    Add referral companies
                  </Link>
                )}
              </div>

              {editingEmployee?.referrals && editingEmployee.referrals.length > 0 ? (
                <div className="max-h-[150px] overflow-y-auto space-y-2">
                  {editingEmployee.referrals.map((referral) => (
                    <div key={referral.id} className="flex items-center justify-between rounded-md border p-2">
                      <div>
                        <span className="font-medium">{referral.name}</span>
                        <Badge variant="outline" className="ml-2">
                          ${referral.fee}/hr
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveReferralFromEdit(referral.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No referrals assigned</div>
              )}

              <div className="space-y-2">
                <Label>Add Referral</Label>
                <div className="flex space-x-2">
                  <div className="flex-1">
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
                  <div className="w-24">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Fee/hr"
                      value={currentReferralFee}
                      onChange={(e) => setCurrentReferralFee(e.target.value)}
                    />
                  </div>
                  <Button type="button" variant="outline" onClick={handleAddReferralToEdit}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveEmployeeEdit} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Terminate Employee Dialog */}
      <Dialog open={showTerminateDialog} onOpenChange={(open) => !open && setShowTerminateDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terminate Employee</DialogTitle>
            <DialogDescription>
              Set a termination date for this employee. They will be moved to the terminated employees list.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="terminationDate">Termination Date</Label>
              <Input
                id="terminationDate"
                type="date"
                value={terminationDate}
                onChange={(e) => setTerminationDate(e.target.value)}
              />
            </div>

            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-800">
              <AlertCircle className="mb-2 h-5 w-5" />
              <p className="text-sm">
                This will mark{" "}
                <strong>
                  {terminatingEmployee?.firstName} {terminatingEmployee?.lastName}
                </strong>{" "}
                as terminated. They will no longer appear in the active employees list.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTerminateDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={terminateEmployee}>
              Terminate Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
