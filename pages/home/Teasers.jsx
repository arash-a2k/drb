import React from 'react';

function CheckIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.8 3.8 6.8-6.8a1 1 0 011.4 0z" clipRule="evenodd" />
    </svg>
  );
}

export default function Teasers(props) {
  const { teasers = [] } = props;

  return (
    <section className="bg-white py-8 sm:py-14">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6">
        {teasers.slice(0, 3).map((teaser, index) => {
          const imageRight = index % 2 === 1;

          return (
            <article key={teaser.header} className="overflow-hidden rounded-md border border-slate-200 bg-[#fbfcfc]">
              <div className="grid gap-0 lg:grid-cols-2">
                <div className={`${imageRight ? 'lg:order-2' : ''} min-h-[320px] overflow-hidden bg-slate-100`}>
                  <img className="h-full w-full object-cover" src={teaser.image} alt={teaser.header} />
                </div>

                <div className="flex items-center p-6 sm:p-10 lg:p-12">
                  <div className="max-w-xl">
                    <h2 className="text-3xl font-black leading-tight text-slate-950 sm:text-4xl">
                      {teaser.header}
                    </h2>
                    <p className="mt-5 text-base leading-8 text-slate-600">
                      {teaser.content}
                    </p>

                    <div className="mt-7 flex flex-wrap gap-2">
                      {teaser.labels?.map((label) => (
                        <span key={label} className="inline-flex items-center gap-2 rounded-md border border-primary-muted bg-primary-soft px-3 py-2 text-sm font-bold text-primary-ink">
                          <CheckIcon />
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
