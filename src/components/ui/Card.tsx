interface CardProps {
  image: string
  title: string
  category: string
  location: string
  rating: number
  originalPrice?: number
  discountedPrice?: number
  discountPercentage?: number
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
  rating,
  originalPrice,
  discountedPrice,
  discountPercentage,
  onClick,
}: CardProps) {
  return (
    <div className="card" onClick={onClick} role={onClick ? 'button' : undefined}>
      <div className="card-image-wrapper">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={title} className="card-image" loading="lazy" />
        <span className="card-badge">
          {CATEGORY_LABELS[category] ?? category}
        </span>
        {discountPercentage && (
          <span className="card-discount-badge">-{discountPercentage}%</span>
        )}
      </div>

      <div className="card-body">
        <h3 className="card-title">{title}</h3>
        <p className="card-location">{location}</p>

        <div className="card-footer">
          <span className="card-rating">
            <span className="card-rating-star">★</span> {rating.toFixed(1)}
          </span>

          {discountedPrice != null && (
            <div className="card-price-wrapper">
              {originalPrice != null && (
                <span className="card-original-price">€{originalPrice}</span>
              )}
              <span className="card-price">€{discountedPrice}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
