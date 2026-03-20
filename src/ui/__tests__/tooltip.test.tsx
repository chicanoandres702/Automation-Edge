import * as React from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import { Tooltip, TooltipTrigger, TooltipContent } from '../tooltip'
import { vi, describe, it, expect, afterEach } from 'vitest'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Tooltip (basic)', () => {
  it('renders content when open (controlled) and hides when closed', () => {
    const { rerender } = render(
      <Tooltip open>
        <TooltipTrigger asChild><button>Hover</button></TooltipTrigger>
        <TooltipContent>Tip text</TooltipContent>
      </Tooltip>
    )

    const tip = screen.getByRole('tooltip')
    expect(tip).toHaveTextContent('Tip text')

    rerender(
      <Tooltip open={false}>
        <TooltipTrigger asChild><button>Hover</button></TooltipTrigger>
        <TooltipContent>Tip text</TooltipContent>
      </Tooltip>
    )

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('renders content when open via prop (focus scenario)', () => {
    render(
      <Tooltip open>
        <TooltipTrigger asChild><button>Focus</button></TooltipTrigger>
        <TooltipContent>FocusTip</TooltipContent>
      </Tooltip>
    )
    const tip2 = screen.getByRole('tooltip')
    expect(tip2).toHaveTextContent('FocusTip')
  })
})
