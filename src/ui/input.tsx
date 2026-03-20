"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ type = "text", className, ...props }, ref) => {
    return <input ref={ref} type={type} className={cn("rounded-md border px-2 py-1 text-sm", className)} {...props} />
  }
)
Input.displayName = "Input"

export { Input }
