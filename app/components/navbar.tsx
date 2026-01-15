"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export function Navbar() {
  const pathname = usePathname()

  const navItems = [
    { name: "Home", href: "/" },
    { name: "Manage Parties", href: "/manage-parties" },
    { name: "Create Employee", href: "/create-employee" },
    { name: "Employee List", href: "/employee-list" },
    { name: "Invoice History", href: "/invoice-history" },
    { name: "Finance Dashboard", href: "/finance-dashboard" },
    { name: "Reports", href: "/reports/payment-report" },
  ]

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-gray-800">Invoice App</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-4 overflow-x-auto">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${pathname === item.href
                      ? "border-indigo-500 text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium whitespace-nowrap`}
                >
                  {item.name}
                </Link>
              ))}
              {/* Database Initialization */}
              <Link
                href="/db-init"
                className={`${pathname === "/db-init"
                    ? "border-indigo-500 text-gray-900"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium whitespace-nowrap`}
              >
                Database Init
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
