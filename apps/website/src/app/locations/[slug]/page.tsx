import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, CalendarDays, Check, Clock3, MapPin, MessageCircle, Phone, Sparkles } from 'lucide-react'
import { BRANCHES, BUSINESS, SERVICES, SOCIAL_LINKS, getBranchBySlug, getDirectionsUrl } from '@mab/shared'
import { CtaBand, SectionHeading } from '@/components/site'

export function generateStaticParams() {
  return BRANCHES.map((branch) => ({ slug: branch.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const branch = getBranchBySlug((await params).slug)
  return branch ? { title: branch.name } : { title: 'Branch' }
}

export default async function BranchDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const branch = getBranchBySlug((await params).slug)
  if (!branch) notFound()
  return <main><section className="branch-detail-hero"><div className="container branch-detail-grid"><div className="branch-detail-copy"><p className="eyebrow">BRANCH OVERVIEW</p><h1>{branch.name}</h1><p className="branch-tagline">Your smile is always welcome here.</p><p>Find thoughtful dental care at a modern M.A.B. Dental Clinic location, with a team ready to help you understand your next step.</p><div className="hero-actions"><Link href={'/book?branch=' + branch.slug} className="button button-primary"><CalendarDays size={17} /> Book at this branch</Link><a href={SOCIAL_LINKS.messenger} target="_blank" rel="noopener noreferrer" className="button button-outline"><MessageCircle size={17} /> Message Us</a></div></div><div className="branch-detail-image"><Image src={branch.imageUrl} alt={branch.name + ' interior'} fill priority sizes="(max-width: 800px) 100vw, 54vw" /></div></div></section><section className="section"><div className="container branch-info-layout"><div><p className="eyebrow">VISIT US</p><h2>Everything you need before your visit.</h2><div className="branch-fact-list"><div><MapPin size={21} /><span><strong>Address</strong>{branch.address}<small>{branch.plusCode}</small></span></div><div><Phone size={21} /><span><strong>Call Smart</strong><a href={'tel:' + branch.smartPhone.replace(/\s/g, '')}>{branch.smartPhone}</a></span></div><div><Phone size={21} /><span><strong>Call Globe</strong><a href={'tel:' + branch.globePhone.replace(/\s/g, '')}>{branch.globePhone}</a></span></div><div><Clock3 size={21} /><span><strong>Hours</strong>{BUSINESS.hours.weekdayLabel}: {BUSINESS.hours.weekday}<small>Sunday: {BUSINESS.hours.sunday}</small></span></div></div><div className="branch-info-actions"><a href={getDirectionsUrl(branch)} target="_blank" rel="noopener noreferrer" className="button button-outline"><MapPin size={17} /> Get Directions</a>{branch.googleReviewUrl && <a href={branch.googleReviewUrl} target="_blank" rel="noopener noreferrer" className="button button-gold"><Sparkles size={17} /> Leave a Google Review</a>}</div>{!branch.googleReviewUrl && <p className="unavailable-note"><Check size={15} /> Google review link is not available for this branch yet.</p>}</div><div className="map-card"><div className="map-placeholder"><MapPin size={28} /><strong>{branch.name}</strong><span>{branch.plusCode}</span></div><p>Directions open in Google Maps using the verified branch address{branch.latitude ? ' and coordinates' : ''}.</p><a href={getDirectionsUrl(branch)} target="_blank" rel="noopener noreferrer" className="text-link">Open directions <ArrowRight size={15} /></a></div></div></section><section className="section section-soft"><div className="container"><SectionHeading eyebrow="AVAILABLE SERVICES" title="Complete care, all in one place." /><div className="service-pill-grid">{SERVICES.slice(0, 12).map((service) => <Link href={'/services/' + service.slug} key={service.id}><span>{service.name}</span><ArrowRight size={14} /></Link>)}</div></div></section><CtaBand title={'Book an appointment at ' + branch.name + '.'} /></main>
}
