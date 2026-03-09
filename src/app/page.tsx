'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import Navbar from '@/components/ui/Navbar'
import Card from '@/components/ui/Card'

// ------------------------------------------------------------------
// Mock data — se reemplaza con fetch de Supabase cuando haya datos reales
// ------------------------------------------------------------------
const MOCK_ESTABLISHMENTS = [
  {
    id: '1',
    name: 'La Piazza Navona',
    category: 'restaurant',
    city: 'Roma, Italia',
    image: 'https://picsum.photos/seed/piazza/400/300',
    rating: 4.8,
    originalPrice: 28,
    discountedPrice: 19,
    discountPercentage: 32,
  },
  {
    id: '2',
    name: 'Bar del Pantheon',
    category: 'bar',
    city: 'Roma, Italia',
    image: 'https://picsum.photos/seed/pantheon/400/300',
    rating: 4.5,
    originalPrice: 16,
    discountedPrice: 10,
    discountPercentage: 37,
  },
  {
    id: '3',
    name: 'Club Piper Roma',
    category: 'club',
    city: 'Roma, Italia',
    image: 'https://picsum.photos/seed/piper/400/300',
    rating: 4.3,
    originalPrice: 20,
    discountedPrice: 12,
    discountPercentage: 40,
  },
  {
    id: '4',
    name: "Caffè Sant'Eustachio",
    category: 'cafe',
    city: 'Roma, Italia',
    image: 'https://picsum.photos/seed/eustachio/400/300',
    rating: 4.9,
    originalPrice: 8,
    discountedPrice: 5,
    discountPercentage: 37,
  },
  {
    id: '5',
    name: 'Teatro Argentina',
    category: 'cultural',
    city: 'Roma, Italia',
    image: 'https://picsum.photos/seed/argentina/400/300',
    rating: 4.7,
    originalPrice: 35,
    discountedPrice: 20,
    discountPercentage: 43,
  },
  {
    id: '6',
    name: 'CrossFit Trastevere',
    category: 'sports',
    city: 'Roma, Italia',
    image: 'https://picsum.photos/seed/crossfit/400/300',
    rating: 4.6,
    originalPrice: 15,
    discountedPrice: 8,
    discountPercentage: 47,
  },
]

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

// ------------------------------------------------------------------

export default function HomePage() {
  const [search, setSearch]     = useState('')
  const [activeCategory, setActiveCategory] = useState('all')

  const filtered = useMemo(() => {
    return MOCK_ESTABLISHMENTS.filter((e) => {
      const matchesCategory = activeCategory === 'all' || e.category === activeCategory
      const matchesSearch   = e.name.toLowerCase().includes(search.toLowerCase()) ||
                              e.city.toLowerCase().includes(search.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [search, activeCategory])

  return (
    <>
      <Navbar />

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
            filtered.map((e, i) => (
              <div key={e.id} className="slide-up" style={{ animationDelay: `${i * 0.06}s` }}>
                <Card
                  image={e.image}
                  title={e.name}
                  category={e.category}
                  location={e.city}
                  rating={e.rating}
                  originalPrice={e.originalPrice}
                  discountedPrice={e.discountedPrice}
                  discountPercentage={e.discountPercentage}
                />
              </div>
            ))
          ) : (
            <div className="empty-state">
              <span style={{ fontSize: '3rem' }}>🔍</span>
              <p>No encontramos resultados para &ldquo;{search}&rdquo;</p>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
