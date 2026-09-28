import React from 'react';
import { ContentSection, DataTable } from '../common';
import ImageGrid from '../imageGrid/ImageGrid';
import { useLanguage } from '../../hooks';

export default function SoloImageContentImageLines(props) {
  const { images = [], title = '', sections = [], heroImage, imageTitle, tables = [], intro } = props;
  const { lang = 'fa' } = useLanguage() || {};

  const featuredImage = heroImage || (images && images.length > 0 && images[0]?.src) || '/assets/images/carousel/office-main.webp';
  const featuredAlt = (images && images.length > 0 && images[0]?.alt) || title || 'دکتر بابک ختایی';
  const galleryImages = images && images.length > 1 ? images.slice(1) : (images.length === 1 ? images : []);

  const badgeText = {
    fa: '✨ خدمات تخصصی دندانپزشکی دکتر بابک ختایی',
    en: '✨ Specialized Dental Care by Dr. Babak Khatayee',
    ru: '✨ Стоматология доктора Бабака Хатаи',
  }[lang] || '✨ Specialized Dental Care';

  const ctaConsult = {
    fa: 'درخواست مشاوره و رزرو وقت',
    en: 'Book Consultation',
    ru: 'Записаться на прием',
  }[lang] || 'Book Consultation';

  const defaultGalleryTitle = {
    fa: 'گالری تصاویر و نمونه درمان‌ها',
    en: 'Clinical Case Gallery',
    ru: 'Галерея результатов лечения',
  }[lang] || 'Clinical Gallery';

  return (
    <div className="bg-slate-50/50 min-h-screen">
      {/* Mobile-First Hero Section */}
      <section className="relative overflow-hidden pt-6 pb-8 sm:pt-10 sm:pb-12 md:pt-16 md:pb-16 bg-gradient-to-b from-slate-100/80 via-white to-slate-50/60 border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:grid lg:grid-cols-12 lg:gap-10 xl:gap-14 lg:items-center">
            
            <div className="lg:col-span-7 flex flex-col items-start text-start order-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 text-xs sm:text-sm font-medium mb-3 sm:mb-4 shadow-xs">
                <span>{badgeText}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-slate-950 tracking-tight leading-snug sm:leading-tight mb-3 sm:mb-4">
                {title}
              </h1>

              {/* On mobile, show hero image directly below title */}
              <div className="w-full my-4 sm:my-5 lg:hidden order-2">
                <div className="relative overflow-hidden rounded-2xl bg-slate-200 shadow-md border-2 border-white ring-1 ring-slate-200/80">
                  <img
                    src={featuredImage}
                    alt={featuredAlt}
                    className="w-full h-auto aspect-[16/10] sm:aspect-[4/3] object-cover"
                  />
                </div>
              </div>

              {intro ? (
                <p className="text-base sm:text-lg md:text-xl text-slate-600 leading-relaxed mb-6 max-w-2xl order-3">
                  {intro}
                </p>
              ) : null}

              <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mt-1 order-4">
                <a
                  href={`/${lang}/contact-us`}
                  className="inline-flex items-center justify-center min-h-[48px] px-6 py-3.5 rounded-xl font-bold text-white bg-slate-950 hover:bg-slate-800 shadow-md active:scale-[0.98] transition-all text-center text-sm sm:text-base"
                >
                  {ctaConsult}
                </a>
                <a
                  href="tel:+982122722876"
                  className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 py-3.5 rounded-xl font-bold text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs active:scale-[0.98] transition-all text-center text-sm sm:text-base"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span dir="ltr">021-22722876</span>
                </a>
              </div>
            </div>

            <div className="hidden lg:block lg:col-span-5 order-2">
              <div className="relative mx-auto w-full max-w-lg">
                <div className="relative overflow-hidden rounded-3xl bg-slate-200 shadow-xl shadow-slate-900/10 border-4 border-white ring-1 ring-slate-200/80">
                  <img
                    src={featuredImage}
                    alt={featuredAlt}
                    className="w-full h-auto aspect-[4/3] object-cover transition duration-700 hover:scale-105"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Sections List */}
      <section className="py-8 sm:py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            {sections.map((section, index) => (
              <ContentSection
                key={section.id || `section-${index}`}
                id={section.id || `section-${index}`}
                title={section.title}
                text={section.content}
                highlights={section.bold}
              />
            ))}
          </div>

          {tables.map((table, index) => (
            <div className="mt-6 sm:mt-8" key={`${table.title || 'table'}-${index}`}>
              <DataTable table={table} />
            </div>
          ))}
        </div>
      </section>

      {galleryImages.length > 0 ? (
        <ImageGrid title={imageTitle || defaultGalleryTitle} images={galleryImages} />
      ) : null}
    </div>
  );
}
