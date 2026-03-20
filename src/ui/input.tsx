"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return <input ref={ref} className={cn("rounded-md border px-2 py-1 text-sm", className)} {...props} />
  }
)
Input.displayName = "Input"

export { Input }
