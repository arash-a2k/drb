import React from 'react';

import { useLanguage } from '../../hooks';
import * as text from './home.json';
import Highlights from './Highlights';
import Teasers from './Teasers';
import ArticleSolo from '../../components/article-solo/ArticleSolo';
import * as contactText from '../../translations/contact.json';

export default function Home() {
  const { lang = 'fa' } = useLanguage() || {};
  const home = text[lang] || text.en;
  const contact = contactText[lang] || contactText.en;
  const dir = lang === 'fa' ? 'rtl' : 'ltr';
  const { highlightTitle, highlights, teasers, stats = [] } = home;

  return (
    <main dir={dir} className="bg-[#f6f8f7] text-slate-950">
      <section className="overflow-hidden">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_0.92fr] lg:items-center lg:py-14">
          <div className="relative z-10">
            <p className="mb-5 inline-flex rounded-md border border-primary-muted bg-white px-4 py-2 text-sm font-bold text-primary-ink shadow-sm">
              {home.eyebrow}
            </p>
            <h1 className="max-w-4xl text-4xl font-black leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
              {home.title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
              {home.heroLead}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={`/${lang}/contact-us`} className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-base font-bold text-white shadow-lg shadow-slate-900/15 transition hover:bg-primary-strong">
                {home.primaryCta}
              </a>
              <a href={`/${lang}/treatments/composite-veneer`} className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-6 py-3 text-base font-bold text-slate-800 transition hover:border-primary hover:text-primary-ink">
                {home.secondaryCta}
              </a>
            </div>

            <dl className="mt-10 grid grid-cols-3 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
              {stats.map((stat, index) => (
                <div key={stat.label} className={`px-3 py-5 text-center ${index > 0 ? 'border-l border-slate-200' : ''}`}>
                  <dt className="text-2xl font-black text-slate-950 sm:text-3xl">{stat.value}</dt>
                  <dd className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">{stat.label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative min-h-[460px] overflow-hidden rounded-md bg-slate-200 shadow-2xl shadow-slate-900/15 lg:min-h-[620px]">
            <img
              src="/assets/images/carousel/office-main.webp"
              alt={contact.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/25 to-transparent p-5 sm:p-7">
              <div className="max-w-sm rounded-md border border-white/20 bg-white/90 p-4 shadow-lg backdrop-blur">
                <p className="text-sm font-bold text-slate-950">{contact.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{contact.visitTimes}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ArticleSolo title={home.name} subtitle={home.eyebrow} content={home.content} imageSrc="/assets/images/home/drb.webp" />
      <Highlights title={highlightTitle} highlights={highlights} />
      <Teasers teasers={teasers} />
    </main>
  );
}
