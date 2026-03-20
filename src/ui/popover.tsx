"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type PopoverContextType = {
  open: boolean
  setOpen: (open: boolean) => void
}

const PopoverContext = React.createContext<PopoverContextType | undefined>(undefined)

export type PopoverProps = React.HTMLAttributes<HTMLDivElement> & {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export const Popover: React.FC<PopoverProps> = ({ children, open: controlledOpen, onOpenChange, ...props }) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen

  const setOpen = React.useCallback((v: boolean) => {
    if (!isControlled) setUncontrolledOpen(v)
    onOpenChange?.(v)
  }, [isControlled, onOpenChange])

  const ref = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (ref.current && !ref.current.contains(target)) {
        setOpen(false)
      }
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("mousedown", onClick)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("mousedown", onClick)
    }
  }, [open, setOpen])

  return (
    <PopoverContext.Provider value={{ open, setOpen }}>
      <div ref={ref} className={cn("relative inline-block", props.className)} {...props}>
        {children}
      </div>
    </PopoverContext.Provider>
  )
}

export const PopoverTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ children, onClick, ...props }, ref) => {
  const ctx = React.useContext(PopoverContext)
  if (!ctx) throw new Error("PopoverTrigger must be used within Popover")
  const { open, setOpen } = ctx
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e)
    setOpen(!open)
  }
  return (
    <button
      type="button"
      aria-expanded={open ? "true" : "false"}
      onClick={handleClick}
      ref={ref}
      {...props}
      className={cn("inline-flex items-center", props.className)}
    >
      {children}
    </button>
  )
})
PopoverTrigger.displayName = "PopoverTrigger"

export const PopoverContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, className, ...props }, ref) => {
  const ctx = React.useContext(PopoverContext)
  if (!ctx) throw new Error("PopoverContent must be used within Popover")
  const { open } = ctx
  if (!open) return null
  return (
    <div
      ref={ref}
      role="dialog"
      className={cn(
        "absolute z-50 mt-2 left-0 min-w-[200px] bg-background shadow rounded p-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
PopoverContent.displayName = "PopoverContent"

export const PopoverClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ children, onClick, ...props }, ref) => {
  const ctx = React.useContext(PopoverContext)
  if (!ctx) throw new Error("PopoverClose must be used within Popover")
  const { setOpen } = ctx
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e)
    setOpen(false)
  }
  return (
    <button ref={ref} onClick={handleClick} {...props} className={cn("ml-2", props.className)}>
      {children}
    </button>
  )
})
PopoverClose.displayName = "PopoverClose"

export default Popover
// the older stubbed implementation was removed — this file contains the
// production Popover implementation above
