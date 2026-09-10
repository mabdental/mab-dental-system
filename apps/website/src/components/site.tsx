'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  ExternalLink,
  Globe2,
  Heart,
  Camera,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from 'lucide-react'
import {
  BRANCHES,
  BUSINESS,
  type Branch,
  type Service,
  getDirectionsUrl,
  SOCIAL_LINKS,
} from '@mab/shared'

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={'logo-lockup' + (light ? ' logo-lockup-light' : '')} aria-label={BUSINESS.name}>
      <span className="logo-mark" aria-hidden="true">
        <svg viewBox="0 0 52 64" role="img">
          <path d="M10 7c7-8 15-8 21-1 5-6 13-6 18 1 4 5 2 14-1 20-3 7-4 19-7 27-2 6-6 8-10 2l-5-14-5 14c-3 7-8 4-10-2-3-8-4-20-7-27C1 21-1 13 3 8c2-3 5-3 7-1Z" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <path d="M17 11c5 2 10 2 15 0 4-2 8-2 12 0" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </span>
      <span className="logo-words">
        <strong>M.A.B</strong>
        <small>Dental<br />Clinic</small>
      </span>
    </span>
  )
}

export function ExternalLinkProps() {
  return { target: '_blank' as const, rel: 'noopener noreferrer' }
}

export function SiteHeader() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  useEffect(() => setOpen(false), [pathname])
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="header-logo"><Logo /></Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          <NavLinks pathname={pathname} />
        </nav>
        <div className="header-actions">
          <a className="button button-outline button-small header-message" href={SOCIAL_LINKS.messenger} {...ExternalLinkProps()}>
            <MessageCircle size={16} /> <span>Message Us</span>
          </a>
          <a className="button button-primary button-small" href="/book">
            <CalendarDays size={16} /> <span>Book Appointment</span>
          </a>
          <button className="mobile-menu-toggle" type="button" aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen((value) => !value)}>
            {open ? <X size={22} /> : <Menu size={22} />}
            <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
          </button>
        </div>
      </div>
      {open && (
        <div id="mobile-navigation" className="mobile-nav-panel">
          <nav className="container" aria-label="Mobile navigation">
            <NavLinks pathname={pathname} mobile />
            <div className="mobile-nav-actions">
              <a className="button button-outline" href={SOCIAL_LINKS.messenger} {...ExternalLinkProps()}><MessageCircle size={17} /> Message Us</a>
              <a className="button button-primary" href="/book"><CalendarDays size={17} /> Book Appointment</a>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

function NavLinks({ pathname, mobile = false }: { pathname: string; mobile?: boolean }) {
  const links = [
    ['/', 'Home'],
    ['/services', 'Services'],
    ['/locations', 'Locations'],
    ['/our-clinic', 'Our Clinic'],
    ['/reviews', 'Reviews'],
    ['/contact', 'Contact'],
  ]
  return (
    <>
      {links.map(([href, label]) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return <Link key={href} className={(mobile ? 'mobile-nav-link ' : 'nav-link ') + (active ? 'active' : '')} href={href}>{label}</Link>
      })}
    </>
  )
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-top">
        <div className="footer-brand">
          <Link href="/"><Logo /></Link>
          <p>{BUSINESS.tagline}</p>
        </div>
        <div className="footer-links">
          <div><h3>Explore</h3><Link href="/services">Services</Link><Link href="/locations">Locations</Link><Link href="/our-clinic">Our Clinic</Link><Link href="/reviews">Reviews</Link></div>
          <div><h3>Visit</h3><Link href="/contact">Contact</Link><Link href="/book">Book Appointment</Link><Link href="/privacy">Privacy Notice</Link><Link href="/terms">Terms</Link></div>
          <div><h3>Contact</h3><a href={'mailto:' + BUSINESS.email}>{BUSINESS.email}</a><a href={SOCIAL_LINKS.messenger} {...ExternalLinkProps()}>Messenger</a><div className="footer-socials"><a aria-label="Facebook" href={SOCIAL_LINKS.facebook} {...ExternalLinkProps()}><Globe2 size={16} /></a><a aria-label="Instagram" href={SOCIAL_LINKS.instagram} {...ExternalLinkProps()}><Camera size={16} /></a><a aria-label="TikTok" href={SOCIAL_LINKS.tiktok} {...ExternalLinkProps()}><span className="social-tiktok">♪</span></a></div></div>
        </div>
      </div>
      <div className="container footer-branches">
        {BRANCHES.map((branch) => <div key={branch.id}><span>{branch.name}</span><small>{branch.smartPhone} · {branch.globePhone}</small></div>)}
      </div>
      <div className="container footer-bottom"><span>© {new Date().getFullYear()} {BUSINESS.name}. All rights reserved.</span><span>{BUSINESS.tagline}</span></div>
    </footer>
  )
}

