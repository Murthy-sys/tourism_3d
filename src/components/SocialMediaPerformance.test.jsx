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
  it('formats deterministic public values and stable pending states',()=>{
    expect(formatSocialMetric(SOCIAL_MEDIA_METRICS[0],1)).toBe('546+')
    expect(formatSocialMetric(SOCIAL_MEDIA_METRICS[2],1)).toBe('Updating soon')
    expect(formatSocialMetric(SOCIAL_MEDIA_METRICS[3],1)).toBe('Updating soon')
    expect(formatSocialMetric(SOCIAL_MEDIA_METRICS[1],.5))
      .toBe('Updating soon')
    expect(getSocialMetricWeight(.88,0,false)).toBe(0)
    expect(getSocialMetricWeight(.91,5,false)).toBe(1)
    expect(getSocialMetricWeight(.88,5,true)).toBe(1)
  })

  it('renders exact semantic metrics and confirmed profile links',()=>{
    render(<SocialMediaPerformance progress={.91} reducedMotion={false}/>)
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
    expect(screen.getByRole('link',{
      name:'Open @sanchari.kannadiga on Instagram',
    })).toHaveAttribute(
      'href',
      'https://www.instagram.com/_sanchari_kannadiga_?igsh=bWM0NGNja3E3dzZx',
    )
    expect(screen.getByRole('link',{
      name:'Public estimates · July 2026',
    })).toHaveAttribute(
      'href',
      'https://www.instagram.com/_sanchari_kannadiga_?igsh=bWM0NGNja3E3dzZx',
    )
  })

  it('renders final visual values immediately for reduced motion',()=>{
    render(<SocialMediaPerformance progress={.88} reducedMotion/>)
    expect(screen.getByText('546+')).toBeInTheDocument()
    expect(screen.getAllByText('Updating soon')).toHaveLength(5)
  })

  it('keeps dashboard motion solely controlled by scroll progress',()=>{
    const stylesheet=readFileSync(resolve(process.cwd(),'src/index.css'),'utf8')
    const dashboardRule=stylesheet.match(
      /\.chapter--social-performance\{[^}]*\}/,
    )?.[0]
    expect(dashboardRule).toContain('animation:none')
  })
})
