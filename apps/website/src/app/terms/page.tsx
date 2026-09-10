import { BUSINESS } from '@mab/shared'

export const metadata = { title: 'Terms' }

export default function TermsPage() {
  return <main className="legal-page"><div className="container legal-container"><p className="eyebrow">TERMS</p><h1>Using the M.A.B. Dental Clinic website.</h1><p className="legal-updated">Please read before sending an appointment request.</p><section><h2>Appointment requests</h2><p>A preferred date and time is a request, not a confirmed appointment. The clinic will review availability and contact you through the details you provide.</p></section><section><h2>Website information</h2><p>Service information is general and does not diagnose a condition or replace an in-person dental assessment. Treatment recommendations are made by a dentist after evaluation.</p></section><section><h2>External links</h2><p>The site may link to Messenger, social profiles, Google Maps, or Google review destinations. Those services have their own terms and privacy practices.</p></section><section><h2>Contact</h2><p>Questions about these terms can be sent to {BUSINESS.email}.</p></section></div></main>
}
