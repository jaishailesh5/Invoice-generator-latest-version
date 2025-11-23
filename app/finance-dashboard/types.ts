export interface Employee {
  id: string
  name: string
  hourlyRate: number
  employeeType?: "W2-Employee" | "1099-Contractor"
}

export interface Client {
  id: string
  name: string
}

export interface Referral {
  id: string
  name: string
}

export interface EmployeeMonthlyData {
  hoursWorked: number
  amountPaid: number
  amountBilled: number
  profit: number
}

export interface ClientMonthlyData {
  amountDue: number
  amountPaid: number
}

export interface ReferralMonthlyData {
  amountPaid: number
}

export interface MonthlyData {
  employees: Employee[]
  clients: Client[]
  referrals: Referral[]
  employeeData: {
    [year: string]: {
      [month: string]: {
        [employeeId: string]: EmployeeMonthlyData
      }
    }
  }
  clientData: {
    [year: string]: {
      [month: string]: {
        [clientId: string]: ClientMonthlyData
      }
    }
  }
  referralData: {
    [year: string]: {
      [month: string]: {
        [referralId: string]: ReferralMonthlyData
      }
    }
  }
}
