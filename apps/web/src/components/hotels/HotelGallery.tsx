'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { HotelImage } from '@voyago/shared';

/** Gallery with a large primary image and a keyboard-navigable thumbnail rail. */
export function HotelGallery({ images, hotelName }: { images: HotelImage[]; hotelName: string }) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-2xl bg-sand-200 text-sm text-ink-muted">
        No images available for this demo property
      </div>
    );
  }

  const current = images[Math.min(active, images.length - 1)]!;

  return (
    <div data-testid="hotel-gallery">
      <div className="relative h-64 overflow-hidden rounded-2xl sm:h-96">
        <Image
          src={current.url}
          alt={current.alt || `${hotelName} photo ${active + 1}`}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 800px"
          className="object-cover"
        />
        <span className="absolute bottom-3 right-3 rounded-full bg-ink/70 px-3 py-1 text-xs font-medium text-white">
          {active + 1} / {images.length}
        </span>
      </div>

      {images.length > 1 ? (
        <ul
          className="mt-3 flex gap-2 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Hotel photos"
        >
          {images.map((image, index) => (
            <li key={`${image.url}-${index}`} role="presentation">
              <button
                type="button"
                role="tab"
                aria-selected={index === active}
                aria-label={`Show photo ${index + 1}`}
                onClick={() => setActive(index)}
                className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg transition ${
                  index === active
                    ? 'ring-2 ring-brand-600 ring-offset-2'
                    : 'opacity-75 hover:opacity-100'
                }`}
                data-testid={`gallery-thumb-${index}`}
              >
                <Image src={image.url} alt="" fill sizes="96px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
