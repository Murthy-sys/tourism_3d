import { fireEvent,render,screen } from '@testing-library/react'
import { describe,expect,it,vi } from 'vitest'
import IntroGate from './IntroGate'

describe('IntroGate',()=>{
  it('starts the visual journey without sound controls',()=>{
    render(<IntroGate onEnter={vi.fn()}/>)
    expect(screen.getByRole('button',{name:'Start'})).toBeInTheDocument()
    expect(screen.queryByText(/sound/i)).not.toBeInTheDocument()
  })
  it('waits for readiness and starts only once without deferred callbacks',()=>{
    const onEnter=vi.fn()
    const view=render(<IntroGate enabled={false} onEnter={onEnter}/>)
    const start=screen.getByRole('button',{name:'Start',hidden:true})
    expect(start).toBeDisabled()
    fireEvent.click(start)
    expect(onEnter).not.toHaveBeenCalled()

    view.rerender(<IntroGate enabled onEnter={onEnter}/>)
    fireEvent.click(start)
    fireEvent.click(start)
    expect(onEnter).toHaveBeenCalledOnce()
    view.rerender(<IntroGate enabled={false} leaving onEnter={onEnter}/>)
    expect(view.container.querySelector('.gate')).toHaveClass('gate--leaving')
    expect(view.container.querySelector('.gate')).toHaveAttribute('inert')
  })
  it('releases Start focus before its gate becomes hidden',()=>{
    const onEnter=vi.fn(()=>expect(document.activeElement).toBe(document.body))
    render(<IntroGate onEnter={onEnter}/>)
    const start=screen.getByRole('button',{name:'Start'})
    start.focus()
    expect(start).toHaveFocus()
    fireEvent.click(start)
    expect(onEnter).toHaveBeenCalledOnce()
    expect(start).not.toHaveFocus()
  })
})
