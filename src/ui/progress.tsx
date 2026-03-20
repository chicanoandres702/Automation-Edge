"use client"

import * as React from "react"

export type ProgressProps = React.HTMLAttributes<HTMLDivElement> & { value?: number }

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(({ value = 0, className, ...props }, ref) => {
  return (
    // Use native <progress> to avoid inline styles; consumer can style via CSS.
    <progress ref={ref as any} value={value} max={100} className={className} {...(props as any)} />
  )
})
Progress.displayName = "Progress"

export { Progress }
