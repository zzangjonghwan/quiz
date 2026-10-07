import type { CardImage as CardImageData } from '../types'

export function CardImage({ image, size = 'large' }: { image: CardImageData; size?: 'large' | 'small' }) {
  const light = image.background === 'light'
  return (
    <div
      className={`flex items-center justify-center overflow-hidden rounded-2xl ${
        light ? 'bg-white p-4 ring-1 ring-line' : 'bg-surface p-3'
      } ${size === 'large' ? 'h-48' : 'h-28'}`}
    >
      <img src={`./${image.src}`} alt={image.alt} className="max-h-full max-w-full object-contain" draggable={false} />
    </div>
  )
}
