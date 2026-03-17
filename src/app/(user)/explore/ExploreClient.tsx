'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { Search, Tag, Check, Plus, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
  const t  = useTranslations('explore')
  const tc = useTranslations('categories')
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

  const selectedForCompare = establishments.filter((e) => compareIds.includes(e.id))

  return (
    <>
      <section className="hero" style={{ paddingBottom: '2rem' }}>
        <h1 className="hero-title slide-up-1">
          {heroStart} <span className="gradient-text">{heroEnd}</span>
        </h1>
        <p className="hero-subtitle slide-up-2">{t('hero_subtitle')}</p>
        <div className="search-bar slide-up-3">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder={t('search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={t('search_placeholder')}
          />
        </div>
      </section>

      {/* Compact filter bar — three controls always visible */}
      <div className="filters-bar slide-up-4">

        {/* Category dropdown */}
        <div ref={categoryMenuRef} className="price-dropdown-wrapper">
          <button
            className={`filter-pill price-dropdown-trigger ${activeCategory !== 'all' ? 'active' : ''}`}
            onClick={() => setShowCategoryMenu((v) => !v)}
          >
            {CATEGORIES.find((c) => c.slug === activeCategory)?.emoji}{' '}
            {CATEGORIES.find((c) => c.slug === activeCategory)?.name ?? tc('all')}
            <ChevronDown size={12} style={{ transition: 'transform 0.15s', transform: showCategoryMenu ? 'rotate(180deg)' : 'none' }} />
          </button>
          {showCategoryMenu && (
            <div className="price-dropdown-menu">
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
            className={`filter-pill price-dropdown-trigger ${activePrice !== 'all' ? 'active' : ''}`}
            onClick={() => setShowPriceMenu((v) => !v)}
          >
            {activePrice === 'all' ? t('any_price') : activePrice}
            <ChevronDown size={12} style={{ transition: 'transform 0.15s', transform: showPriceMenu ? 'rotate(180deg)' : 'none' }} />
          </button>
          {showPriceMenu && (
            <div className="price-dropdown-menu">
              <button
                className={`price-dropdown-item ${activePrice === 'all' ? 'active' : ''}`}
                onClick={() => { setActivePrice('all'); setShowPriceMenu(false) }}
              >{t('any_price')}</button>
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
          className={`filter-pill filter-pill-discount ${onlyDiscounts ? 'active' : ''}`}
          onClick={() => setOnlyDiscounts((v) => !v)}
        ><Tag size={12} />{t('with_discounts')}</button>

        {/* Clear */}
        {activeFiltersCount > 0 && (
          <button className="filters-clear" onClick={clearFilters}>
            {t('clear_filters')} ({activeFiltersCount})
          </button>
        )}
      </div>

      <section className="feed-section">
        <div className="feed-header">
          <h2 className="feed-title">
            {activeCategory === 'all' ? t('all_places') : CATEGORIES.find((c) => c.slug === activeCategory)?.name}
          </h2>
          <span className="feed-count">{t('results', { count: filtered.length })}</span>
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
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  <Link href={`/establishment/${e.id}`} style={{ textDecoration: 'none' }}>
                    <Card
                      image={e.image_url ?? `https://picsum.photos/seed/${e.id}/400/300`}
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
                    className={`card-select-btn${isSelected ? ' active' : ''}${isMaxed ? ' maxed' : ''}`}
                    onClick={() => !isMaxed && toggleCompare(e.id)}
                    aria-label={isSelected ? 'Quitar de comparación' : 'Agregar a comparación'}
                    title={isMaxed ? 'Máximo 2 lugares' : undefined}
                  >
                    {isSelected ? <><Check size={12} /> Comparando</> : <><Plus size={12} /> Comparar</>}
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="empty-state">
            <span style={{ fontSize: '3rem' }}>🔍</span>
            <p>{search || activeFiltersCount > 0 ? t('empty_filters') : t('empty_category')}</p>
            {activeFiltersCount > 0 && (
              <button onClick={clearFilters} style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--primary-light)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                {t('clear_filters')}
              </button>
            )}
          </div>
        )}
      </section>

      {/* ── Floating compare bar ──────────────────────────────────────────── */}
      {compareIds.length > 0 && (
        <div className="compare-float-bar">
          <div className="compare-float-thumbs">
            {selectedForCompare.map((e) => (
              <div key={e.id} className="compare-float-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={e.image_url ?? `https://picsum.photos/seed/${e.id}/48/48`} alt={e.name} />
                <button onClick={() => toggleCompare(e.id)} aria-label={`Quitar ${e.name}`}>✕</button>
              </div>
            ))}
          </div>

          {compareIds.length >= 2 ? (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => router.push(`/compare?ids=${compareIds.join(',')}`)}
              style={{ borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap' }}
            >
              Comparar ({compareIds.length}) →
            </button>
          ) : (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingRight: '0.25rem' }}>
              Seleccioná 1 más
            </span>
          )}

          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setCompareIds([])}
            style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap' }}
          >
            Limpiar
          </button>
        </div>
      )}

    </>
  )
}
