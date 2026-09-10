import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, Check, MessageCircle, ShieldCheck } from 'lucide-react'
import { SERVICES, SOCIAL_LINKS, getServiceBySlug } from '@mab/shared'
import { CtaBand, FaqAccordion, PageHero, ServiceCard, SectionHeading } from '@/components/site'

export function generateStaticParams() {
  return SERVICES.map((service) => ({ slug: service.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const service = getServiceBySlug((await params).slug)
  return service ? { title: service.name } : { title: 'Service' }
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const service = getServiceBySlug((await params).slug)
  if (!service) notFound()
  const commonSigns = service.slug === 'root-canal-therapy'
    ? ['Persistent tooth pain', 'Sensitivity to hot or cold', 'Swollen or tender gums', 'Discoloration', 'A recurring pimple on the gums']
    : ['A change you have noticed', 'A concern affecting comfort or function', 'A desire to improve your smile', 'Questions about available treatment']
  const related = SERVICES.filter((item) => item.category === service.category && item.slug !== service.slug).slice(0, 4)
  return <main><PageHero eyebrow="CARE, EXPLAINED" title={service.name} description={service.longDescription} image={service.imageUrl}><div className="hero-actions"><Link href={'/book?service=' + service.slug} className="button button-primary">Book Appointment <ArrowRight size={16} /></Link><a href={SOCIAL_LINKS.messenger} target="_blank" rel="noopener noreferrer" className="button button-outline"><MessageCircle size={17} /> Message Us</a></div></PageHero><section className="section"><div className="container detail-intro"><div><p className="eyebrow">ABOUT THE TREATMENT</p><h2>Care that starts with a clear conversation.</h2><p>{service.longDescription} Your dentist will assess your situation and explain the treatment options that may be appropriate for you.</p></div><div className="detail-callout"><ShieldCheck size={24} /><div><strong>Personalized assessment</strong><span>We’ll help you understand the next step without diagnosing online.</span></div></div></div></section><section className="section section-soft"><div className="container"><SectionHeading eyebrow="COMMON SIGNS" title="You may want to discuss this if you notice:" /><div className="sign-grid">{commonSigns.map((sign) => <div className="sign-card" key={sign}><Check size={18} /><span>{sign}</span></div>)}</div></div></section><section className="section"><div className="container"><div className="process-heading"><SectionHeading eyebrow="THE TREATMENT PROCESS" title="A simpler, more comfortable experience." /><p>The exact approach depends on your assessment. These are the broad stages your care team may discuss with you.</p></div><div className="process-grid">{service.processSteps.map((step, index) => <div className="process-step" key={step}><span>{String(index + 1).padStart(2, '0')}</span><h3>{step}</h3><p>Discussed clearly with your dentist as part of your care plan.</p></div>)}</div></div></section><section className="section section-soft"><div className="container faq-columns"><div><p className="eyebrow">KEY BENEFITS</p><h2>Why patients explore this care.</h2><ul className="benefit-list"><li><Check size={17} /> Clear, dentist-led recommendations</li><li><Check size={17} /> A plan shaped around your needs</li><li><Check size={17} /> Support before, during, and after your visit</li><li><Check size={17} /> A more confident next step</li></ul></div><div><p className="eyebrow">FREQUENTLY ASKED QUESTIONS</p><h2>You ask, we answer.</h2><FaqAccordion items={service.faq} /></div></div></section>{related.length > 0 && <section className="section"><div className="container"><div className="section-heading-row"><div><p className="eyebrow">RELATED SERVICES</p><h2>You might also explore.</h2></div><Link href="/services" className="text-link">View all services <ArrowRight size={16} /></Link></div><div className="related-grid">{related.map((item) => <ServiceCard key={item.id} service={item} />)}</div></div></section>}<CtaBand eyebrow="READY TO TAKE THE NEXT STEP?" /></main>
}
