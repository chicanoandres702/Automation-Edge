"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

export type SheetProps = React.HTMLAttributes<HTMLDivElement> & {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  side?: "right" | "left" | "top" | "bottom"
}

export const Sheet: React.FC<SheetProps> = ({ children, open, onOpenChange, side = "right", className, ...props }) => {
  React.useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange?.(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onOpenChange])

  const contentRef = React.useRef<HTMLDivElement | null>(null)
  React.useEffect(() => {
    if (!open) return
    const onDown = (e: Event) => {
      const target = e.target as Node
      if (contentRef.current && !contentRef.current.contains(target)) {
        onOpenChange?.(false)
      }
    }
    window.addEventListener("pointerdown", onDown)
    window.addEventListener("mousedown", onDown)
    return () => {
      window.removeEventListener("pointerdown", onDown)
      window.removeEventListener("mousedown", onDown)
    }
  }, [open, onOpenChange])

  if (!open) return null

  const sideClasses = {
    right: "fixed right-0 top-0 h-full w-full max-w-md transform",
    left: "fixed left-0 top-0 h-full w-full max-w-md transform",
    top: "fixed top-0 left-0 w-full h-full max-h-96 transform",
    bottom: "fixed bottom-0 left-0 w-full h-full max-h-96 transform",
  }

  return createPortal(
    <div className={cn("fixed inset-0 z-50", className)} role="presentation">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        ref={contentRef}
        className={cn("relative z-10 bg-background shadow-2xl", sideClasses[side])}
        {...props}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}

export type SheetContentProps = React.ComponentPropsWithoutRef<typeof React.Fragment> & {
  side?: "right" | "left" | "top" | "bottom"
}

export const SheetContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { side?: "right" | "left" | "top" | "bottom" }>(({ children, className, ...props }, ref) => (
  <div ref={ref} className={cn("p-4", className)} {...props}>
    {children}
  </div>
))
SheetContent.displayName = "SheetContent"

export const SheetHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className, ...props }) => (
  <div className={cn("px-4 py-3 border-b", className)} {...props}>
    {children}
  </div>
)
SheetHeader.displayName = "SheetHeader"

export const SheetFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className, ...props }) => (
  <div className={cn("px-4 py-3 border-t", className)} {...props}>
    {children}
  </div>
)
SheetFooter.displayName = "SheetFooter"

export const SheetTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ children, className, ...props }) => (
  <h3 className={cn("text-lg font-semibold", className)} {...props}>
    {children}
  </h3>
)
SheetTitle.displayName = "SheetTitle"

export const SheetDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ children, className, ...props }) => (
  <p className={cn("text-sm text-muted-foreground", className)} {...props}>
    {children}
  </p>
)
SheetDescription.displayName = "SheetDescription"

export default Sheet

