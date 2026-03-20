"use client"

import * as React from "react"

export type DialogProps = React.HTMLAttributes<HTMLDivElement> & {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export const Dialog: React.FC<DialogProps> = ({ children, ...props }) => {
  return <div {...props}>{children}</div>
}

export const DialogContent = React.forwardRef<HTMLDivElement, DialogProps>(({ children, ...props }, ref) => (
  <div ref={ref} {...props}>
    {children}
  </div>
))
DialogContent.displayName = "DialogContent"

export const DialogFooter: React.FC<DialogProps> = ({ children, ...props }) => <div {...props}>{children}</div>
export const DialogHeader: React.FC<DialogProps> = ({ children, ...props }) => <div {...props}>{children}</div>
export const DialogTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ children, ...props }) => (
  <h2 {...props}>{children}</h2>
)
export const DialogDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ children, ...props }) => (
  <p {...props}>{children}</p>
)

export default Dialog
