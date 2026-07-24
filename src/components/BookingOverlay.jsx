import { useEffect, useState } from 'react'

const WHATSAPP_NUMBER='917204033032'
const blank={contactName:'',startDate:'',endDate:''}

export const buildWhatsAppMessage=({
  contactName,
  startDate,
  endDate,
  selectedPackage,
})=>[
  'Hello Sanchari Kannadiga,',
  `I would like to enquire about the ${selectedPackage.name} package.`,
  `Contact person: ${contactName.trim()}`,
  `Travel dates: ${startDate} to ${endDate}`,
  `Package: ${selectedPackage.name} — ${selectedPackage.duration} — ${selectedPackage.priceLabel} per person`,
  'Please confirm availability and share the booking details.',
].join('\n')

export const buildWhatsAppUrl=details=>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    buildWhatsAppMessage(details),
  )}`

const defaultOpenWhatsApp=url=>
  window.open(url,'_blank','noopener,noreferrer')

export default function BookingOverlay({
  open,
  selectedPackage,
  onClose,
  openWhatsApp=defaultOpenWhatsApp,
}){
  const [form,setForm]=useState(blank)
  const [error,setError]=useState('')

  useEffect(()=>{
    if(open){
      setForm(blank)
      setError('')
    }
  },[open,selectedPackage?.id])

  useEffect(()=>{
    const key=event=>{
      if(event.key==='Escape'&&open) onClose?.()
    }
    document.addEventListener('keydown',key)
    return()=>document.removeEventListener('keydown',key)
  },[open,onClose])

  if(!open||!selectedPackage)return null

  const change=event=>{
    setForm(current=>({
      ...current,
      [event.target.name]:event.target.value,
    }))
    setError('')
  }

  const submit=event=>{
    event.preventDefault()
    if(!form.contactName.trim()||!form.startDate||!form.endDate){
      setError('Enter the contact person name and select both travel dates.')
      return
    }
    if(form.endDate<form.startDate){
      setError('End Date cannot be before Start Date.')
      return
    }
    openWhatsApp(buildWhatsAppUrl({...form,selectedPackage}))
  }

  return <div
    className="booking-overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="booking-title"
  >
    <button
      className="booking-overlay__close"
      type="button"
      onClick={onClose}
      aria-label="Close booking"
    >×</button>
    <div className="booking-overlay__intro">
      <p>Selected trek package</p>
      <h2 id="booking-title">{selectedPackage.name}</h2>
      <div className="booking-overlay__package">
        <strong>{selectedPackage.priceLabel}</strong>
        <span>{selectedPackage.duration} · Per person</span>
      </div>
    </div>
    <form onSubmit={submit} noValidate>
      <label>
        Contact Person Name
        <input
          name="contactName"
          value={form.contactName}
          onChange={change}
          required
          autoFocus
        />
      </label>
      <label>
        Start Date
        <input
          type="date"
          name="startDate"
          value={form.startDate}
          onChange={change}
          required
        />
      </label>
      <label>
        End Date
        <input
          type="date"
          name="endDate"
          min={form.startDate||undefined}
          value={form.endDate}
          onChange={change}
          required
        />
      </label>
      {error&&<p className="booking-overlay__error" role="alert">{error}</p>}
      <button className="booking-overlay__submit">
        Continue on WhatsApp
      </button>
      <p className="booking-overlay__note">
        WhatsApp opens with your package enquiry ready to send.
      </p>
    </form>
  </div>
}
