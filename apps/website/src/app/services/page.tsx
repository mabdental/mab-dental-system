import { MessageCircle } from 'lucide-react'
import { SOCIAL_LINKS } from '@mab/shared'
import { ServiceExplorer } from '@/components/explorers'
import { CtaBand, PageHero } from '@/components/site'

export const metadata = { title: 'Services' }

export default function ServicesPage() {
  return <main><PageHero eyebrow="OUR SERVICES" title="Find the care your smile needs." description="Comprehensive, modern dental care for you and your family. Explore by treatment category or start with the concern that brought you here." image="/images/clinic-detail.jpg"><div className="hero-actions"><a href="/book" className="button button-primary">Book Appointment</a><a href={SOCIAL_LINKS.messenger} target="_blank" rel="noopener noreferrer" className="button button-outline"><MessageCircle size={17} /> Message Us</a></div></PageHero><section className="section section-tight"><div className="container"><ServiceExplorer /></div></section><CtaBand /></main>
}
