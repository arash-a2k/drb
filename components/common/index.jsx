import React from 'react';

export const HighlightedText = ({ text, highlights }) => {
    if (!text || !highlights?.length) {
        return text || null;
    }

    const orderedHighlights = [...highlights].sort((a, b) => b.length - a.length);
    const escapedHighlights = orderedHighlights.map((highlight) =>
        highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );
    const parts = text.split(new RegExp(`(${escapedHighlights.join('|')})`, 'g'));
    return parts.map((part, index) =>
        highlights.includes(part) ? <span key={index} className="font-black text-primary-ink">{part}</span> : part
    );
};

export const ContentSection = ({ title, text, highlights, id }) => {
    return (
        <article className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 md:p-8 shadow-xs hover:shadow-md transition-shadow duration-300 flex flex-col justify-start text-start" key={`${id}`}>
            <div className="flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-4">
                <span className="w-1.5 h-5 sm:h-6 rounded-full bg-gold inline-block shrink-0" aria-hidden="true" />
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 tracking-tight leading-snug">{title}</h2>
            </div>
            <p className="text-sm sm:text-base md:text-lg leading-relaxed sm:leading-loose text-slate-600">
                <HighlightedText text={text} highlights={highlights} />
            </p>
        </article>
    );
};

export const DataTable = ({ table }) => {
    if (!table?.columns?.length || !table?.rows?.length) {
        return null;
    }

    return (
        <section className="my-8 sm:my-10 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
            {table.title && (
                <div className="border-b border-slate-200/80 p-5 sm:p-6 bg-slate-50/60 text-start">
                    <div className="flex items-center gap-2.5 mb-1.5">
                        <span className="w-1.5 h-5 rounded-full bg-gold inline-block shrink-0" aria-hidden="true" />
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-950 tracking-tight">{table.title}</h2>
                    </div>
                    {table.description && (
                        <p className="text-sm leading-6 text-slate-600 mt-1">{table.description}</p>
                    )}
                </div>
            )}
            
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-start text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            {table.columns.map((column) => (
                                <th key={column.key} scope="col" className="whitespace-nowrap px-5 py-3.5 text-start font-bold text-slate-800">
                                    {column.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {table.rows.map((row, rowIndex) => (
                            <tr key={`${table.title || 'table'}-${rowIndex}`} className="hover:bg-slate-50/60 transition-colors">
                                {table.columns.map((column) => (
                                    <td key={column.key} className="px-5 py-4 align-top leading-relaxed text-slate-600">
                                        {row[column.key]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card-Based Comparison View */}
            <div className="md:hidden divide-y divide-slate-200/80 text-start">
                {table.rows.map((row, rowIndex) => {
                    const firstCol = table.columns[0];
                    const otherCols = table.columns.slice(1);
                    return (
                        <div key={`mobile-row-${rowIndex}`} className="p-4 sm:p-5 flex flex-col gap-2.5 bg-white">
                            {firstCol && (
                                <div className="text-base font-bold text-slate-950 pb-2 border-b border-slate-100 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-gold inline-block shrink-0" aria-hidden="true" />
                                    <span>{row[firstCol.key]}</span>
                                </div>
                            )}
                            <div className="space-y-2 pt-0.5">
                                {otherCols.map((column) => (
                                    <div key={`mobile-${rowIndex}-${column.key}`} className="flex justify-between items-start gap-4 text-xs sm:text-sm">
                                        <span className="font-medium text-slate-500 shrink-0">{column.label}:</span>
                                        <span className="font-semibold text-slate-800 text-end leading-snug">{row[column.key]}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

export const FaqAccordion = ({ faq = [], lang = 'fa', title, subtitle }) => {
    if (!faq || faq.length === 0) {
        return null;
    }

    const defaultTitle = {
        fa: 'پاسخ به سوالات متداول',
        en: 'Frequently Asked Questions',
        ru: 'Часто задаваемые вопросы',
    }[lang] || 'Frequently Asked Questions';

    const defaultSubtitle = {
        fa: 'پاسخ دندانپزشک به رایج‌ترین پرسش‌های مراجعین در مورد روند درمان، ماندگاری و مراقبت‌ها',
        en: 'Doctor answers to common patient questions regarding treatment steps, care, and durability',
        ru: 'Ответы врача на популярные вопросы о процедуре, уходе и долговечности',
    }[lang] || '';

    const headingTitle = title || defaultTitle;
    const headingSubtitle = subtitle || defaultSubtitle;

    return (
        <section className="py-8 sm:py-12 md:py-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-start mb-6 sm:mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 text-xs sm:text-sm font-medium mb-2.5 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 inline-block" aria-hidden="true" />
                        <span>FAQ</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight leading-snug">
                        {headingTitle}
                    </h2>
                    {headingSubtitle ? (
                        <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
                            {headingSubtitle}
                        </p>
                    ) : null}
                </div>

                <div className="space-y-3 sm:space-y-4">
                    {faq.map((item, index) => (
                        <details
                            key={`faq-${index}`}
                            className="group rounded-2xl border border-slate-200/80 bg-white shadow-xs hover:border-slate-300 transition-all duration-200 overflow-hidden"
                        >
                            <summary className="cursor-pointer list-none flex items-center justify-between gap-4 p-5 sm:p-6 select-none font-bold text-slate-900 text-base sm:text-lg text-start group-open:bg-slate-50/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <span className="w-7 h-7 rounded-lg bg-amber-100/70 text-amber-900 text-xs font-black flex items-center justify-center shrink-0">
                                        {index + 1}
                                    </span>
                                    <span className="leading-snug">{item.question}</span>
                                </div>
                                <span className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-amber-100 flex items-center justify-center shrink-0 text-slate-500 group-hover:text-amber-800 transition-all">
                                    <svg
                                        className="w-4 h-4 transition-transform duration-200 group-open:rotate-180"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </span>
                            </summary>
                            <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-2 text-slate-600 leading-relaxed sm:leading-loose text-sm sm:text-base border-t border-slate-100 text-start">
                                {item.answer}
                            </div>
                        </details>
                    ))}
                </div>
            </div>
        </section>
    );
};

export const TrustStrip = ({ lang = 'fa' }) => {
    const items = {
        fa: [
            {
                icon: (
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                ),
                title: 'بیش از ۱۵ سال سابقه',
                subtitle: 'تخصص زیبایی و ایمپلنت',
            },
            {
                icon: (
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                ),
                title: 'مطب مجهز در زعفرانیه',
                subtitle: 'خیابان مقدس اردبیلی، پلاک ۱۴',
            },
            {
                icon: (
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                ),
                title: 'متریال برتر سوئیسی و آلمانی',
                subtitle: 'برندهای معتبر و با ضمانت',
            },
            {
                icon: (
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                ),
                title: 'پرداخت مرحله‌ای و اقساطی',
                subtitle: 'تسهیلات ویژه درمان‌های جامع',
            },
        ],
        en: [
            {
                icon: (
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                ),
                title: '15+ Years Experience',
                subtitle: 'Cosmetics & Implant Dentistry',
            },
            {
                icon: (
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                ),
                title: 'Zafaraniyeh Clinic',
                subtitle: 'Moghadas Ardebili St., No. 14',
            },
            {
                icon: (
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                ),
                title: 'Swiss & German Materials',
                subtitle: 'Certified Premium Quality',
            },
            {
                icon: (
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                ),
                title: 'Installment Options',
                subtitle: 'Flexible Payment Plans',
            },
        ],
        ru: [
            {
                icon: (
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                ),
                title: 'Более 15 лет опыта',
                subtitle: 'Эстетика и имплантация',
            },
            {
                icon: (
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                ),
                title: 'Клиника в Зафарание',
                subtitle: 'Ул. Мокаддас Ардебили, 14',
            },
            {
                icon: (
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                ),
                title: 'Швейцарские материалы',
                subtitle: 'Премиум стандарты качества',
            },
            {
                icon: (
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                ),
                title: 'Поэтапная оплата',
                subtitle: 'Удобные планы лечения',
            },
        ],
    }[lang] || [];

    return (
        <div className="bg-white border-y border-slate-200/80 shadow-2xs">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                    {items.map((item, idx) => (
                        <div
                            key={`trust-${idx}`}
                            className="flex items-center gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50/70 border border-slate-200/60 text-start transition-all hover:bg-slate-50 hover:shadow-2xs"
                        >
                            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-50 border border-amber-200/70 flex items-center justify-center shrink-0 text-amber-800">
                                {item.icon}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-xs sm:text-sm font-bold text-slate-900 leading-snug truncate">
                                    {item.title}
                                </span>
                                <span className="text-[11px] sm:text-xs text-slate-500 leading-tight mt-0.5 truncate hidden sm:block">
                                    {item.subtitle}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

