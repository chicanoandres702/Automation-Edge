"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement> & {
  onCheckedChange?: (val: any) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({ className, onCheckedChange, ...props }, ref) => {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={cn("rounded-sm", className)}
      onChange={(e) => {
        if (onCheckedChange) onCheckedChange((e.target as HTMLInputElement).checked)
        if (props.onChange) props.onChange(e)
      }}
      {...props}
    />
  )
})
Checkbox.displayName = "Checkbox"

export { Checkbox }
