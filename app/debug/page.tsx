"use client"

import { useState, useEffect } from "react"
import { checkEmployeeSowStatusAction } from "@/app/actions/document-actions"
import { loadEmployeesFromDbAction } from "@/app/actions/data-loader-actions"

export default function DebugPage() {
    const [logs, setLogs] = useState<string[]>([])

    const addLog = (msg: string) => setLogs(prev => [...prev, msg])

    const runTests = async () => {
        addLog("Starting tests...")

        try {
            addLog("Testing loadEmployeesFromDbAction...")
            const empResult = await loadEmployeesFromDbAction()
            addLog(`loadEmployeesFromDbAction result: ${JSON.stringify(empResult)}`)

            if (empResult.success && empResult.employees && empResult.employees.length > 0) {
                const empId = empResult.employees[0].id
                addLog(`Testing checkEmployeeSowStatusAction for ${empId}...`)
                const sowResult = await checkEmployeeSowStatusAction(empId)
                addLog(`checkEmployeeSowStatusAction result: ${JSON.stringify(sowResult)}`)
            } else {
                addLog("No employees found to test SOW status")
            }

        } catch (error) {
            addLog(`ERROR: ${error instanceof Error ? error.message : String(error)}`)
        }

        addLog("Tests completed")
    }

    return (
        <div className="p-10">
            <h1 className="text-2xl font-bold mb-4">Debug Page</h1>
            <button
                onClick={runTests}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mb-4"
            >
                Run Server Action Tests
            </button>
            <div className="bg-gray-100 p-4 rounded border font-mono text-sm whitespace-pre-wrap">
                {logs.map((log, i) => <div key={i}>{log}</div>)}
            </div>
        </div>
    )
}
