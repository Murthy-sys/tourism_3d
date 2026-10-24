import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {render,screen} from '@testing-library/react'
import {describe,expect,it} from 'vitest'
import {
  formatSocialMetric,
  getSocialMetricWeight,
} from './SocialMediaPerformance'
import SocialMediaPerformance from './SocialMediaPerformance'
import {SOCIAL_MEDIA_METRICS} from '../journey/chapters'

describe('SocialMediaPerformance',()=>{
  it('formats deterministic sample values and stable pending states',()=>{
    expect(formatSocialMetric(SOCIAL_MEDIA_METRICS[0],1)).toBe('500+')
    expect(formatSocialMetric(SOCIAL_MEDIA_METRICS[2],1)).toBe('Updating soon')
    expect(formatSocialMetric(SOCIAL_MEDIA_METRICS[3],1)).toBe('Updating soon')
    expect(formatSocialMetric(SOCIAL_MEDIA_METRICS[1],.5))
      .toBe('Updating soon')
    expect(getSocialMetricWeight(.80,0,false)).toBe(0)
    expect(getSocialMetricWeight(.83,5,false)).toBe(1)
    expect(getSocialMetricWeight(.80,5,true)).toBe(1)
  })

  it('renders semantic sample metrics and an inert demo profile',()=>{
    render(<SocialMediaPerformance progress={.83} reducedMotion={false}/>)
    expect(screen.getByRole('article',{
      name:'Social media performance',
    })).toBeInTheDocument()
    expect(screen.getByRole('heading',{
      name:'Reach that moves people.',
    })).toBeInTheDocument()
    expect([...screen.getByLabelText('Instagram performance metrics')
      .querySelectorAll('dt')].map(node=>node.textContent)).toEqual(
      SOCIAL_MEDIA_METRICS.map(metric=>metric.label),
    )
    SOCIAL_MEDIA_METRICS.forEach(metric=>{
      expect(screen.getByLabelText(`${metric.label}: ${metric.display}`))
        .toBeInTheDocument()
    })
    expect(screen.getByLabelText('Demo Instagram profile')).toHaveTextContent('@xyz.travellers.demo')
    expect(screen.getByText('Sample data · Demo profile')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('renders final visual values immediately for reduced motion',()=>{
    render(<SocialMediaPerformance progress={.80} reducedMotion/>)
    expect(screen.getByText('500+')).toBeInTheDocument()
    expect(screen.getAllByText('Updating soon')).toHaveLength(5)
  })

  it('applies a transport-safe placement class to the dashboard root',()=>{
    render(
      <SocialMediaPerformance
        progress={.82}
        className="chapter--mobile-safe-bottom"
      />,
    )
    expect(screen.getByRole('article',{
      name:'Social media performance',
    })).toHaveClass('chapter--mobile-safe-bottom')
  })

  it('keeps dashboard motion solely controlled by scroll progress',()=>{
    const stylesheet=readFileSync(resolve(process.cwd(),'src/index.css'),'utf8')
    const dashboardRule=stylesheet.match(
      /\.chapter--social-performance\{[^}]*\}/,
    )?.[0]
    expect(dashboardRule).toContain('animation:none')
  })
})
