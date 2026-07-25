import { SOCIAL_MEDIA_PROFILE } from '../journey/chapters'

export const CONTACT_MESSAGE=
  'Hello Sanchari Kannadiga, I would like to know more about your travel services.'

export const buildContactWhatsAppUrl=number=>
  `https://wa.me/91${number}?text=${encodeURIComponent(CONTACT_MESSAGE)}`

const CONTACT_NUMBERS=['7204033032','7358369538']

export default function ContactCard(){
  return <article
    className="chapter chapter--operations chapter--glass-card chapter--contact-card chapter--mobile-safe-bottom"
    aria-label="Contact Sanchari Kannadiga"
  >
    <p className="chapter__kicker">Contact</p>
    <h1>Sanchari Kannadiga</h1>
    <div className="contact-card__actions" aria-label="Contact options">
      {CONTACT_NUMBERS.map(number=>
        <a
          key={number}
          href={buildContactWhatsAppUrl(number)}
          target="_blank"
          rel="noreferrer"
          aria-label={`WhatsApp ${number}`}
        >
          WhatsApp <strong>{number}</strong>
        </a>,
      )}
      <a
        href={SOCIAL_MEDIA_PROFILE.url}
        target="_blank"
        rel="noreferrer"
        aria-label={`Instagram ${SOCIAL_MEDIA_PROFILE.handle}`}
      >
        Instagram <strong>{SOCIAL_MEDIA_PROFILE.handle}</strong>
      </a>
    </div>
  </article>
}
