import Link from 'next/link'
import { ArrowRight, MessageCircle, Sparkles } from 'lucide-react'
import { BRANCHES, SOCIAL_LINKS } from '@mab/shared'
import { CtaBand, EmptyReviews, PageHero, SectionHeading } from '@/components/site'

export const metadata = { title: 'Reviews' }

export default function ReviewsPage() {
  const valley = BRANCHES.find((branch) => branch.slug === 'valley-1')!
  return <main><PageHero eyebrow="OUR PATIENTS" title="Real smiles. Real experiences." description="We’re keeping patient feedback honest and source-backed. When verified reviews are available for publication, they’ll be shown here with the appropriate source." image="/images/clinic-signage.jpg"><div className="hero-actions"><Link href="/book" className="button button-primary">Book Appointment <ArrowRight size={16} /></Link><a href={SOCIAL_LINKS.messenger} target="_blank" rel="noopener noreferrer" className="button button-outline"><MessageCircle size={17} /> Message Us</a></div></PageHero><section className="section"><div className="container"><SectionHeading eyebrow="PATIENT REVIEWS" title="What our patients say." description="No fabricated testimonials or review counts. The page will update when verified feedback is configured." /><EmptyReviews /><div className="review-cta"><div className="review-cta-icon"><Sparkles size={25} /></div><div><p className="eyebrow">SHARE YOUR EXPERIENCE</p><h2>Help others find their best smile.</h2><p>Have a great experience at M.A.B. Dental Clinic? Valley 1 patients can share feedback through the verified Google review destination.</p></div><a href={valley.googleReviewUrl} target="_blank" rel="noopener noreferrer" className="button button-primary">Leave a Review <ArrowRight size={16} /></a></div></div></section><CtaBand /></main>
}
