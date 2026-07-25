import { act,render,screen } from '@testing-library/react'
import { afterEach,describe,expect,it,vi } from 'vitest'
import Preloader from './Preloader'

describe('Preloader readiness',()=>{
  afterEach(()=>vi.useRealTimers())

  it('reserves 100 percent for confirmed journey readiness',()=>{
    vi.useFakeTimers()
    const onDone=vi.fn()
    const view=render(<Preloader ready={false} onDone={onDone}/>)

    act(()=>vi.advanceTimersByTime(10000))
    expect(screen.queryByText('100')).not.toBeInTheDocument()
    expect(onDone).not.toHaveBeenCalled()

    view.rerender(<Preloader ready onDone={onDone}/>)
    act(()=>vi.advanceTimersByTime(2000))
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(onDone).toHaveBeenCalledOnce()
  })
})
