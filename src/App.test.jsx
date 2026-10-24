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
  default:({onEnter,enabled,leaving})=><div aria-label="Intro gate" data-leaving={leaving}>
    <button disabled={!enabled||leaving} onClick={onEnter}>Start</button>
  </div>,
}))
vi.mock('./components/JourneyShell',()=>({
  default:({onReady,introPhase,onIntroComplete})=><div aria-label="Journey" data-intro-phase={introPhase}>
    <button onClick={onReady}>Render first frame</button>
    <button onClick={onIntroComplete}>Finish introduction</button>
  </div>,
}))

describe('App startup lifecycle',()=>{
  it('keeps one opaque gate and one journey mounted throughout loading and introduction',()=>{
    render(<App/>)
    const journey=screen.getByLabelText('Journey')
    expect(screen.getByText('Loader ready: false')).toBeInTheDocument()
    const gate=screen.getByLabelText('Intro gate')
    expect(screen.getByRole('button',{name:'Start'})).toBeDisabled()
    expect(journey).toHaveAttribute('data-intro-phase','waiting')

    fireEvent.click(screen.getByRole('button',{name:'Render first frame'}))
    expect(screen.getByText('Loader ready: true')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'Finish loader'}))
    expect(screen.getByRole('button',{name:'Start'})).toBeInTheDocument()
    expect(screen.getByRole('button',{name:'Start'})).toBeEnabled()
    expect(screen.getByLabelText('Intro gate')).toBe(gate)
    expect(screen.getByLabelText('Journey')).toBe(journey)

    fireEvent.click(screen.getByRole('button',{name:'Start'}))
    expect(screen.getByLabelText('Journey')).toBe(journey)
    expect(journey).toHaveAttribute('data-intro-phase','playing')
    expect(gate).toHaveAttribute('data-leaving','true')
    expect(screen.getByRole('button',{name:'Start'})).toBeDisabled()

    expect(screen.getByRole('button',{name:'Skip introduction'})).toHaveFocus()

    fireEvent.click(screen.getByRole('button',{name:'Finish introduction'}))
    expect(journey).toHaveAttribute('data-intro-phase','complete')
    expect(screen.queryByLabelText('Intro gate')).not.toBeInTheDocument()
    expect(screen.queryByRole('button',{name:'Skip introduction'})).not.toBeInTheDocument()
  })

  it('lets the user skip the introduction without remounting the scene',()=>{
    render(<App/>)
    const journey=screen.getByLabelText('Journey')
    fireEvent.click(screen.getByRole('button',{name:'Render first frame'}))
    fireEvent.click(screen.getByRole('button',{name:'Finish loader'}))
    fireEvent.click(screen.getByRole('button',{name:'Start'}))
    expect(screen.getByRole('button',{name:'Skip introduction'})).toHaveFocus()
    fireEvent.click(screen.getByRole('button',{name:'Skip introduction'}))
    expect(screen.getByLabelText('Journey')).toBe(journey)
    expect(journey).toHaveAttribute('data-intro-phase','complete')
  })
})
