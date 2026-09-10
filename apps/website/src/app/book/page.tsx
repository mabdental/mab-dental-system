import { CalendarDays, MessageCircle } from 'lucide-react'
import { BUSINESS, SOCIAL_LINKS } from '@mab/shared'
import { BookingFlow } from '@/components/booking'
import { PageHero } from '@/components/site'

export const metadata = { title: 'Book an Appointment' }

export default function BookPage() {
  return <main><PageHero eyebrow="BOOK AN APPOINTMENT" title="A healthier smile is just a few steps away." description="Choose your preferred branch, select a service, pick a date and time, and provide your details. We’ll take care of the rest." image="/images/clinic-lobby.jpg"><div className="hero-actions"><a href={SOCIAL_LINKS.messenger} target="_blank" rel="noopener noreferrer" className="button button-outline"><MessageCircle size={17} /> Need help?</a><span className="hero-inline-note"><CalendarDays size={17} /> {BUSINESS.hours.weekdayLabel}: {BUSINESS.hours.weekday}</span></div></PageHero><section className="section booking-section"><div className="container"><BookingFlow /></div></section><section className="help-panel container"><MessageCircle size={24} /><div><p className="eyebrow">NEED ASSISTANCE?</p><h2>Need help booking?</h2><p>Message the M.A.B. Dental Clinic team if you need help choosing a branch or service.</p></div><a href={SOCIAL_LINKS.messenger} target="_blank" rel="noopener noreferrer" className="button button-outline">Message Us</a></section></main>
}
