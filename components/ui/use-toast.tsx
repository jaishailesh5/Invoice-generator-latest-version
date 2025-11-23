"use client"

import * as React from "react"

type ToastProps = {
  id: string
  title: string
  description: string
  variant?: "default" | "destructive"
}

type ToastContextType = {
  toasts: ToastProps[]
  addToast: (toast: Omit<ToastProps, "id">) => void
  removeToast: (id: string) => void
}

const ToastContext = React.createContext<ToastContextType>({
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
})

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastProps[]>([])

  const addToast = React.useCallback(({ title, description, variant = "default" }: Omit<ToastProps, "id">) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, title, description, variant }])

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, 3000)
  }, [])

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const value = React.useMemo(() => ({ toasts, addToast, removeToast }), [toasts, addToast, removeToast])

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

// Create a safe version of toast that doesn't directly use the hook
// This avoids the "React Hook cannot be called inside a callback" error
const createToast = () => {
  let addToastFunction: (toast: Omit<ToastProps, "id">) => void = () => {}

  // This will be called once during initialization to set the function
  const setToastFunction = (fn: (toast: Omit<ToastProps, "id">) => void) => {
    addToastFunction = fn
  }

  return {
    setToastFunction,
    default: (props: { title: string; description: string }) => {
      addToastFunction({ ...props, variant: "default" })
    },
    destructive: (props: { title: string; description: string }) => {
      addToastFunction({ ...props, variant: "destructive" })
    },
  }
}

export const toast = createToast()

// ToastInitializer component to initialize the toast function
export function ToastInitializer() {
  const { addToast } = useToast()

  React.useEffect(() => {
    toast.setToastFunction(addToast)
  }, [addToast])

  return null
}
