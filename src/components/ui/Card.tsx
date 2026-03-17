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
      </div>

      <div className="card-body">
        <div className="card-header-row">
          <h3 className="card-title">{title}</h3>
          {priceRange && <span className="card-price-range">{priceRange}</span>}
        </div>

        <div className="card-info-row">
          {discountPercentage ? (
            <span className="card-discount-text">-{discountPercentage}% OFF</span>
          ) : discountedPrice != null ? (
            <div className="card-price-wrapper">
              {originalPrice != null && (
                <span className="card-original-price">${originalPrice}</span>
              )}
              <span className="card-price">${discountedPrice}</span>
            </div>
          ) : (
            <span className="card-see-promos">Ver promos</span>
          )}
          {avgRating ? (
            <span className="card-avg-rating">⭐ {avgRating}</span>
          ) : (
            <span className="card-new-badge">Nuevo</span>
          )}
        </div>
      </div>
    </div>
  )
}
