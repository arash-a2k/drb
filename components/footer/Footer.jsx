import React from 'react';
import { useLanguage } from '../../hooks';
import * as text from './footer.json';

function InstagramIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M17.5 6.8h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function Footer() {
  const { lang = 'fa' } = useLanguage() || {};
  const footer = text[lang] || text.en;
  const { quote, blocks, social, title } = footer;
  const dir = lang === 'fa' ? 'rtl' : 'ltr';

  return (
    <footer dir={dir} className="bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <div className="flex items-center gap-3">
              <img className="h-14 w-14 rounded-md bg-white object-contain p-2" src="/assets/images/logo.png" alt={title} />
              <div>
                <h2 className="text-xl font-black leading-7">{title}</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-300">{quote}</p>
              </div>
            </div>

            <a
              href={social.link}
              className="mt-8 inline-flex items-center gap-3 rounded-md border border-white/15 bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-primary-soft"
            >
              <InstagramIcon />
              <span>{social.id}</span>
            </a>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {blocks.map((block, index) => (
              <section key={`block-${index}`} className="rounded-md border border-white/10 bg-white/5 p-5">
                <h3 className="text-base font-black text-white">{block.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{block.descr}</p>
              </section>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
