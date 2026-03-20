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

export const FormItem: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className, ...props }) => (
  <div className={cn("mb-4", className)} {...props}>
    {children}
  </div>
)
FormItem.displayName = "FormItem"

export const FormLabel: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({ children, className, ...props }) => (
  <label className={cn("block text-sm font-medium text-muted-foreground mb-1", className)} {...props}>
    {children}
  </label>
)
FormLabel.displayName = "FormLabel"

export const FormControl: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className, ...props }) => (
  <div className={cn("mt-1", className)} {...props}>
    {children}
  </div>
)
FormControl.displayName = "FormControl"

export const FormMessage: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ children, className, ...props }) => (
  <p className={cn("text-sm text-destructive mt-1", className)} {...props}>
    {children}
  </p>
)
FormMessage.displayName = "FormMessage"
