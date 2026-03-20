"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export type ScrollAreaProps = React.HTMLAttributes<HTMLDivElement>

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      role="region"
      tabIndex={0}
      className={cn("overflow-auto focus:outline-none", className)}
      {...props}
    >
      {children}
    </div>
  )
})
ScrollArea.displayName = "ScrollArea"

export { ScrollArea }
