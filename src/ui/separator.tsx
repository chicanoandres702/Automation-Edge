"use client"

import * as React from "react"

export type SeparatorProps = React.HTMLAttributes<HTMLHRElement>

const Separator = React.forwardRef<HTMLHRElement, SeparatorProps>(({ className, ...props }, ref) => (
  <hr ref={ref} className={className} {...props} />
))
Separator.displayName = "Separator"

export { Separator }
