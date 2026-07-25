import { fireEvent,render,screen } from '@testing-library/react'
import { describe,expect,it,vi } from 'vitest'
import App from './App'

vi.mock('./components/CustomCursor',()=>({default:()=>null}))
vi.mock('./components/Preloader',()=>({
  default:({ready,onDone})=><div>
    <span>Loader ready: {String(ready)}</span>
    {ready&&<button onClick={onDone}>Finish loader</button>}
  </div>,
}))
vi.mock('./components/IntroGate',()=>({
  default:({onEnter})=><button onClick={onEnter}>Start</button>,
}))
vi.mock('./components/JourneyShell',()=>({
  default:({onReady})=><div aria-label="Journey">
    <button onClick={onReady}>Render first frame</button>
  </div>,
}))

describe('App startup lifecycle',()=>{
  it('keeps one journey mounted behind loading and gate phases',()=>{
    render(<App/>)
    const journey=screen.getByLabelText('Journey')
    expect(screen.getByText('Loader ready: false')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button',{name:'Render first frame'}))
    expect(screen.getByText('Loader ready: true')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'Finish loader'}))
    expect(screen.getByRole('button',{name:'Start'})).toBeInTheDocument()
    expect(screen.getByLabelText('Journey')).toBe(journey)

    fireEvent.click(screen.getByRole('button',{name:'Start'}))
    expect(screen.getByLabelText('Journey')).toBe(journey)
  })
})
