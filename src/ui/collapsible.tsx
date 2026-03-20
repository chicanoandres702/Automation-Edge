"use client"

import * as React from "react"

export const Collapsible = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div {...props}>{children}</div>
)
Collapsible.displayName = "Collapsible"

export const CollapsibleTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ children, ...props }, ref) => <button ref={ref} {...props}>{children}</button>
)
CollapsibleTrigger.displayName = "CollapsibleTrigger"

export const CollapsibleContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, ...props }, ref) => <div ref={ref} {...props}>{children}</div>
)
CollapsibleContent.displayName = "CollapsibleContent"

 
