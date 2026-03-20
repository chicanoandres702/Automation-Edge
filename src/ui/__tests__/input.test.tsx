import * as React from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import { Input } from '../input'
import { vi, describe, it, expect, afterEach } from 'vitest'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Input', () => {
  it('renders with generated id when no id provided', () => {
    render(<Input placeholder="Type here" />)
    const el = screen.getByPlaceholderText('Type here') as HTMLInputElement
    expect(el).toBeInTheDocument()
    expect(el.id).toMatch(/^input-/)
  })

  it('uses provided id when given', () => {
    render(<Input id="my-id" />)
    const el = screen.getByRole('textbox') as HTMLInputElement
    expect(el.id).toBe('my-id')
  })

  it('focuses when focused programmatically', () => {
    render(<Input placeholder="focusable" />)
    const el = screen.getByPlaceholderText('focusable') as HTMLInputElement
    // use the native focus method to update document.activeElement in jsdom
    el.focus()
    expect(document.activeElement).toBe(el)
  })
})
