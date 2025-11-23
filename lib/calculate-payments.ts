/**
 * Utility functions for calculating payments
 */

/**
 * Calculate the amount to be paid to an employee
 * @param hours Hours worked
 * @param payRate Employee's pay rate per hour
 * @returns The total amount to be paid
 */
export function calculateEmployeePayment(hours: number, payRate: number): number {
  // Ensure inputs are valid numbers
  if (typeof hours !== "number" || isNaN(hours) || hours < 0) {
    console.error("Invalid hours value:", hours)
    return 0
  }

  // Add extensive debugging
  console.log("DEBUG - calculateEmployeePayment inputs:", {
    hours: hours,
    payRate: payRate,
    typeof_payRate: typeof payRate,
    isNaN_payRate: isNaN(payRate),
    payRate_is_zero: payRate === 0,
    payRate_is_null: payRate === null,
    payRate_is_undefined: payRate === undefined,
  })

  // If pay rate is undefined, null, NaN, or negative, return 0
  if (typeof payRate !== "number" || isNaN(payRate) || payRate < 0) {
    console.error("Invalid pay rate value:", payRate)
    return 0
  }

  // If pay rate is 0, return 0
  if (payRate === 0) {
    console.log("DEBUG - Pay rate is zero, returning 0 payment")
    return 0
  }

  // Calculate payment: hours worked × pay rate
  const payment = hours * payRate
  console.log(`DEBUG - Calculated employee payment: ${payment} (${hours} hours × $${payRate}/hr)`)
  return payment
}

/**
 * Calculate the amount to be paid to a referrer
 * @param hours Hours worked by the employee
 * @param referralFee Referral fee per hour
 * @returns The total amount to be paid to the referrer
 */
export function calculateReferralPayment(hours: number, referralFee: number): number {
  // Ensure inputs are valid numbers
  if (typeof hours !== "number" || isNaN(hours) || hours < 0) {
    console.error("Invalid hours value:", hours)
    return 0
  }

  if (typeof referralFee !== "number" || isNaN(referralFee) || referralFee < 0) {
    console.error("Invalid referral fee value:", referralFee)
    return 0
  }

  // Calculate payment: hours worked × referral fee
  const payment = hours * referralFee

  console.log(`Calculated referral payment: ${payment} (${hours} hours × $${referralFee}/hr)`)

  return payment
}

/**
 * Calculate the profit for an invoice
 * @param totalBilled Total amount billed to client
 * @param employeePayment Amount paid to employee
 * @param referralPayments Total amount paid to referrers
 * @returns The profit amount
 */
export function calculateProfit(totalBilled: number, employeePayment: number, referralPayments = 0): number {
  // Ensure inputs are valid numbers
  if (typeof totalBilled !== "number" || isNaN(totalBilled)) {
    console.error("Invalid total billed value:", totalBilled)
    return 0
  }

  if (typeof employeePayment !== "number" || isNaN(employeePayment)) {
    console.error("Invalid employee payment value:", employeePayment)
    return 0
  }

  if (typeof referralPayments !== "number" || isNaN(referralPayments)) {
    console.error("Invalid referral payments value:", referralPayments)
    return 0
  }

  // Calculate profit: total billed - employee payment - referral payments
  const profit = totalBilled - employeePayment - referralPayments

  console.log(`Calculated profit: ${profit} ($${totalBilled} - $${employeePayment} - $${referralPayments})`)

  return profit
}
