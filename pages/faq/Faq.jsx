import React from 'react';
import { useLanguage } from '../../hooks';
import Seo from '../../components/seo/Seo';
import * as text from './faq.json';

export default function Faq() {
  const { lang = 'fa' } = useLanguage() || {};
  const content = text[lang] || text.en;
  const dir = lang === 'fa' ? 'rtl' : 'ltr';

  return (
    <main dir={dir} className="bg-[#f6f8f7] text-slate-950">
      <Seo lang={lang} title={content.seoTitle} description={content.seoDescription} path="/faq" />
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="mb-4 inline-flex rounded-md border border-primary-muted bg-white px-4 py-2 text-sm font-bold text-primary-ink shadow-sm">
          FAQ
        </p>
        <h1 className="text-4xl font-black leading-tight sm:text-5xl">
          {content.title}
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
          {content.intro}
        </p>
      </section>

      <section className="bg-white py-10 sm:py-14">
        <div className="mx-auto grid max-w-5xl gap-4 px-4 sm:px-6">
          {content.questions.map((item) => (
            <article key={item.question} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black leading-8 text-slate-950">
                {item.question}
              </h2>
              {item.answer && (
                <p className="mt-3 text-base leading-8 text-slate-600">
                  {item.answer}
                </p>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
