"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  id?: string
  placeholder?: string
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ id, className, children, placeholder, ...props }, ref) => {
  const reactId = React.useId()
  const selectId = id ?? `select-${reactId}`

  return (
    <select
      id={selectId}
      ref={ref}
      className={cn(
        "block w-full appearance-none rounded-md border bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {placeholder ? (
        <option value="" disabled hidden>
          {placeholder}
        </option>
      ) : null}
      {children}
    </select>
  )
})
Select.displayName = "Select"