export function CtaBand({ eyebrow = 'READY FOR A HEALTHIER, BRIGHTER SMILE?', title = 'Book your appointment today.' }: { eyebrow?: string; title?: string }) {
  return <section className="cta-band"><div className="container cta-band-inner"><div><p className="eyebrow eyebrow-light">{eyebrow}</p><h2>{title}</h2></div><p className="cta-band-copy">Experience quality dental care in a comfortable, friendly environment.</p><a href="/book" className="button button-gold"><CalendarDays size={17} /> Book Appointment <ArrowRight size={16} /></a></div></section>
}

export function SectionHeading({ eyebrow, title, description, align = 'left' }: { eyebrow?: string; title: string; description?: string; align?: 'left' | 'center' }) {
  return <div className={'section-heading section-heading-' + align}>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2>{description && <p>{description}</p>}</div>
}

export function PageHero({ eyebrow, title, description, image, children }: { eyebrow: string; title: string; description: string; image: string; children?: React.ReactNode }) {
  return <section className="page-hero"><div className="container page-hero-grid"><div className="page-hero-copy"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="hero-description">{description}</p>{children}</div><div className="page-hero-image"><Image src={image} alt="" fill priority sizes="(max-width: 800px) 100vw, 52vw" /></div></div></section>
}

export function StatStrip({ items }: { items: { icon: 'location' | 'clock' | 'heart' | 'people' | 'shield'; title: string; detail: string }[] }) {
  const icons = { location: MapPin, clock: Clock3, heart: Heart, people: UsersRound, shield: ShieldCheck }
  return <div className="stat-strip">{items.map((item) => { const Icon = icons[item.icon]; return <div className="stat-item" key={item.title}><Icon size={24} /><div><strong>{item.title}</strong><span>{item.detail}</span></div></div> })}</div>
}

export function ServiceCard({ service }: { service: Service }) {
  return <article className="service-card"><div className="service-card-image"><Image src={service.imageUrl} alt="" fill sizes="(max-width: 700px) 90vw, (max-width: 1100px) 44vw, 250px" /></div><div className="service-card-content"><span className="card-kicker">{service.category}</span><h3>{service.name}</h3><p>{service.shortDescription}</p><Link href={'/services/' + service.slug} className="text-link">Learn more <ArrowRight size={15} /></Link></div></article>
}

export function BranchCard({ branch, compact = false }: { branch: Branch; compact?: boolean }) {
  return <article className={'branch-card' + (compact ? ' branch-card-compact' : '')}><div className="branch-card-image"><Image src={branch.imageUrl} alt={branch.name + ' interior'} fill sizes="(max-width: 800px) 100vw, 48vw" /></div><div className="branch-card-content"><div className="branch-card-heading"><div><span className="card-kicker">M.A.B. Dental Clinic</span><h3>{branch.name}</h3></div>{branch.isGoogleBusinessVerified && <span className="verified-chip"><Check size={12} /> Verified</span>}</div><p className="branch-address"><MapPin size={17} /> {branch.address}</p><p className="branch-plus">{branch.plusCode}</p><div className="branch-contact-row"><a href={'tel:' + branch.smartPhone.replace(/\s/g, '')}><Phone size={15} /> {branch.smartPhone}</a><a href={'tel:' + branch.globePhone.replace(/\s/g, '')}><Phone size={15} /> {branch.globePhone}</a></div><div className="branch-actions"><Link href={'/locations/' + branch.slug} className="button button-outline button-small">View Branch</Link><a href={'/book?branch=' + branch.slug} className="button button-primary button-small">Book here <ArrowRight size={15} /></a></div><div className="branch-secondary-links"><a href={getDirectionsUrl(branch)} {...ExternalLinkProps()}><MapPin size={14} /> Get Directions</a>{branch.googleReviewUrl && <a href={branch.googleReviewUrl} {...ExternalLinkProps()}><Sparkles size={14} /> Leave a Review</a>}</div></div></article>
}

export function FaqAccordion({ items }: { items: { question: string; answer: string }[] }) {
  const [open, setOpen] = useState<number | null>(null)
  return <div className="faq-list">{items.map((item, index) => <div className={'faq-item' + (open === index ? ' open' : '')} key={item.question}><button type="button" aria-expanded={open === index} onClick={() => setOpen(open === index ? null : index)}><span>{item.question}</span><ChevronDown size={18} /></button>{open === index && <div className="faq-answer"><p>{item.answer}</p></div>}</div>)}</div>
}

export function EmptyReviews() {
  return <div className="empty-reviews"><div className="empty-icon"><MessageCircle size={28} /></div><div><p className="eyebrow">HONESTLY SHARED</p><h3>Verified reviews will appear here.</h3><p>We are keeping this space factual until published patient feedback is available. You can share your experience through the Valley 1 review link.</p></div></div>
}

export function ContactCard({ icon, title, children, action }: { icon: React.ReactNode; title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return <article className="contact-card"><div className="contact-card-icon">{icon}</div><h3>{title}</h3><div className="contact-card-copy">{children}</div>{action}</article>
}

export { Image, Link, ExternalLink }
