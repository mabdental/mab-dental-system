'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, MapPin, MessageCircle, ShieldCheck } from 'lucide-react'
import {
  BRANCHES,
  BUSINESS,
  CONSULTATION_SERVICE,
  SERVICES,
  getBranchBySlug,
  getServiceBySlug,
} from '@mab/shared'

type BookingFlowProps = {
  initialBranch?: string
  initialService?: string
}

const steps = ['Branch', 'Service / Concern', 'Date & Time', 'Contact Details', 'Review']

function localDateString() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS.timezone }).formatToParts(new Date())
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  return year && month && day ? year + '-' + month + '-' + day : new Date().toISOString().slice(0, 10)
}

function isSunday(date: string) {
  return date ? new Date(date + 'T12:00:00').getDay() === 0 : false
}

function timeOptions() {
  return Array.from({ length: 23 }, (_, index) => {
    const total = 8 * 60 + index * 30
    const hours = Math.floor(total / 60)
    const minutes = total % 60
    return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0')
  }).filter((value) => value <= '19:00')
}

function displayTime(value: string) {
  if (!value) return ''
  const [hours, minutes] = value.split(':').map(Number)
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const hour = hours % 12 || 12
  return hour + ':' + String(minutes).padStart(2, '0') + ' ' + suffix
}

