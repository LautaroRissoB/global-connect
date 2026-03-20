interface CardProps {
  image: string
  title: string
  category: string
  priceRange?: string | null
  originalPrice?: number
  discountedPrice?: number
  discountPercentage?: number
  avgRating?: string | null
  featured?: boolean
  onClick?: () => void
}

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

export default function Card({
  image,
  title,
  category,
  priceRange,
  originalPrice,
  discountedPrice,
  discountPercentage,
  avgRating,
  featured,
  onClick,
}: CardProps) {
  return (
    <div className={`card glass-card ${featured ? 'card-featured' : ''}`} onClick={onClick} role={onClick ? 'button' : undefined} 
      style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)', transition: 'transform 0.4s var(--ease)', cursor: 'pointer' }}>
      <div className="card-image-wrapper" style={{ height: '240px', position: 'relative' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={title} className="card-image" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <span className="premium-chip" style={{ position: 'absolute', top: '15px', left: '15px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', border: 'none', fontSize: '10px' }}>
          {CATEGORY_LABELS[category] ?? category}
        </span>
        {featured && (
          <div className="premium-chip" style={{ position: 'absolute', top: '15px', left: '15px', background: 'var(--primary)', border: 'none', fontSize: '10px' }}>
            Exclusivo
          </div>
        )}
      </div>

      <div className="card-body" style={{ padding: '2rem' }}>
        <div className="card-header-row">
          <h3 className="card-title" style={{ fontWeight: 700, fontSize: '1.5rem', marginBottom: '0.5rem' }}>{title}</h3>
          {priceRange && <span style={{ fontSize: '12px', opacity: 0.5, fontWeight: 500 }}>{priceRange}</span>}
        </div>

        <div className="card-info-row" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {discountPercentage ? (
            <span style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.02em' }}>
              {discountPercentage}% Off
            </span>
          ) : discountedPrice != null ? (
            <div className="card-price-wrapper">
              {originalPrice != null && (
                <span className="card-original-price" style={{ textDecoration: 'line-through', opacity: 0.4, marginRight: '8px' }}>${originalPrice}</span>
              )}
              <span className="card-price" style={{ color: 'var(--text)', fontWeight: 700 }}>${discountedPrice}</span>
            </div>
          ) : (
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)' }}>Descubrir</span>
          )}
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)' }}>★ {avgRating || 'Nuevo'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
