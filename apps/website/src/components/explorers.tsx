'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react'
import { CONCERNS, EQUIPMENT, SERVICE_CATEGORIES, SERVICES, CLINIC_GALLERY, type Service } from '@mab/shared'
import { ServiceCard } from './site'

export function ServiceExplorer() {
  const [category, setCategory] = useState<string>('All')
  const [concern, setConcern] = useState<string>('')
  const filtered = SERVICES.filter((service) => {
    const matchesCategory = category === 'All' || service.category === category
    const matchesConcern = !concern || serviceMatchesConcern(service, concern)
    return matchesCategory && matchesConcern
  })
  return <div className="explorer-shell">
    <div className="explorer-toolbar">
      <div className="filter-row" role="tablist" aria-label="Service categories">{SERVICE_CATEGORIES.map((item) => <button type="button" role="tab" aria-selected={category === item} className={'filter-button' + (category === item ? ' selected' : '')} key={item} onClick={() => setCategory(item)}>{item.replace(' / ', ' · ')}</button>)}</div>
      <label className="concern-select"><span>Explore by concern</span><select value={concern} onChange={(event) => setConcern(event.target.value)}><option value="">All concerns</option>{CONCERNS.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
    </div>
    <div className="explorer-result-bar"><p><strong>{filtered.length}</strong> treatments to explore</p>{concern && <button type="button" className="clear-filter" onClick={() => setConcern('')}>Clear concern <X size={14} /></button>}</div>
    <div className="service-grid">{filtered.map((service) => <ServiceCard key={service.id} service={service} />)}</div>
    {!filtered.length && <div className="empty-state"><p className="eyebrow">NO EXACT MATCH</p><h3>Start with a consultation.</h3><p>A dentist can assess your concern and explain the care that may be appropriate.</p><Link href="/book?service=consultation" className="button button-primary">Book a consultation <ArrowRight size={16} /></Link></div>}
  </div>
}

function serviceMatchesConcern(service: Service, concern: string) {
  if (service.concernTags.includes(concern)) return true
  if (concern === 'I have tooth pain') return ['root-canal-therapy', 'tooth-extraction', 'pulpotomy', 'pulpectomy'].includes(service.slug)
  return concern === 'I’m not sure'
}

export function EquipmentExplorer() {
  const [selectedId, setSelectedId] = useState<(typeof EQUIPMENT)[number]['id']>('chair')
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null)
  const selected = EQUIPMENT.find((item) => item.id === selectedId) ?? EQUIPMENT[0]
  const dialogRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (galleryIndex === null) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setGalleryIndex(null)
      if (event.key === 'ArrowRight') setGalleryIndex((value) => value === null ? 0 : (value + 1) % CLINIC_GALLERY.length)
      if (event.key === 'ArrowLeft') setGalleryIndex((value) => value === null ? 0 : (value - 1 + CLINIC_GALLERY.length) % CLINIC_GALLERY.length)
    }
    window.addEventListener('keydown', onKeyDown)
    dialogRef.current?.focus()
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [galleryIndex])
  return <div className="equipment-explorer">
    <div className="equipment-feature">
      <div className="equipment-image"><Image src="/images/clinic-chair.jpg" alt="M.A.B. Dental Clinic treatment room" fill sizes="(max-width: 800px) 100vw, 60vw" priority /><div className="equipment-hotspots">{EQUIPMENT.map((item, index) => <button type="button" className={'hotspot hotspot-' + index + (selectedId === item.id ? ' active' : '')} key={item.id} onClick={() => setSelectedId(item.id)} aria-label={'Explore ' + item.label}><span /></button>)}</div><div className="equipment-callout"><p className="eyebrow">EXPLORE THE ROOM</p><h3>{selected.name}</h3><p>{selected.detail}</p></div></div>
      <div className="equipment-detail"><p className="eyebrow">A CLOSER LOOK</p><h2>Thoughtful details. A better experience.</h2><p>Our treatment room is arranged around comfort, clarity, and a calm visit. Select an element to learn more.</p><div className="equipment-selector">{EQUIPMENT.map((item) => <button type="button" className={'equipment-selector-button' + (selectedId === item.id ? ' active' : '')} key={item.id} onClick={() => setSelectedId(item.id)}><span>{String(EQUIPMENT.indexOf(item) + 1).padStart(2, '0')}</span>{item.label}</button>)}</div></div>
    </div>
    <div className="gallery-section"><div className="gallery-heading"><div><p className="eyebrow">CLINIC GALLERY</p><h2>A space for healthier, brighter smiles.</h2></div><span>Real clinic imagery from the supplied references.</span></div><div className="gallery-grid">{CLINIC_GALLERY.map((item, index) => <button type="button" className="gallery-tile" key={item.id} onClick={() => setGalleryIndex(index)}><Image src={item.imageUrl} alt={item.label} fill sizes="(max-width: 700px) 100vw, 25vw" /><span>{item.label}</span><Maximize2 size={17} /></button>)}</div></div>
    {galleryIndex !== null && <div className="lightbox-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setGalleryIndex(null) }}><div className="lightbox-dialog" role="dialog" aria-modal="true" aria-label="Clinic gallery" tabIndex={-1} ref={dialogRef}><button type="button" className="lightbox-close" onClick={() => setGalleryIndex(null)} aria-label="Close gallery"><X size={20} /></button><div className="lightbox-image"><Image src={CLINIC_GALLERY[galleryIndex].imageUrl} alt={CLINIC_GALLERY[galleryIndex].label} fill sizes="90vw" /></div><div className="lightbox-controls"><button type="button" onClick={() => setGalleryIndex((galleryIndex - 1 + CLINIC_GALLERY.length) % CLINIC_GALLERY.length)} aria-label="Previous image"><ChevronLeft size={22} /></button><strong>{CLINIC_GALLERY[galleryIndex].label}</strong><button type="button" onClick={() => setGalleryIndex((galleryIndex + 1) % CLINIC_GALLERY.length)} aria-label="Next image"><ChevronRight size={22} /></button></div></div></div>}
  </div>
}
