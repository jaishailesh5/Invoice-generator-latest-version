// Client-side data loader that uses server actions

/**
 * Loads employees from database if localStorage is empty
 */
export async function loadEmployeesFromDb() {
  try {
    console.log("Fetching employees from database")

    // Import the server action dynamically to avoid bundling server code with client code
    const { loadEmployeesFromDbAction } = await import("@/app/actions/data-loader-actions")
    const result = await loadEmployeesFromDbAction()

    if (result.success && Array.isArray(result.employees)) {
      console.log(`Retrieved ${result.employees.length} employees from database`)

      // Save to localStorage for future use
      localStorage.setItem("employees", JSON.stringify(result.employees))

      return result.employees
    } else {
      console.error("Invalid employee data format from server action:", result)
      return []
    }
  } catch (error) {
    console.error("Error loading employees from database:", error)
    return []
  }
}

/**
 * Loads invoices from database if localStorage is empty
 */
export async function loadInvoicesFromDb() {
  try {
    console.log("Fetching invoices from database")

    // Import the server action dynamically to avoid bundling server code with client code
    const { loadInvoicesFromDbAction } = await import("@/app/actions/data-loader-actions")
    const result = await loadInvoicesFromDbAction()

    if (result.success && Array.isArray(result.invoices)) {
      console.log(`Retrieved ${result.invoices.length} invoices from database`)

      // Save to localStorage for future use
      localStorage.setItem("invoices", JSON.stringify(result.invoices))

      return result.invoices
    } else {
      console.error("Invalid invoice data format from server action:", result)
      return []
    }
  } catch (error) {
    console.error("Error loading invoices from database:", error)
    return []
  }
}

/**
 * Loads monthly hours from database if localStorage is empty
 */
export async function loadMonthlyHoursFromDb() {
  try {
    console.log("Fetching monthly hours from database")

    // Import the server action dynamically to avoid bundling server code with client code
    const { loadMonthlyHoursFromDbAction } = await import("@/app/actions/data-loader-actions")
    const result = await loadMonthlyHoursFromDbAction()

    if (result.success && result.monthlyHours) {
      console.log("Retrieved monthly hours from database")

      // Save to localStorage for future use
      localStorage.setItem("monthlyHours", JSON.stringify(result.monthlyHours))

      return result.monthlyHours
    } else {
      console.error("Invalid monthly hours data format from server action:", result)
      return {}
    }
  } catch (error) {
    console.error("Error loading monthly hours from database:", error)
    return {}
  }
}

/**
 * Loads parties from database if localStorage is empty
 */
export async function loadPartiesFromDb() {
  try {
    console.log("Fetching parties from database")

    // Import the server action dynamically to avoid bundling server code with client code
    const { loadPartiesFromDbAction } = await import("@/app/actions/data-loader-actions")
    const result = await loadPartiesFromDbAction()

    if (result.success && Array.isArray(result.parties)) {
      console.log(`Retrieved ${result.parties.length} parties from database`)

      // Save to localStorage for future use
      localStorage.setItem("parties", JSON.stringify(result.parties))

      return result.parties
    } else {
      console.error("Invalid parties data format from server action:", result)
      return []
    }
  } catch (error) {
    console.error("Error loading parties from database:", error)
    return []
  }
}

// Load a single invoice by invoice number
export async function loadInvoiceByNumber(invoiceNumber: string) {
  try {
    console.log(`Loading invoice with number: ${invoiceNumber}`)

    // Use server action to get invoice by number
    const { loadInvoicesFromDbAction } = await import("@/app/actions/data-loader-actions")
    const result = await loadInvoicesFromDbAction()

    if (result.success && Array.isArray(result.invoices)) {
      // Find the invoice with matching invoice number
      const invoice = result.invoices.find((inv) => inv.invoiceNumber === invoiceNumber)

      if (!invoice) {
        console.log(`No invoice found with number: ${invoiceNumber}`)
        return null
      }

      console.log(`Found invoice with number ${invoiceNumber}, ID: ${invoice.id}`)
      return invoice
    }

    return null
  } catch (error) {
    console.error(`Error loading invoice by number ${invoiceNumber}:`, error)
    return null
  }
}
