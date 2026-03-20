import * as React from 'react'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Popover, PopoverTrigger, PopoverContent } from '../popover'
import { vi, describe, it, expect, afterEach } from 'vitest'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Popover (basic)', () => {
  it('shows content when trigger clicked and hides when clicking outside', () => {
    render(
      <div>
        <Popover>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Content text</PopoverContent>
        </Popover>
        <button data-testid="outside">Outside</button>
      </div>
    )

    expect(screen.queryByText('Content text')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Open'))
    expect(screen.getByText('Content text')).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByTestId('outside'))
    expect(screen.queryByText('Content text')).not.toBeInTheDocument()
  })

  it('closes on Escape key', () => {
    render(
      <Popover>
        <PopoverTrigger>Toggle</PopoverTrigger>
        <PopoverContent>Escape me</PopoverContent>
      </Popover>
    )
    fireEvent.click(screen.getByText('Toggle'))
    expect(screen.getByText('Escape me')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByText('Escape me')).not.toBeInTheDocument()
  })
})
