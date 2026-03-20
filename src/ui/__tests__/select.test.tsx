import * as React from 'react'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Select } from '../select'
import { vi, describe, it, expect, afterEach } from 'vitest'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Select', () => {
  it('renders placeholder option and generates id', () => {
    render(
      <Select aria-label="test-select" placeholder="Choose">
        <option value="1">One</option>
      </Select>
    )

    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select).toBeInTheDocument()
    expect(select.id).toMatch(/^select-/)
    // placeholder option should exist and be disabled/hidden
    const placeholder = screen.getByText('Choose') as HTMLOptionElement
    expect(placeholder).toBeInTheDocument()
    expect(placeholder.disabled).toBe(true)
  })

  it('changes value when selecting an option', () => {
    render(
      <Select aria-label="test-select-2">
        <option value="a">A</option>
        <option value="b">B</option>
      </Select>
    )
    const select = screen.getByRole('combobox') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'b' } })
    expect(select.value).toBe('b')
  })
})
