'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Tag, Check, Plus, ChevronDown, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import Card from '@/components/ui/Card'

interface Promotion {
  discounted_price: number | null
  original_price: number | null
  discount_percentage: number | null
  is_active: boolean
}

export interface Establishment {
  id: string
  name: string
  category: string
  city: string
  country: string
  image_url: string | null
  price_range: string | null
  plan: string
  promotions: Promotion[]
  avgRating?: string | null
}

const PRICE_FILTERS = ['$', '$$', '$$$', '$$$$']



export default function ExploreClient({ establishments }: { establishments: Establishment[] }) {
  const t      = useTranslations('explore')
  const tc     = useTranslations('categories')
  const router = useRouter()

  const CATEGORIES = [
    { slug: 'all',        emoji: '✨', name: tc('all') },
    { slug: 'restaurant', emoji: '🍽️', name: tc('restaurant') },
    { slug: 'bar',        emoji: '🍺', name: tc('bar') },
    { slug: 'club',       emoji: '🎵', name: tc('club') },
    { slug: 'cafe',       emoji: '☕', name: tc('cafe') },
    { slug: 'cultural',   emoji: '🎭', name: tc('cultural') },
    { slug: 'sports',     emoji: '💪', name: tc('sports') },
    { slug: 'other',      emoji: '🌟', name: tc('other') },
  ]

  const [search,         setSearch]         = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [activePrice,    setActivePrice]    = useState('all')
  const [onlyDiscounts,  setOnlyDiscounts]  = useState(false)
  const [compareIds,     setCompareIds]     = useState<string[]>([])
  const [showPriceMenu,    setShowPriceMenu]    = useState(false)
  const [showCategoryMenu, setShowCategoryMenu] = useState(false)
  const priceMenuRef    = useRef<HTMLDivElement>(null)
  const categoryMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (priceMenuRef.current && !priceMenuRef.current.contains(e.target as Node))
        setShowPriceMenu(false)
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(e.target as Node))
        setShowCategoryMenu(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 2)  return prev
      return [...prev, id]
    })
  }

  const filtered = useMemo(() => {
    const result = establishments.filter((e) => {
      const matchesCategory = activeCategory === 'all' || e.category === activeCategory
      const matchesSearch   = e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.city.toLowerCase().includes(search.toLowerCase())
      const matchesPrice    = activePrice === 'all' || e.price_range === activePrice
      const hasPromo        = e.promotions?.some((p) => p.discount_percentage != null || p.discounted_price != null)
      const matchesDiscount = !onlyDiscounts || hasPromo
      return matchesCategory && matchesSearch && matchesPrice && matchesDiscount
    })
    return result.sort((a, b) => {
      if (a.plan === 'pro' && b.plan !== 'pro') return -1
      if (a.plan !== 'pro' && b.plan === 'pro') return  1
      return 0
    })
  }, [establishments, search, activeCategory, activePrice, onlyDiscounts])

  const activeFiltersCount = (activeCategory !== 'all' ? 1 : 0) +
    (activePrice !== 'all' ? 1 : 0) + (onlyDiscounts ? 1 : 0)

  function clearFilters() {
    setActiveCategory('all'); setActivePrice('all')
    setOnlyDiscounts(false);  setSearch('')
  }

  const heroWords = t('hero_title').split(' ')
  const heroStart = heroWords.slice(0, -1).join(' ')
  const heroEnd   = heroWords.slice(-1)[0]

  return (
    <>
      <section className="hero" style={{ padding: '6rem 0', textAlign: 'center' }}>
        <div className="premium-chip" style={{ marginBottom: '2rem' }}>
          <span className="live-indicator" /> 142 Estudiantes descubriendo la ciudad hoy
        </div>
        <h1 className="mag-title slide-up-1" style={{ fontSize: 'clamp(3rem, 7vw, 5rem)', fontWeight: 900 }}>
          {heroStart} <span style={{ color: 'var(--primary)' }}>{heroEnd}</span>
        </h1>
        <p className="hero-subtitle slide-up-2" style={{ opacity: 0.7, fontSize: '1.2rem', marginTop: '1rem' }}>{t('hero_subtitle')}</p>
        
        <div className="search-bar slide-up-3 glass-card" style={{ borderRadius: 'var(--radius-full)', marginTop: '3rem', padding: '0.8rem 2rem', maxWidth: '600px', marginInline: 'auto' }}>
          <Search size={22} className="search-icon" color="var(--primary)" />
          <input
            type="text"
            placeholder="¿Qué estás buscando hoy?"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ fontSize: '16px', fontWeight: 500 }}
          />
        </div>
      </section>

      {/* Elegant filter bar */}
      <div className="filters-bar slide-up-4 glass-card" style={{ marginTop: '2rem', padding: '1.2rem 2rem', borderRadius: 'var(--radius-lg)' }}>

        {/* Category dropdown */}
        <div ref={categoryMenuRef} className="price-dropdown-wrapper">
          <button
            className={`filter-pill price-dropdown-trigger glass-card ${activeCategory !== 'all' ? 'active' : ''}`}
            onClick={() => setShowCategoryMenu((v) => !v)}
            style={{ borderRadius: 'var(--radius-full)', fontSize: '13px', padding: '0.6rem 1.4rem' }}
          >
            <span>
              {activeCategory === 'all' ? '✨ Todos' : CATEGORIES.find((c) => c.slug === activeCategory)?.name}
            </span>
            <ChevronDown size={16} />
          </button>
          {showCategoryMenu && (
            <div className="price-dropdown-menu glass-card" style={{ borderRadius: 'var(--radius-md)', zIndex: 100 }}>
              {CATEGORIES.map((cat) => (
                <button key={cat.slug}
                  className={`price-dropdown-item ${activeCategory === cat.slug ? 'active' : ''}`}
                  onClick={() => { setActiveCategory(cat.slug); setShowCategoryMenu(false) }}
                >
                  {cat.emoji} {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Price dropdown */}
        <div ref={priceMenuRef} className="price-dropdown-wrapper">
          <button
            className={`filter-pill price-dropdown-trigger glass-card ${activePrice !== 'all' ? 'active' : ''}`}
            onClick={() => setShowPriceMenu((v) => !v)}
            style={{ borderRadius: 'var(--radius-full)', fontSize: '13px', padding: '0.6rem 1.4rem' }}
          >
            <span>
              {activePrice === 'all' ? 'Cualquier precio' : activePrice}
            </span>
            <ChevronDown size={16} />
          </button>
          {showPriceMenu && (
            <div className="price-dropdown-menu glass-card" style={{ borderRadius: 'var(--radius-md)', zIndex: 100 }}>
              <button
                className={`price-dropdown-item ${activePrice === 'all' ? 'active' : ''}`}
                onClick={() => { setActivePrice('all'); setShowPriceMenu(false) }}
              >Cualquiera</button>
              {PRICE_FILTERS.map((p) => (
                <button key={p}
                  className={`price-dropdown-item ${activePrice === p ? 'active' : ''}`}
                  onClick={() => { setActivePrice(p); setShowPriceMenu(false) }}
                >{p}</button>
              ))}
            </div>
          )}
        </div>

        {/* Discount toggle */}
        <button
          className={`filter-pill glass-card ${onlyDiscounts ? 'active' : ''}`}
          onClick={() => setOnlyDiscounts((v) => !v)}
          style={{ borderRadius: 'var(--radius-full)', padding: '0.6rem 1.4rem', fontSize: '13px' }}
        >
          <Tag size={16} style={{ marginRight: '8px' }} color="var(--primary)" />
          Con descuentos
        </button>

        {/* Clear */}
        {activeFiltersCount > 0 && (
          <button onClick={clearFilters} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary)', opacity: 0.8, cursor: 'pointer', background: 'none', border: 'none', marginLeft: 'auto' }}>
            Limpiar filtros
          </button>
        )}
      </div>

      <section className="feed-section" style={{ marginTop: '5rem' }}>
        <div className="feed-header" style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h2 className="mag-title" style={{ fontSize: '2.5rem' }}>
              {activeCategory === 'all' ? 'Explorar el circuito' : CATEGORIES.find((c) => c.slug === activeCategory)?.name}
            </h2>
            <p style={{ opacity: 0.5, marginTop: '0.5rem', fontWeight: 500 }}>{filtered.length} lugares encontrados para vos</p>
          </div>
          {compareIds.length >= 2 && (
            <button
              className="btn btn-primary"
              onClick={() => router.push(`/compare?ids=${compareIds.join(',')}`)}
              style={{ padding: '1rem 2rem', borderRadius: 'var(--radius-full)', fontWeight: 600, boxShadow: 'var(--primary-glow)' }}
            >
              Comparar selecciones <ArrowRight size={18} />
            </button>
          )}
        </div>

        {filtered.length > 0 ? (
          <div className="grid-establishments">
            {filtered.map((e, i) => {
              const promo      = e.promotions?.[0]
              const isSelected = compareIds.includes(e.id)
              const isMaxed    = !isSelected && compareIds.length >= 2
              return (
                <div
                  key={e.id}
                  className={`card-select-wrapper slide-up${isSelected ? ' is-selected' : ''}`}
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <Link href={`/establishment/${e.id}`} style={{ textDecoration: 'none' }}>
                    <Card
                      image={e.image_url ?? '/placeholder-establishment.svg'}
                      title={e.name} category={e.category}
                      priceRange={e.price_range}
                      originalPrice={promo?.original_price ?? undefined}
                      discountedPrice={promo?.discounted_price ?? undefined}
                      discountPercentage={promo?.discount_percentage ?? undefined}
                      avgRating={e.avgRating}
                      featured={e.plan === 'pro'}
                    />
                  </Link>
                  <button
                    className={`card-select-btn glass-card ${isSelected ? ' active' : ''}${isMaxed ? ' maxed' : ''}`}
                    onClick={() => !isMaxed && toggleCompare(e.id)}
                    style={{ borderRadius: '0 0 var(--radius-md) var(--radius-md)', borderTop: 'none', fontWeight: 600, fontSize: '12px', padding: '1rem' }}
                  >
                    {isSelected ? <><Check size={16} /> Comparando</> : <><Plus size={16} /> Comparar</>}
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="empty-state glass-card" style={{ padding: '8rem 2rem', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
            <span style={{ fontSize: '3rem', display: 'block' }}>✨</span>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '1.5rem' }}>No encontramos resultados</h3>
            <p style={{ opacity: 0.6, marginTop: '0.5rem' }}>Probá ajustando los filtros para descubrir nuevos lugares.</p>
            <button onClick={clearFilters} style={{ marginTop: '2rem', color: 'var(--primary)', fontWeight: 700, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
              Ver todos los beneficios
            </button>
          </div>
        )}
      </section>

    </>
  )
}
