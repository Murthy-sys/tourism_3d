import { act,fireEvent,render,screen } from '@testing-library/react'
import { afterEach,describe,expect,it,vi } from 'vitest'
import Preloader from './Preloader'

describe('Preloader readiness',()=>{
  afterEach(()=>vi.useRealTimers())

  it('reserves 100 percent for confirmed journey readiness',()=>{
    vi.useFakeTimers()
    const onDone=vi.fn()
    const view=render(<Preloader ready={false} status={{phase:'assets',completed:2,total:5}} onDone={onDone}/>)

    act(()=>vi.advanceTimersByTime(10000))
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow','33')
    expect(screen.queryByText('100%')).not.toBeInTheDocument()
    expect(onDone).not.toHaveBeenCalled()

    view.rerender(<Preloader status={{phase:'preparing',completed:1,total:1}} onDone={onDone}/>)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow','99')
    expect(onDone).not.toHaveBeenCalled()

    view.rerender(<Preloader ready onDone={onDone}/>)
    act(()=>vi.advanceTimersByTime(2000))
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(onDone).toHaveBeenCalledOnce()
  })
  it('shows a retry action after a failed load and never exits into an incomplete journey',()=>{
    vi.useFakeTimers()
    const onDone=vi.fn(),onRetry=vi.fn()
    const view=render(<Preloader status={{phase:'error'}} onRetry={onRetry} onDone={onDone}/>)
    expect(screen.getByRole('alert')).toHaveTextContent('could not finish loading')
    fireEvent.click(screen.getByRole('button',{name:'Retry loading'}))
    expect(onRetry).toHaveBeenCalledOnce()
    act(()=>vi.advanceTimersByTime(30000))
    expect(onDone).not.toHaveBeenCalled()
    view.rerender(<Preloader status={{phase:'assets',completed:0,total:5}} onRetry={onRetry} onDone={onDone}/>)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow','0')
  })
  it('does not restart its exit when callbacks change and cleans up pending timers',()=>{
    vi.useFakeTimers()
    const original=vi.fn()
    const latest=vi.fn()
    const view=render(<Preloader ready onDone={original}/>)
    act(()=>vi.advanceTimersByTime(500))
    view.rerender(<Preloader ready onDone={latest}/>)
    act(()=>vi.advanceTimersByTime(250))
    expect(original).not.toHaveBeenCalled()
    expect(latest).toHaveBeenCalledOnce()
    view.unmount()
    expect(vi.getTimerCount()).toBe(0)

    const interrupted=render(<Preloader ready onDone={original}/>)
    interrupted.unmount()
    act(()=>vi.advanceTimersByTime(1000))
    expect(original).not.toHaveBeenCalled()
  })
})
