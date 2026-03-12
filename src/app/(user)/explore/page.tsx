'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, Tag, Check, Plus, X } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import Navbar from '@/components/ui/Navbar'
import Card from '@/components/ui/Card'
import { createClient } from '@/lib/supabase/client'

interface Promotion {
  discounted_price: number | null
  original_price: number | null
  discount_percentage: number | null
  is_active: boolean
}

interface Establishment {
  id: string
  name: string
  category: string
  city: string
  country: string
  image_url: string | null
  price_range: string | null
  plan: string
  promotions: Promotion[]
}

const PRICE_FILTERS = ['$', '$$', '$$$', '$$$$']

const CATEGORY_LABELS: Record<string, string> = {
  restaurant: 'Restaurante',
  bar:        'Bar',
  club:       'Discoteca',
  cafe:       'Cafetería',
  cultural:   'Cultura',
  theater:    'Teatro',
  sports:     'Deportes',
  other:      'Otro',
}

const CATEGORY_EMOJI: Record<string, string> = {
  restaurant: '🍽️',
  bar:        '🍺',
  club:       '🎵',
  cafe:       '☕',
  cultural:   '🎭',
  theater:    '🎪',
  sports:     '💪',
  other:      '🌟',
}

const PRICE_ORDER: Record<string, number> = {
  '$':    1,
  '$$':   2,
  '$$$':  3,
  '$$$$': 4,
}

/** Returns 'winner' | 'loser' | 'neutral' for each value in the array */
function getStates(
  values: (number | null)[],
  lowerIsBetter: boolean,
): ('winner' | 'loser' | 'neutral')[] {
  const nums = values.map((v) => (v === null ? null : v))

  const defined = nums.filter((v): v is number => v !== null)
  if (defined.length < 2) return values.map(() => 'neutral')

  const best  = lowerIsBetter ? Math.min(...defined) : Math.max(...defined)
  const worst = lowerIsBetter ? Math.max(...defined) : Math.min(...defined)

  if (best === worst) return values.map(() => 'neutral')

  return nums.map((v) => {
    if (v === null) return 'neutral'
    if (v === best)  return 'winner'
    if (v === worst) return 'loser'
    return 'neutral'
  })
}

