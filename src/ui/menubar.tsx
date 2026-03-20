"use client"

import * as React from "react"

export const Menubar = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div {...props}>{children}</div>
)

export const MenubarItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ children, ...props }, ref) => (
  <div ref={ref} {...props}>{children}</div>
))
MenubarItem.displayName = "MenubarItem"
