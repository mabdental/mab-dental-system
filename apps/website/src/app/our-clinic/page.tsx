import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, MessageCircle } from 'lucide-react'
import { SOCIAL_LINKS } from '@mab/shared'
import { EquipmentExplorer } from '@/components/explorers'
import { CtaBand, PageHero, StatStrip } from '@/components/site'

export const metadata = { title: 'Our Clinic' }

export default function OurClinicPage() {
  return <main><PageHero eyebrow="OUR CLINIC" title="Designed around your comfort." description="A modern, welcoming space where advanced dental care meets a calm and thoughtful experience. Every detail is designed with you in mind." image="/images/clinic-chair.jpg"><div className="hero-actions"><Link href="/book" className="button button-primary">Book Appointment <ArrowRight size={16} /></Link><a href={SOCIAL_LINKS.messenger} target="_blank" rel="noopener noreferrer" className="button button-outline"><MessageCircle size={17} /> Message Us</a></div><StatStrip items={[{ icon: 'shield', title: 'Modern facilities', detail: 'Clean, comfortable and welcoming' }, { icon: 'heart', title: 'Patient-centered', detail: 'A better experience at every visit' }, { icon: 'people', title: 'Trusted team', detail: 'Care with clarity and intention' }]} /></PageHero><section className="section section-tight"><div className="container"><EquipmentExplorer /></div></section><section className="split-feature split-feature-ivory"><div className="split-feature-image"><Image src="/images/clinic-signage.jpg" alt="M.A.B. Dental Clinic identity wall" fill sizes="(max-width: 800px) 100vw, 50vw" /></div><div className="split-feature-copy"><p className="eyebrow">OUR SPACE</p><h2>More than treatment. A better dental experience.</h2><p>From a welcoming reception to a considered treatment room, the clinic is arranged to support comfort, safety, and a calmer visit.</p><Link href="/contact" className="button button-primary">Talk to the clinic <ArrowRight size={16} /></Link></div></section><CtaBand /></main>
}
