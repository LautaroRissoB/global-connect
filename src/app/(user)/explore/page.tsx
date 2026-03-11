'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search } from 'lucide-react'
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

interface Establishment {
  id: string
  name: string
  category: string
  city: string
  country: string
  image_url: string | null
  promotions: { discounted_price: number | null; original_price: number | null; discount_percentage: number | null }[]
}

export default function ExplorePage() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [establishments, setEstablishments] = useState<Establishment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('establishments')
        .select(`
          id, name, category, city, country, image_url,
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
                      originalPrice={promo?.original_price ?? undefined}
                      discountedPrice={promo?.discounted_price ?? undefined}
                      discountPercentage={promo?.discount_percentage ?? undefined}
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
              {search
                ? `No encontramos resultados para "${search}"`
                : 'No hay establecimientos en esta categoría todavía.'}
            </p>
          </div>
        )}
      </section>
    </>
  )
}
