import {
  FINALE_CONTACT_SETTLED,
  FINALE_CONTACT_START,
  FINALE_QUOTE,
  FINALE_QUOTE_SETTLED,
  FINALE_QUOTE_START,
  SOCIAL_MEDIA_PROFILE,
} from '../journey/chapters'
import { DEMO_CONTACT } from '../data'

const reveal=(progress,start,end,reducedMotion)=>{
  if(progress<start) return 0
  if(reducedMotion) return 1
  const t=Math.min(1,Math.max(0,(progress-start)/(end-start)))
  return t*t*t*(t*(t*6-15)+10)
}

export default function ContactCard({progress=1,reducedMotion=false}){
  const quoteOpacity=reveal(progress,FINALE_QUOTE_START,FINALE_QUOTE_SETTLED,reducedMotion)
  const contactOpacity=reveal(progress,FINALE_CONTACT_START,FINALE_CONTACT_SETTLED,reducedMotion)
  if(quoteOpacity===0) return null

  return <article
    className="chapter chapter--finale"
    aria-label="Journey finale"
    data-finale-stage={contactOpacity>0?'contact':'quote'}
  >
    <h1 className="finale-quote" style={{opacity:quoteOpacity}}>{FINALE_QUOTE}</h1>
    {contactOpacity>0&&<section
      className="finale-contact"
      aria-label="Contact XYZ Travellers"
      style={{opacity:contactOpacity}}
    >
      <h2>XYZ Travellers</h2>
      <dl className="finale-contact__details" aria-label="Demo contact details">
        <div><dt>WhatsApp</dt><dd>{DEMO_CONTACT.phone}</dd></div>
        <div><dt>Email</dt><dd>{DEMO_CONTACT.email}</dd></div>
        <div><dt>Instagram</dt><dd>{SOCIAL_MEDIA_PROFILE.handle}</dd></div>
      </dl>
      <p className="finale-contact__note">Demo contact details. Enquiries are not sent.</p>
    </section>}
  </article>
}
