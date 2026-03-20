"use client"

import * as React from "react"

export const Popover = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return <div {...props}>{children}</div>
}

export const PopoverTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ children, ...props }, ref) => <button ref={ref} {...props}>{children}</button>
)
PopoverTrigger.displayName = "PopoverTrigger"

export const PopoverContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, ...props }, ref) => <div ref={ref} {...props}>{children}</div>
)
PopoverContent.displayName = "PopoverContent"