export function BookingFlow({ initialBranch = '', initialService = '' }: BookingFlowProps) {
  const [step, setStep] = useState(1)
  const [branchSlug, setBranchSlug] = useState(getBranchBySlug(initialBranch)?.slug ?? '')
  const [serviceSlug, setServiceSlug] = useState(getServiceBySlug(initialService)?.slug ?? '')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState<{ code: string } | null>(null)

  const branch = useMemo(() => BRANCHES.find((item) => item.slug === branchSlug), [branchSlug])
  const service = useMemo(() => SERVICES.find((item) => item.slug === serviceSlug) ?? (serviceSlug === 'consultation' ? CONSULTATION_SERVICE : undefined), [serviceSlug])
  const selectedDateIsSunday = isSunday(date)

  function validateCurrent() {
    setError('')
    if (step === 1 && !branchSlug) return 'Choose a branch to continue.'
    if (step === 2 && !serviceSlug) return 'Choose a service or consultation.'
    if (step === 3) {
      if (!date || !time) return 'Choose a preferred date and time.'
      if (selectedDateIsSunday) return 'Sunday visits are strictly by appointment. Please message the clinic to arrange one.'
    }
    if (step === 4) {
      if (fullName.trim().length < 2) return 'Enter your full name.'
      if (!/^[0-9+() .-]{10,20}$/.test(phone.trim())) return 'Enter a valid mobile number.'
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address or leave it blank.'
      if (!consent) return 'Please agree to the privacy notice to continue.'
    }
    return ''
  }

  function next() {
    const message = validateCurrent()
    if (message) {
      setError(message)
      return
    }
    setStep((value) => Math.min(5, value + 1))
  }

  function back() {
    setError('')
    setStep((value) => Math.max(1, value - 1))
  }

  async function submit() {
    const validationError = validateCurrent()
    if (validationError) {
      setError(validationError)
      return
    }
    setError('')
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          phone,
          email: email || undefined,
          branchSlug,
          serviceSlug,
          requestedStartAt: new Date(date + 'T' + time + ':00+08:00').toISOString(),
          patientMessage: message || undefined,
        }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'We could not submit your appointment request.')
      setSuccess({ code: body.publicCode })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'We could not submit your appointment request.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return <section className="booking-card booking-success" aria-live="polite"><div className="success-check"><Check size={34} /></div><p className="eyebrow">REQUEST RECEIVED</p><h2>Appointment request received.</h2><p>Your schedule is pending clinic confirmation. Keep this reference for your records.</p><div className="reference-code">{success.code}</div><div className="success-actions"><a className="button button-primary" href="https://l.messenger.com/l.php?u=http%3A%2F%2Fmessenger.com%2Ft%2F875653832292951&h=AUBRnVV5jadkSuYBjsnL5sHul9eTiStc2eRt73MoS-LCqGvOBTKxoGsltDVqV6v0FE1Td7UNAZTaCEe9GU18g6i5rTsaMhpUmoOl-2qpFEgPv-1pxPSvmD3XKW1JdYyRyzKOnw" target="_blank" rel="noopener noreferrer"><MessageCircle size={17} /> Message the clinic</a><Link className="button button-outline" href="/">Return Home <ArrowRight size={16} /></Link></div></section>
  }

  return <section className="booking-card">
    <div className="booking-stepper" aria-label="Booking progress">
      {steps.map((label, index) => <div className={'booking-step' + (step === index + 1 ? ' current' : '') + (step > index + 1 ? ' complete' : '')} key={label}><span>{step > index + 1 ? <Check size={15} /> : String(index + 1).padStart(2, '0')}</span><strong>{label}</strong></div>)}
    </div>
    <div className="booking-content">
      <div className="booking-mobile-progress" aria-live="polite"><span>Step {String(step).padStart(2, '0')} of 05</span><strong>{steps[step - 1]}</strong></div>
      {step === 1 && <div className="booking-panel"><p className="eyebrow">STEP 1 OF 5</p><h2>Choose a location</h2><p className="booking-lede">Select your preferred M.A.B. Dental Clinic branch.</p><div className="choice-grid branch-choice-grid">{BRANCHES.map((item) => <button type="button" className={'choice-card' + (branchSlug === item.slug ? ' selected' : '')} key={item.id} onClick={() => setBranchSlug(item.slug)}><div className="choice-card-icon"><MapPin size={20} /></div><div><h3>{item.name}</h3><p>{item.address}</p><span>{item.plusCode}</span></div>{branchSlug === item.slug && <Check className="choice-check" size={20} />}</button>)}</div></div>}
      {step === 2 && <div className="booking-panel"><p className="eyebrow">STEP 2 OF 5</p><h2>What can we help with?</h2><p className="booking-lede">Choose a service, or start with a free consultation if you are unsure.</p><div className="choice-grid service-choice-grid">{[CONSULTATION_SERVICE, ...SERVICES].map((item) => <button type="button" className={'choice-card service-choice' + (serviceSlug === item.slug ? ' selected' : '')} key={item.id} onClick={() => setServiceSlug(item.slug)}><div className="choice-card-icon"><SparkleIcon /></div><div><h3>{item.name}</h3><p>{item.shortDescription}</p></div>{serviceSlug === item.slug && <Check className="choice-check" size={20} />}</button>)}</div></div>}
      {step === 3 && <div className="booking-panel"><p className="eyebrow">STEP 3 OF 5</p><h2>Pick a preferred date & time</h2><p className="booking-lede">Your selected slot is a preferred schedule. The clinic will confirm availability after review.</p><div className="form-grid two"><label className="field"><span>Preferred date <b>*</b></span><input type="date" min={localDateString()} value={date} onChange={(event) => { setDate(event.target.value); setError('') }} /></label><label className="field"><span>Preferred time <b>*</b></span><select value={time} onChange={(event) => setTime(event.target.value)}><option value="">Select a time</option>{timeOptions().map((value) => <option key={value} value={value}>{displayTime(value)}</option>)}</select></label></div><div className="booking-hours-note"><Clock3 size={18} /><div><strong>{BUSINESS.hours.weekdayLabel}: {BUSINESS.hours.weekday}</strong><span>Sunday: {BUSINESS.hours.sunday}</span></div></div>{selectedDateIsSunday && <div className="inline-notice warning"><MessageCircle size={18} /><span>Sunday visits are strictly by appointment. <a href="https://l.messenger.com/l.php?u=http%3A%2F%2Fmessenger.com%2Ft%2F875653832292951&h=AUBRnVV5jadkSuYBjsnL5sHul9eTiStc2eRt73MoS-LCqGvOBTKxoGsltDVqV6v0FE1Td7UNAZTaCEe9GU18g6i5rTsaMhpUmoOl-2qpFEgPv-1pxPSvmD3XKW1JdYyRyzKOnw" target="_blank" rel="noopener noreferrer">Message the clinic</a>.</span></div>}</div>}
      {step === 4 && <div className="booking-panel"><p className="eyebrow">STEP 4 OF 5</p><h2>Tell us how to reach you</h2><p className="booking-lede">We only ask for the details needed to review your request.</p><div className="form-grid two"><label className="field"><span>Full name <b>*</b></span><input autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Your full name" /></label><label className="field"><span>Mobile number <b>*</b></span><input autoComplete="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="09XX XXX XXXX" /></label><label className="field"><span>Email <em>optional</em></span><input autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><label className="field field-full"><span>Optional message <em>optional</em></span><textarea rows={4} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Anything you would like the clinic team to know?" /></label></div><label className="consent-check"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>I agree to the <Link href="/privacy">Privacy Notice</Link> and understand this is an appointment request pending clinic confirmation.</span></label></div>}
      {step === 5 && <div className="booking-panel"><p className="eyebrow">STEP 5 OF 5</p><h2>Review your request</h2><p className="booking-lede">Please check the details before sending your preferred schedule to the clinic.</p><div className="review-summary"><SummaryRow icon={<MapPin size={18} />} label="Branch" value={branch?.name ?? ''} /><SummaryRow icon={<SparkleIcon />} label="Service" value={service?.name ?? ''} /><SummaryRow icon={<CalendarDays size={18} />} label="Preferred schedule" value={date ? new Date(date + 'T12:00:00').toLocaleDateString('en-PH', { dateStyle: 'full' }) + ' · ' + displayTime(time) : ''} /><SummaryRow icon={<ShieldCheck size={18} />} label="Patient" value={fullName + ' · ' + phone} /></div><div className="inline-notice"><ShieldCheck size={18} /><span>Your selected date and time are a preferred schedule. M.A.B. Dental Clinic will confirm your appointment after reviewing availability.</span></div></div>}
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="booking-controls">{step > 1 && <button type="button" className="button button-outline" onClick={back}><ArrowLeft size={16} /> Back</button>}<span />{step < 5 ? <button type="button" className="button button-primary" onClick={next}>Next step <ArrowRight size={16} /></button> : <button type="button" className="button button-primary" disabled={isSubmitting} onClick={submit}>{isSubmitting ? 'Sending request…' : 'Request Appointment'} {!isSubmitting && <ArrowRight size={16} />}</button>}</div>
    </div>
  </section>
}

function SummaryRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="summary-row"><span className="summary-icon">{icon}</span><div><small>{label}</small><strong>{value}</strong></div></div>
}

function SparkleIcon() {
  return <SparkleIconSvg />
}

function SparkleIconSvg() {
  return <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /><circle cx="12" cy="12" r="3.2" /></svg>
}
