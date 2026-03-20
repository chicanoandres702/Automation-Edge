import * as React from 'react'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ScrollArea } from '../scroll-area'
import { vi, describe, it, expect, afterEach } from 'vitest'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ScrollArea', () => {
  it('renders with role=region and label and can be focused', () => {
    render(
      <ScrollArea axis="vertical" label="scroller">
        <div className="h-48">content</div>
      </ScrollArea>
    )

    const region = screen.getByRole('region', { name: 'scroller' }) as HTMLElement
    expect(region).toBeInTheDocument()
    expect(region.className).toContain('overflow-y-auto')
    // call focus() so jsdom updates document.activeElement
    region.focus()
    expect(document.activeElement).toBe(region)
  })
})
