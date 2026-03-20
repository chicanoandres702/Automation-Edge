"use client"

import * as React from "react"

export const RadioGroup = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return <div {...props}>{children}</div>
}

export const RadioGroupItem = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ ...props }, ref) => <input ref={ref} type="radio" {...props} />
)
RadioGroupItem.displayName = "RadioGroupItem"
