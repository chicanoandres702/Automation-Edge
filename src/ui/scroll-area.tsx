"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export type ScrollAreaProps = React.HTMLAttributes<HTMLDivElement> & {
  /**
   * Which axis should scroll. Defaults to 'both'.
   */
  axis?: "both" | "vertical" | "horizontal"
  /**
   * Optional accessible label for the scroll region.
   */
  label?: string
}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(({ axis = "both", className, children, label, ...props }, ref) => {
  const overflowClass = axis === "horizontal" ? "overflow-x-auto overflow-y-hidden" : axis === "vertical" ? "overflow-y-auto overflow-x-hidden" : "overflow-auto"

  return (
    <div
      ref={ref}
      role="region"
      aria-label={label}
      className={cn(overflowClass, "focus:outline-none focus:ring-2 focus:ring-ring", className)}
      {...props}
    >
      {children}
    </div>
  )
})
ScrollArea.displayName = "ScrollArea"

export { ScrollArea }
