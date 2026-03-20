"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ children, className, ...props }, ref) => {
  return (
    <select ref={ref} className={cn("rounded-md border px-2 py-1 text-sm", className)} {...props}>
      {children}
    </select>
  )
})
Select.displayName = "Select"
