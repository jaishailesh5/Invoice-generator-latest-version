"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { TrendingUp, TrendingDown, Info } from "lucide-react"
import { formatCurrency } from "../utils"

interface FinancialInsightsProps {
  currentPeriodData: {
    revenue: number
    expenses: number
    profit: number
    profitMargin: number
  }
  previousPeriodData?: {
    revenue: number
    expenses: number
    profit: number
    profitMargin: number
  }
  periodType: "month" | "year"
}

export function FinancialInsights({ currentPeriodData, previousPeriodData, periodType }: FinancialInsightsProps) {
  // If no previous period data, just show current period stats
  if (!previousPeriodData) {
    return (
      <Alert variant="default" className="mb-4 bg-muted/50">
        <Info className="h-4 w-4" />
        <AlertTitle>Current {periodType} summary</AlertTitle>
        <AlertDescription>
          Revenue: {formatCurrency(currentPeriodData.revenue)} | Profit: {formatCurrency(currentPeriodData.profit)} |
          Margin: {currentPeriodData.profitMargin.toFixed(1)}%
        </AlertDescription>
      </Alert>
    )
  }

  // Calculate percentage changes
  const revenueChange = ((currentPeriodData.revenue - previousPeriodData.revenue) / previousPeriodData.revenue) * 100
  const profitChange = ((currentPeriodData.profit - previousPeriodData.profit) / previousPeriodData.profit) * 100
  const marginChange = currentPeriodData.profitMargin - previousPeriodData.profitMargin

  // Determine if changes are positive or negative
  const isRevenuePositive = revenueChange > 0
  const isProfitPositive = profitChange > 0
  const isMarginPositive = marginChange > 0

  // Generate insights based on the data
  const insights = []

  if (Math.abs(revenueChange) >= 5) {
    insights.push(
      <Alert
        key="revenue"
        variant={isRevenuePositive ? "default" : "destructive"}
        className={`mb-2 ${isRevenuePositive ? "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300" : ""}`}
      >
        {isRevenuePositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        <AlertTitle>Revenue {isRevenuePositive ? "Increase" : "Decrease"}</AlertTitle>
        <AlertDescription>
          Revenue has {isRevenuePositive ? "increased" : "decreased"} by {Math.abs(revenueChange).toFixed(1)}% compared
          to the previous {periodType}.
        </AlertDescription>
      </Alert>,
    )
  }

  if (Math.abs(profitChange) >= 5) {
    insights.push(
      <Alert
        key="profit"
        variant={isProfitPositive ? "default" : "destructive"}
        className={`mb-2 ${isProfitPositive ? "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300" : ""}`}
      >
        {isProfitPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        <AlertTitle>Profit {isProfitPositive ? "Increase" : "Decrease"}</AlertTitle>
        <AlertDescription>
          Profit has {isProfitPositive ? "increased" : "decreased"} by {Math.abs(profitChange).toFixed(1)}% compared to
          the previous {periodType}.
        </AlertDescription>
      </Alert>,
    )
  }

  if (Math.abs(marginChange) >= 2) {
    insights.push(
      <Alert
        key="margin"
        variant={isMarginPositive ? "default" : "destructive"}
        className={`mb-2 ${isMarginPositive ? "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300" : ""}`}
      >
        {isMarginPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        <AlertTitle>Profit Margin {isMarginPositive ? "Increase" : "Decrease"}</AlertTitle>
        <AlertDescription>
          Profit margin has {isMarginPositive ? "increased" : "decreased"} by {Math.abs(marginChange).toFixed(1)}{" "}
          percentage points compared to the previous {periodType}.
        </AlertDescription>
      </Alert>,
    )
  }

  // If no significant changes, show a neutral message
  if (insights.length === 0) {
    insights.push(
      <Alert key="stable" variant="default" className="mb-2 bg-muted/50">
        <Info className="h-4 w-4" />
        <AlertTitle>Stable Performance</AlertTitle>
        <AlertDescription>
          Financial performance is relatively stable compared to the previous {periodType}.
        </AlertDescription>
      </Alert>,
    )
  }

  return <div className="space-y-2">{insights}</div>
}
