import React from 'react';

export default function ImageGrid(props) {
  const { images = [], title = '' } = props || {};

  return (
    <section className="bg-white py-10 sm:py-16 border-t border-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {title && (
          <div className="mb-6 sm:mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between text-start">
            <h2 className="max-w-3xl text-2xl font-black leading-tight text-slate-950 sm:text-3xl lg:text-4xl">
              {title}
            </h2>
            <div className="h-px flex-1 bg-slate-200/80 lg:mb-3" aria-hidden="true" />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
          {images.map((image, index) => (
            <figure key={`${image.src}-${index}`} className="group overflow-hidden rounded-2xl bg-slate-100 shadow-sm hover:shadow-md transition duration-300">
              <img
                src={image.src}
                alt={image.alt}
                className="aspect-[4/3] h-full w-full object-cover transition duration-500 group-hover:scale-105"
                loading="lazy"
              />
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
