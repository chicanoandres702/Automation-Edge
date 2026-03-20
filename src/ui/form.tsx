"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {}

export const Form = React.forwardRef<HTMLFormElement, FormProps>(({ children, className, ...props }, ref) => (
  <form ref={ref} className={cn("w-full", className)} {...props}>
    {children}
  </form>
))

Form.displayName = "Form"
