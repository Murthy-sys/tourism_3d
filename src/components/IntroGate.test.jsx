import { render,screen } from '@testing-library/react'
import { describe,expect,it,vi } from 'vitest'
import IntroGate from './IntroGate'

describe('IntroGate',()=>{
  it('starts the visual journey without sound controls',()=>{
    render(<IntroGate onEnter={vi.fn()}/>)
    expect(screen.getByRole('button',{name:'Start'})).toBeInTheDocument()
    expect(screen.queryByText(/sound/i)).not.toBeInTheDocument()
  })
})
