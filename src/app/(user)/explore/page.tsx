'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, Tag } from 'lucide-react'
import Link from 'next/link'
import Navbar from '@/components/ui/Navbar'
import Card from '@/components/ui/Card'
import { createClient } from '@/lib/supabase/client'

const CATEGORIES = [
  { slug: 'all',        name: 'Todos',           emoji: '✨' },
  { slug: 'restaurant', name: 'Restaurantes',     emoji: '🍽️' },
  { slug: 'bar',        name: 'Bares',            emoji: '🍺' },
  { slug: 'club',       name: 'Discotecas',       emoji: '🎵' },
  { slug: 'cafe',       name: 'Cafeterías',       emoji: '☕' },
  { slug: 'cultural',   name: 'Teatro & Cultura', emoji: '🎭' },
  { slug: 'sports',     name: 'Deportes',         emoji: '💪' },
  { slug: 'other',      name: 'Otros',            emoji: '🌟' },
]

const PRICE_FILTERS = [
  { value: 'all', label: 'Cualquier precio' },
  { value: '$',   label: '$' },
  { value: '$$',  label: '$$' },
  { value: '$$$', label: '$$$' },
  { value: '$$$$',label: '$$$$' },
]

interface Establishment {
  id: string
  name: string
  category: string
  city: string
  country: string
  image_url: string | null
  price_range: string | null
  plan: string
  promotions: { discounted_price: number | null; original_price: number | null; discount_percentage: number | null }[]
}

export default function ExplorePage() {
  const [search,          setSearch]          = useState('')
  const [activeCategory,  setActiveCategory]  = useState('all')
  const [activePrice,     setActivePrice]     = useState('all')
  const [onlyDiscounts,   setOnlyDiscounts]   = useState(false)
  const [establishments,  setEstablishments]  = useState<Establishment[]>([])
  const [loading,         setLoading]         = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('establishments')
        .select(`
          id, name, category, city, country, image_url, price_range, plan,
          promotions ( discounted_price, original_price, discount_percentage )
        `)
        .eq('is_active', true)
        .order('name')

      setEstablishments((data as Establishment[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    const result = establishments.filter((e) => {
      const matchesCategory = activeCategory === 'all' || e.category === activeCategory
      const matchesSearch   =
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.city.toLowerCase().includes(search.toLowerCase())
      const matchesPrice    = activePrice === 'all' || e.price_range === activePrice
      const hasPromo        = e.promotions?.some(
        (p) => p.discount_percentage != null || p.discounted_price != null
      )
      const matchesDiscount = !onlyDiscounts || hasPromo
      return matchesCategory && matchesSearch && matchesPrice && matchesDiscount
    })

    // Pro establishments first, then the rest
    return result.sort((a, b) => {
      if (a.plan === 'pro' && b.plan !== 'pro') return -1
      if (a.plan !== 'pro' && b.plan === 'pro') return  1
      return 0
    })
  }, [establishments, search, activeCategory, activePrice, onlyDiscounts])

  const activeFiltersCount = (activeCategory !== 'all' ? 1 : 0) +
    (activePrice !== 'all' ? 1 : 0) +
    (onlyDiscounts ? 1 : 0)

  function clearFilters() {
    setActiveCategory('all')
    setActivePrice('all')
    setOnlyDiscounts(false)
    setSearch('')
  }

  return (
    <>
      <Navbar />

      <section className="hero" style={{ paddingBottom: '2rem' }}>
        <h1 className="hero-title slide-up-1">
          Explorá <span className="gradient-text">todo</span>
        </h1>
        <p className="hero-subtitle slide-up-2">
          Todos los lugares con descuentos para estudiantes.
        </p>
        <div className="search-bar slide-up-3">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Buscá un lugar o ciudad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar establecimientos"
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
              <span>{cat.emoji}</span>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Secondary filters: price + discounts */}
      <div style={{ padding: '0.75rem var(--space-6)', borderBottom: '1px solid var(--card-border)', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', maxWidth: 1280, margin: '0 auto' }}>
        {PRICE_FILTERS.map((p) => (
          <button
            key={p.value}
            className={`category-pill ${activePrice === p.value ? 'active' : ''}`}
            style={{ padding: '4px 14px', fontSize: '0.8rem' }}
            onClick={() => setActivePrice(p.value)}
          >
            {p.label}
          </button>
        ))}

        <div style={{ width: 1, height: 20, background: 'var(--card-border)', margin: '0 4px' }} />

        <button
          className={`category-pill ${onlyDiscounts ? 'active' : ''}`}
          style={{ padding: '4px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 5 }}
          onClick={() => setOnlyDiscounts((v) => !v)}
        >
          <Tag size={13} />
          Con descuentos
        </button>

        {activeFiltersCount > 0 && (
          <button
            onClick={clearFilters}
            style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Limpiar filtros ({activeFiltersCount})
          </button>
        )}
      </div>

      <section className="feed-section">
        <div className="feed-header">
          <h2 className="feed-title">
            {activeCategory === 'all'
              ? 'Todos los lugares'
              : CATEGORIES.find((c) => c.slug === activeCategory)?.name}
          </h2>
          {!loading && (
            <span className="feed-count">
              {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {loading ? (
          <div className="empty-state">
            <p style={{ color: 'var(--text-muted)' }}>Cargando...</p>
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid-establishments">
            {filtered.map((e, i) => {
              const promo = e.promotions?.[0]
              return (
                <div key={e.id} className="slide-up" style={{ animationDelay: `${i * 0.06}s` }}>
                  <Link href={`/establishment/${e.id}`} style={{ textDecoration: 'none' }}>
                    <Card
                      image={e.image_url ?? `https://picsum.photos/seed/${e.id}/400/300`}
                      title={e.name}
                      category={e.category}
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
            <p>
              {search || activeFiltersCount > 0
                ? 'No encontramos resultados con estos filtros.'
                : 'No hay establecimientos en esta categoría todavía.'}
            </p>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--primary-light)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </section>
    </>
  )
}
