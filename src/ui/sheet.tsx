"use client"

import * as React from "react"

export type SheetProps = React.HTMLAttributes<HTMLDivElement> & {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  side?: "left" | "right"
}

export const Sheet: React.FC<SheetProps> = ({ children, ...props }) => {
  return <div {...props}>{children}</div>
}

export const SheetContent = React.forwardRef<HTMLDivElement, SheetProps>(({ children, ...props }, ref) => (
  <div ref={ref} {...props}>
    {children}
  </div>
))
SheetContent.displayName = "SheetContent"

export default Sheet
