'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import Link from 'next/link'
import Card from '@/components/ui/Card'

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

interface Promo {
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
  promotions: Promo[]
}

interface Props {
  establishments: Establishment[]
}

export default function HomeFeed({ establishments }: Props) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')

  const filtered = useMemo(() => {
    return establishments.filter((e) => {
      const matchesCategory = activeCategory === 'all' || e.category === activeCategory
      const matchesSearch =
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.city.toLowerCase().includes(search.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [establishments, search, activeCategory])

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <p className="fade-in" style={{ color: 'var(--primary-light)', fontWeight: 600, marginBottom: '1rem', fontSize: '0.875rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Para estudiantes de intercambio
        </p>
        <h1 className="hero-title slide-up-1">
          Descubrí tu{' '}
          <span className="gradient-text">nueva ciudad</span>
        </h1>
        <p className="hero-subtitle slide-up-2">
          Encontrá los mejores restaurantes, bares y más cerca tuyo,
          con ofertas exclusivas para estudiantes de intercambio.
        </p>

        {/* Search */}
        <div className="search-bar slide-up-3">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Buscá un lugar o ciudad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar establecimientos"
          />
          <button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>
            Buscar
          </button>
        </div>
      </section>

      {/* Category Filters */}
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

      {/* Feed */}
      <section className="feed-section">
        <div className="feed-header">
          <h2 className="feed-title">
            {activeCategory === 'all'
              ? 'Todos los lugares'
              : CATEGORIES.find((c) => c.slug === activeCategory)?.name}
          </h2>
          <span className="feed-count">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="grid-establishments">
          {filtered.length > 0 ? (
            filtered.map((e, i) => {
              const promo = e.promotions?.find((p) => p.is_active)
              return (
                <div key={e.id} className="slide-up" style={{ animationDelay: `${i * 0.06}s` }}>
                  <Link href={`/establishment/${e.id}`} style={{ textDecoration: 'none' }}>
                    <Card
                      image={e.image_url ?? `https://picsum.photos/seed/${e.id}/400/300`}
                      title={e.name}
                      category={e.category}
                      location={`${e.city}, ${e.country}`}
                      rating={4.5}
                      originalPrice={promo?.original_price ?? undefined}
                      discountedPrice={promo?.discounted_price ?? undefined}
                      discountPercentage={promo?.discount_percentage ?? undefined}
                    />
                  </Link>
                </div>
              )
            })
          ) : (
            <div className="empty-state">
              <span style={{ fontSize: '3rem' }}>🔍</span>
              <p>
                {search
                  ? `No encontramos resultados para "${search}"`
                  : 'No hay establecimientos cargados todavía.'}
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
