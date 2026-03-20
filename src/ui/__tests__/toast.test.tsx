import * as React from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import { Toast, ToastTitle, ToastDescription } from '../toast'
import { vi, describe, it, expect, afterEach } from 'vitest'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Toast (basic)', () => {
  it('renders content when open and hides when closed', () => {
    const { rerender } = render(
      <Toast open>
        <ToastTitle>Hey</ToastTitle>
        <ToastDescription>World</ToastDescription>
      </Toast>
    )

    // Radix may render both visible and sr-only elements; assert presence via queryAll
    expect(screen.queryAllByText('World').length).toBeGreaterThan(0)

    rerender(
      <Toast open={false}>
        <ToastTitle>Hey</ToastTitle>
        <ToastDescription>World</ToastDescription>
      </Toast>
    )

    expect(screen.queryAllByText('World').length).toBe(0)
  })
})
