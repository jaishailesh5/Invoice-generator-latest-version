import type React from "react"
import "@/app/globals.css"
import { Inter } from "next/font/google"
import { ToastProvider, ToastInitializer } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toast"
import { Navbar } from "./components/navbar"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Invoice Generator",
  description: "A simple invoice generator application",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ToastProvider>
          <ToastInitializer />
          <Navbar />
          {children}
          <Toaster />
        </ToastProvider>
      </body>
    </html>
  )
}