export default function ExplorePage() {
  const t  = useTranslations('explore')
  const tc = useTranslations('categories')

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
  const [establishments, setEstablishments] = useState<Establishment[]>([])
  const [loading,        setLoading]        = useState(true)
  const [compareIds,     setCompareIds]     = useState<string[]>([])
  const [showPanel,      setShowPanel]      = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('establishments')
        .select(`id, name, category, city, country, image_url, price_range, plan,
          promotions ( discounted_price, original_price, discount_percentage, is_active )`)
        .eq('is_active', true)
        .order('name')

      setEstablishments((data as Establishment[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 3)  return prev
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

  // Split last word of hero title for gradient effect
  const heroWords = t('hero_title').split(' ')
  const heroStart = heroWords.slice(0, -1).join(' ')
  const heroEnd   = heroWords.slice(-1)[0]

  // Establishments selected for comparison
  const selectedForCompare = establishments.filter((e) => compareIds.includes(e.id))

  // ── Metric helpers ──────────────────────────────────────────────────────────

  // Price numeric values (null if no price_range)
  const priceValues = selectedForCompare.map((e) =>
    e.price_range ? (PRICE_ORDER[e.price_range] ?? null) : null,
  )
  const priceStates = getStates(priceValues, true)

  // Best discount_percentage per establishment
  const discountValues = selectedForCompare.map((e) => {
    const percs = e.promotions
      .map((p) => p.discount_percentage)
      .filter((d): d is number => d !== null)
    return percs.length > 0 ? Math.max(...percs) : null
  })
  const discountStates = getStates(discountValues, false)

  // Active promos count
  const activePromoValues = selectedForCompare.map((e) =>
    e.promotions.filter((p) => p.is_active).length,
  )
  const activePromoStates = getStates(activePromoValues, false)

  return (
    <>
      <Navbar />

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

      {/* Category filter */}
      <div className="category-section slide-up-4">
        <div className="category-filters">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.slug}
              className={`category-pill ${activeCategory === cat.slug ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.slug)}
            >
              <span>{cat.emoji}</span>{cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Price + discount filters */}
      <div style={{ padding: '0.75rem var(--space-6)', borderBottom: '1px solid var(--card-border)', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', maxWidth: 1280, margin: '0 auto' }}>
        <button
          className={`category-pill ${activePrice === 'all' ? 'active' : ''}`}
          style={{ padding: '4px 14px', fontSize: '0.8rem' }}
          onClick={() => setActivePrice('all')}
        >{t('any_price')}</button>
        {PRICE_FILTERS.map((p) => (
          <button key={p}
            className={`category-pill ${activePrice === p ? 'active' : ''}`}
            style={{ padding: '4px 14px', fontSize: '0.8rem' }}
            onClick={() => setActivePrice(p)}
          >{p}</button>
        ))}
        <div style={{ width: 1, height: 20, background: 'var(--card-border)', margin: '0 4px' }} />
        <button
          className={`category-pill ${onlyDiscounts ? 'active' : ''}`}
          style={{ padding: '4px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 5 }}
          onClick={() => setOnlyDiscounts((v) => !v)}
        ><Tag size={13} />{t('with_discounts')}</button>
        {activeFiltersCount > 0 && (
          <button onClick={clearFilters} style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            {t('clear_filters')} ({activeFiltersCount})
          </button>
        )}
      </div>

      <section className="feed-section">
        <div className="feed-header">
          <h2 className="feed-title">
            {activeCategory === 'all' ? t('all_places') : CATEGORIES.find((c) => c.slug === activeCategory)?.name}
          </h2>
          {!loading && <span className="feed-count">{t('results', { count: filtered.length })}</span>}
        </div>

        {loading ? (
          <div className="empty-state"><p style={{ color: 'var(--text-muted)' }}>{t('loading')}</p></div>
        ) : filtered.length > 0 ? (
          <div className="grid-establishments">
            {filtered.map((e, i) => {
              const promo      = e.promotions?.[0]
              const isSelected = compareIds.includes(e.id)
              const isMaxed    = !isSelected && compareIds.length >= 3
              return (
                <div
                  key={e.id}
                  className={`card-select-wrapper slide-up${isSelected ? ' is-selected' : ''}`}
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  {/* Compare toggle button */}
                  <button
                    className={`card-select-btn${isSelected ? ' active' : ''}${isMaxed ? ' maxed' : ''}`}
                    onClick={() => !isMaxed && toggleCompare(e.id)}
                    aria-label={isSelected ? 'Quitar de comparación' : 'Agregar a comparación'}
                    title={isMaxed ? 'Máximo 3 lugares' : isSelected ? 'Quitar de comparación' : 'Agregar a comparación'}
                  >
                    {isSelected ? <Check size={14} /> : <Plus size={14} />}
                  </button>

                  <Link href={`/establishment/${e.id}`} style={{ textDecoration: 'none' }}>
                    <Card
                      image={e.image_url ?? `https://picsum.photos/seed/${e.id}/400/300`}
                      title={e.name} category={e.category}
                      location={`${e.city}, ${e.country}`}
                      priceRange={e.price_range}
                      originalPrice={promo?.original_price ?? undefined}
                      discountedPrice={promo?.discounted_price ?? undefined}
                      discountPercentage={promo?.discount_percentage ?? undefined}
                      featured={e.plan === 'pro'}
                    />
                  </Link>
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
          {/* Thumbnails */}
          <div className="compare-float-thumbs">
            {selectedForCompare.map((e) => (
              <div key={e.id} className="compare-float-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={e.image_url ?? `https://picsum.photos/seed/${e.id}/48/48`}
                  alt={e.name}
                />
                <button
                  onClick={() => toggleCompare(e.id)}
                  aria-label={`Quitar ${e.name}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Actions */}
          {compareIds.length >= 2 ? (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowPanel(true)}
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

      {/* ── Comparison overlay panel ──────────────────────────────────────── */}
      {showPanel && selectedForCompare.length >= 2 && (
        <div
          className="cmp-backdrop"
          onClick={() => setShowPanel(false)}
        >
          <div
            className="cmp-panel"
            onClick={(ev) => ev.stopPropagation()}
          >
            {/* Handle */}
            <div className="cmp-handle" />

            {/* Header */}
            <div className="cmp-header">
              <span className="cmp-header-title">
                Comparando {selectedForCompare.length} lugares
              </span>
              <button
                onClick={() => setShowPanel(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 4 }}
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="cmp-content">
              <div
                className="cmp-cols"
                style={{ gridTemplateColumns: `repeat(${selectedForCompare.length}, minmax(140px, 1fr))` }}
              >
                {/* Row 1: image + name + category */}
                {selectedForCompare.map((e) => (
                  <div key={e.id} className="cmp-col-header">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={e.image_url ?? `https://picsum.photos/seed/${e.id}/400/300`}
                      alt={e.name}
                      className="cmp-col-img"
                    />
                    <span className="cmp-col-name">{e.name}</span>
                    <span className="cmp-col-cat">
                      {CATEGORY_EMOJI[e.category] ?? '🌟'} {CATEGORY_LABELS[e.category] ?? e.category}
                    </span>
                  </div>
                ))}
              </div>

              {/* Metric: Precio */}
              <div className="cmp-section">
                <div
                  className="cmp-cols"
                  style={{ gridTemplateColumns: `repeat(${selectedForCompare.length}, minmax(140px, 1fr))` }}
                >
                  <div className="cmp-section-label" style={{ gridColumn: `1 / -1` }}>
                    Precio
                  </div>
                  {selectedForCompare.map((e, idx) => {
                    const state = priceStates[idx]
                    return (
                      <div key={e.id} className={`cmp-metric-cell ${state}`}>
                        <span className="cmp-metric-value">
                          {e.price_range ?? '—'}
                        </span>
                        {state === 'winner' && (
                          <span className="cmp-metric-verdict">✓ Mejor precio</span>
                        )}
                        {state === 'loser' && (
                          <span className="cmp-metric-verdict">Precio más alto</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Metric: Mejor descuento */}
              <div className="cmp-section">
                <div
                  className="cmp-cols"
                  style={{ gridTemplateColumns: `repeat(${selectedForCompare.length}, minmax(140px, 1fr))` }}
                >
                  <div className="cmp-section-label" style={{ gridColumn: `1 / -1` }}>
                    Mejor descuento
                  </div>
                  {selectedForCompare.map((e, idx) => {
                    const state = discountStates[idx]
                    const val   = discountValues[idx]
                    return (
                      <div key={e.id} className={`cmp-metric-cell ${state}`}>
                        <span className="cmp-metric-value">
                          {val !== null ? `${val}%` : 'Sin desc'}
                        </span>
                        {state === 'winner' && (
                          <span className="cmp-metric-verdict">✓ Mejor opción</span>
                        )}
                        {state === 'loser' && (
                          <span className="cmp-metric-verdict">Menor descuento</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Metric: Promos activas */}
              <div className="cmp-section">
                <div
                  className="cmp-cols"
                  style={{ gridTemplateColumns: `repeat(${selectedForCompare.length}, minmax(140px, 1fr))` }}
                >
                  <div className="cmp-section-label" style={{ gridColumn: `1 / -1` }}>
                    Promos activas
                  </div>
                  {selectedForCompare.map((e, idx) => {
                    const state = activePromoStates[idx]
                    const val   = activePromoValues[idx]
                    return (
                      <div key={e.id} className={`cmp-metric-cell ${state}`}>
                        <span className="cmp-metric-value">{val}</span>
                        {state === 'winner' && (
                          <span className="cmp-metric-verdict">✓ Mejor opción</span>
                        )}
                        {state === 'loser' && (
                          <span className="cmp-metric-verdict">Menos promos</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* CTA row */}
              <div
                className="cmp-cta-row"
                style={{ gridTemplateColumns: `repeat(${selectedForCompare.length}, minmax(140px, 1fr))` }}
              >
                {selectedForCompare.map((e) => (
                  <Link
                    key={e.id}
                    href={`/establishment/${e.id}`}
                    className="btn btn-outline btn-sm"
                    style={{ textAlign: 'center', borderRadius: 'var(--radius-md)', justifyContent: 'center' }}
                    onClick={() => setShowPanel(false)}
                  >
                    Ver detalle →
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
