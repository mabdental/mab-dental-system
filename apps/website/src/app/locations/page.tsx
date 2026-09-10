import Link from 'next/link'
import { ArrowRight, MessageCircle } from 'lucide-react'
import { BRANCHES, SOCIAL_LINKS } from '@mab/shared'
import { BranchCard, CtaBand, PageHero, SectionHeading } from '@/components/site'

export const metadata = { title: 'Locations' }

export default function LocationsPage() {
  return <main><PageHero eyebrow="QUALITY CARE, CLOSER TO YOU." title="Two locations. One standard of care." description="Choose the M.A.B. Dental Clinic branch that works for you. The same thoughtful care, modern facilities, and clear next steps — wherever you are." image="/images/clinic-signage.jpg"><div className="hero-actions"><Link href="/book" className="button button-primary">Book Appointment <ArrowRight size={16} /></Link><a href={SOCIAL_LINKS.messenger} target="_blank" rel="noopener noreferrer" className="button button-outline"><MessageCircle size={17} /> Message Us</a></div></PageHero><section className="section"><div className="container"><SectionHeading eyebrow="OUR LOCATIONS" title="Visit your nearest M.A.B. Dental Clinic." description="Verified branch information is shown below. Directions open Google Maps using the supplied address or coordinates." /><div className="branch-grid locations-grid">{BRANCHES.map((branch) => <BranchCard key={branch.id} branch={branch} />)}</div></div></section><section className="section section-soft"><div className="container location-note"><div><p className="eyebrow">A CLEARER CHOICE</p><h2>Same care, closer to you.</h2><p>Both branches share the same Monday–Saturday hours. Sunday visits are strictly by appointment.</p></div><div className="location-note-table"><div><span>Hours</span><strong>Monday–Saturday<br />8:00 AM–8:00 PM</strong></div><div><span>Sunday</span><strong>Strictly by appointment</strong></div><div><span>Consultation</span><strong>Free Consultation and Assessment</strong></div></div></div></section><CtaBand /></main>
}
