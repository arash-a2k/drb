import React from 'react';

export default function Highlights(props) {
  const { title, highlights = [] } = props;

  return (
    <section className="overflow-hidden bg-[#f6f8f7] py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-8 flex flex-col gap-3 sm:mb-10 lg:flex-row lg:items-end lg:justify-between">
          <h2 className="max-w-2xl text-3xl font-black leading-tight text-slate-950 sm:text-4xl lg:text-5xl">
            {title}
          </h2>
          <div className="h-px flex-1 bg-slate-200 lg:mb-5" aria-hidden="true" />
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {highlights.slice(0, 3).map((item) => (
            <article key={item.header} className="group overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10">
              <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                <img
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  src={item.image}
                  alt={item.header}
                />
              </div>
              <div className="p-5 sm:p-6">
                <h3 className="text-xl font-black leading-7 text-slate-950">
                  {item.header}
                </h3>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  {item.content}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
