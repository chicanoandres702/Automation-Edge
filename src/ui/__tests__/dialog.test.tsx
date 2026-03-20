import * as React from 'react'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import Dialog, { DialogContent, DialogTitle } from '../dialog2'
import { vi, describe, it, expect, afterEach } from 'vitest'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Dialog (basic)', () => {
  it('renders when open and shows children', () => {
    render(
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent>
          <DialogTitle>Test Title</DialogTitle>
        </DialogContent>
      </Dialog>
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Test Title')).toBeInTheDocument()
  })

  it('calls onOpenChange(false) when Escape is pressed', () => {
    const onOpenChange = vi.fn()
    render(
      <Dialog open={true} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogTitle>Close Test</DialogTitle>
        </DialogContent>
      </Dialog>
    )

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('calls onOpenChange(false) when overlay is clicked', () => {
    const onOpenChange = vi.fn()
    render(
      <Dialog open={true} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogTitle>Overlay Test</DialogTitle>
        </DialogContent>
      </Dialog>
    )

    // the top-level wrapper has role="presentation"
    const wrapper = screen.getByRole('presentation')
    fireEvent.click(wrapper)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
