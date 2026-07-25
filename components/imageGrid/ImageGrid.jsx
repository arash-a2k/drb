import React from 'react';

export default function ImageGrid(props) {
  const { images = [], title = '' } = props || {};

  return (
    <section className="bg-white py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {title && (
          <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <h2 className="max-w-3xl text-3xl font-black leading-tight text-slate-950 sm:text-4xl lg:text-5xl">
              {title}
            </h2>
            <div className="h-px flex-1 bg-slate-200 lg:mb-5" aria-hidden="true" />
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {images.map((image, index) => (
            <figure key={`${image.src}-${index}`} className="group overflow-hidden rounded-md bg-slate-100 shadow-sm">
              <img
                src={image.src}
                alt={image.alt}
                className="aspect-[5/4] h-full w-full object-cover transition duration-700 group-hover:scale-105"
                loading="lazy"
              />
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
