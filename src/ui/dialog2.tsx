"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

export type DialogProps = React.HTMLAttributes<HTMLDivElement> & {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}

/**
 * Simple accessible Dialog implementation using a portal. Provides keyboard
 * handling (Escape to close), body scroll lock while open and semantic
 * roles for basic accessibility.
 */
export const Dialog: React.FC<DialogProps> = ({ children, open, onOpenChange, className, ...props }) => {
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

  // close on outside clicks using a document-level listener to avoid attaching
  // click handlers to non-interactive elements (keeps lint/a11y rules clean)
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

  return createPortal(
    <div className={cn("fixed inset-0 z-50 flex items-center justify-center p-4", className)} role="presentation">
      {/* overlay: clicking should close the dialog. mark it as interactive so a11y linters
          recognise the keyboard handlers and avoid no-noninteractive-element-interactions */}
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 max-w-full w-full max-w-3xl"
        ref={contentRef}
        {...props}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}

export const DialogContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ children, className, ...props }, ref) => (
  <div ref={ref} className={cn("bg-background rounded-2xl shadow-2xl ring-1 ring-white/10", className)} {...props}>
    {children}
  </div>
))
DialogContent.displayName = "DialogContent"

export const DialogFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className, ...props }) => (
  <div className={cn("mt-4 flex items-center justify-end gap-2", className)} {...props}>{children}</div>
)

export const DialogHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className, ...props }) => (
  <div className={cn("mb-4", className)} {...props}>{children}</div>
)

export const DialogTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ children, className, ...props }) => (
  <h2 className={cn("text-lg font-semibold", className)} {...props}>{children}</h2>
)

export const DialogDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ children, className, ...props }) => (
  <p className={cn("text-sm text-muted-foreground", className)} {...props}>{children}</p>
)

export default Dialog
