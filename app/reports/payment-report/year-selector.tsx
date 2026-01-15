"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface YearSelectorProps {
    currentYear: number
}

export function YearSelector({ currentYear }: YearSelectorProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Generate a range of years (current year +/- 5 years)
    const years = []
    const baseYear = new Date().getFullYear()
    for (let i = baseYear - 5; i <= baseYear + 1; i++) {
        years.push(i)
    }

    // Sort years in descending order
    years.sort((a, b) => b - a)

    const handleYearChange = (value: string) => {
        const params = new URLSearchParams(searchParams)
        params.set("year", value)
        router.push(`?${params.toString()}`)
    }

    return (
        <div className="flex items-center space-x-4">
            <span className="text-sm font-medium">Select Year:</span>
            <Select value={currentYear.toString()} onValueChange={handleYearChange}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select Year" />
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
    )
}
