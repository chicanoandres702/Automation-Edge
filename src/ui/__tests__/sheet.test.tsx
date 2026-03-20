import * as React from 'react'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import Sheet, { SheetContent, SheetTitle } from '../sheet'
import { vi, describe, it, expect, afterEach } from 'vitest'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Sheet (basic)', () => {
  it('renders when open and shows children', () => {
    render(
      <Sheet open={true} onOpenChange={() => {}}>
        <SheetContent>
          <SheetTitle>Sheet Title</SheetTitle>
        </SheetContent>
      </Sheet>
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Sheet Title')).toBeInTheDocument()
  })

  it('calls onOpenChange(false) when Escape is pressed', () => {
    const onOpenChange = vi.fn()
    render(
      <Sheet open={true} onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetTitle>Close Test</SheetTitle>
        </SheetContent>
      </Sheet>
    )

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('calls onOpenChange(false) when clicking outside', () => {
    const onOpenChange = vi.fn()
    render(
      <div>
        <Sheet open={true} onOpenChange={onOpenChange}>
          <SheetContent>
            <SheetTitle>Outside Test</SheetTitle>
          </SheetContent>
        </Sheet>
        <button data-testid="outside">Outside</button>
      </div>
    )

    fireEvent.mouseDown(document.body)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
