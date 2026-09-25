import React from 'react';
import { HighlightedText } from '../common';

export default function ArticleSolo(props) {
  const { subtitle, title, content, imageSrc, highlights = [] } = props;

  return (
    <section className="overflow-hidden bg-white py-14 sm:py-20">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.86fr_1fr] lg:items-center">
        <div className="relative">
          <div className="absolute -inset-3 rounded-md bg-primary-soft" aria-hidden="true" />
          <img
            className="relative aspect-[4/5] w-full rounded-md object-cover shadow-xl shadow-slate-900/10"
            src={imageSrc}
            alt="dentist-dr-khatayee"
          />
        </div>

        <div className="lg:px-8">
          {subtitle && (
            <p className="mb-4 text-sm font-black uppercase text-primary">
              {subtitle}
            </p>
          )}
          <h2 className="max-w-2xl text-3xl font-black leading-tight text-slate-950 sm:text-4xl lg:text-5xl">
            {title}
          </h2>
          <p className="mt-6 text-base leading-8 text-slate-600 sm:text-lg">
            <HighlightedText text={content} highlights={highlights} />
          </p>
        </div>
      </div>
    </section>
  );
}
