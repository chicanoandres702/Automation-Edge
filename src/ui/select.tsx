"use client"

import * as React from "react"

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ children, ...props }, ref) => {
    return (
      <select ref={ref} {...props}>
        {children}
      </select>
    )
  }
)
Select.displayName = "Select"
