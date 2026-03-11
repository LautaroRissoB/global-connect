'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, Tag } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import Navbar from '@/components/ui/Navbar'
import Card from '@/components/ui/Card'
import { createClient } from '@/lib/supabase/client'

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

const PRICE_FILTERS = ['$', '$$', '$$$', '$$$$']

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

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('establishments')
        .select(`id, name, category, city, country, image_url, price_range, plan,
          promotions ( discounted_price, original_price, discount_percentage )`)
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
              const promo = e.promotions?.[0]
              return (
                <div key={e.id} className="slide-up" style={{ animationDelay: `${i * 0.06}s` }}>
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
    </>
  )
}
