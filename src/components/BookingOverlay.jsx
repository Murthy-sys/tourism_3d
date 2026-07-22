import { useEffect, useState } from 'react'
const blank={name:'',email:'',plan:'',dates:'',travelers:'1',message:''}
export default function BookingOverlay({open,initialPlan='',initialDestination='',onClose}){
  const [form,setForm]=useState({...blank,plan:initialPlan||initialDestination}),[submitted,setSubmitted]=useState(false)
  useEffect(()=>setForm(f=>({...f,plan:initialPlan||initialDestination||f.plan})),[initialPlan,initialDestination])
  useEffect(()=>{const key=e=>e.key==='Escape'&&open&&onClose?.();document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key)},[open,onClose])
  if(!open)return null
  const change=e=>setForm(f=>({...f,[e.target.name]:e.target.value}))
  return <div className="booking-overlay" role="dialog" aria-modal="true" aria-labelledby="booking-title"><button className="booking-overlay__close" onClick={onClose} aria-label="Close booking">×</button>
    <div className="booking-overlay__intro"><p>Plan your India journey</p><h2 id="booking-title">From imagination<br/>to itinerary.</h2><span>A travel manager responds within one business day.</span></div>
    <form onSubmit={e=>{e.preventDefault();setSubmitted(true)}}>{submitted?<div className="booking-overlay__success"><p>Journey request received</p><h3>We’ll take it from here.</h3><button type="button" onClick={()=>{setSubmitted(false);setForm({...blank,plan:initialPlan})}}>Plan another</button></div>:<>
      <label>Full name<input name="name" value={form.name} onChange={change} required autoFocus/></label><label>Email<input type="email" name="email" value={form.email} onChange={change} required/></label>
      <label>Plan or destination<input name="plan" value={form.plan} onChange={change} placeholder="Kerala, Rajasthan, the Himalayas…" required/></label><label>Travel dates<input name="dates" value={form.dates} onChange={change}/></label>
      <label>Travellers<select name="travelers" value={form.travelers} onChange={change}>{[1,2,3,4,5,'6+'].map(n=><option key={n}>{n}</option>)}</select></label><label>Your journey<textarea name="message" value={form.message} onChange={change} rows="3"/></label>
      <button className="booking-overlay__submit">Request itinerary</button></>}</form>
  </div>
}
