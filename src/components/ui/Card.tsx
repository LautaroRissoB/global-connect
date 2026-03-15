interface CardProps {
  image: string
  title: string
  category: string
  location: string
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
  location,
  priceRange,
  originalPrice,
  discountedPrice,
  discountPercentage,
  avgRating,
  featured,
  onClick,
}: CardProps) {
  return (
    <div className={`card${featured ? ' card-featured' : ''}`} onClick={onClick} role={onClick ? 'button' : undefined}>
      <div className="card-image-wrapper">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={title} className="card-image" loading="lazy" />
        <span className="card-badge">
          {CATEGORY_LABELS[category] ?? category}
        </span>
        {featured && (
          <span className="card-featured-badge">⭐ Destacado</span>
        )}
        {discountPercentage && (
          <span className="card-discount-badge">-{discountPercentage}%</span>
        )}
      </div>

      <div className="card-body">
        <h3 className="card-title">{title}</h3>
        <p className="card-location">{location}</p>

        <div className="card-footer">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            {discountedPrice != null ? (
              <div className="card-price-wrapper">
                {originalPrice != null && (
                  <span className="card-original-price">${originalPrice}</span>
                )}
                <span className="card-price">${discountedPrice}</span>
              </div>
            ) : (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-faint)' }}>Ver promos</span>
            )}
            {avgRating ? (
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fdcb6e' }}>
                ⭐ {avgRating}
              </span>
            ) : (
              <span style={{ fontSize: '0.65rem', color: 'var(--text-faint)' }}>
                ☆☆☆☆☆
              </span>
            )}
          </div>
          {priceRange && (
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginLeft: 'auto', flexShrink: 0 }}>
              {priceRange}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
