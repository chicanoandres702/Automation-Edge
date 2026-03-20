"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  id?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ id, type = "text", className, ...props }, ref) => {
  const reactId = React.useId()
  const inputId = id ?? `input-${reactId}`

  return (
    <input
      id={inputId}
      ref={ref}
      type={type}
      className={cn(
        "block w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
})
Input.displayName = "Input"

export { Input }
