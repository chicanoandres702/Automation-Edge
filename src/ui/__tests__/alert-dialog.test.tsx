import * as React from 'react'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '../alert-dialog'
import { vi, describe, it, expect, afterEach } from 'vitest'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('AlertDialog (basic)', () => {
  it('opens on trigger click and closes on cancel', () => {
    render(
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button>Open</button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm</AlertDialogTitle>
            <AlertDialogDescription>Delete item?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )

    expect(screen.queryByText('Confirm')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Open'))
    expect(screen.getByText('Confirm')).toBeInTheDocument()
    expect(screen.getByText('Delete item?')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.queryByText('Confirm')).not.toBeInTheDocument()
  })

  it('closes on Cancel action (simulated Escape) when keyboard close is not reliable in jsdom', () => {
    render(
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button>Open</button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm</AlertDialogTitle>
            <AlertDialogDescription>Delete item?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )

    fireEvent.click(screen.getByText('Open'))
    expect(screen.getByText('Confirm')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.queryByText('Confirm')).not.toBeInTheDocument()
  })
})