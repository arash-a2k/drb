import React, { useState } from 'react';
import { useLanguage } from '../../hooks';
import * as text from './header.json';
import * as contactText from '../../translations/contact.json';

const languages = [
  { code: 'fa', label: 'فارسی', flag: '/assets/fa.png' },
  { code: 'en', label: 'English', flag: '/assets/en.png' },
  { code: 'ru', label: 'Русский', flag: '/assets/ru.png' },
];

function Icon({ children }) {
  return (
    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        {children}
      </svg>
    </span>
  );
}

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDropDown, setShowDropDown] = useState(false);
  const [langDropIsOpen, setLangDropIsOpen] = useState(false);

  const { lang = 'fa', changeLang } = useLanguage() || {};
  const navbar = text.navbar[lang] || text.navbar.en;
  const contact = contactText[lang] || contactText.en;
  const activeLang = languages.find((item) => item.code === lang) || languages[0];
  const telText = contact?.telephone?.join('  |  ');
  const dir = lang === 'fa' ? 'rtl' : 'ltr';

  const localizedHref = (path = '') => `/${lang}${path}`;

  const handleLangChange = (code) => {
    changeLang(code);
    setLangDropIsOpen(false);
    setIsMenuOpen(false);

    if (typeof window !== 'undefined') {
      const parts = window.location.pathname.split('/').filter(Boolean);
      if (languages.some((item) => item.code === parts[0])) {
        parts[0] = code;
      } else {
        parts.unshift(code);
      }
      window.location.href = `/${parts.join('/')}${window.location.search}`;
    }
  };

  const navLinks = [
    { label: navbar.home, href: localizedHref() },
    { label: navbar.about, href: localizedHref('/about-us') },
    { label: navbar.faq, href: localizedHref('/faq') },
    { label: navbar.contact, href: localizedHref('/contact-us') },
  ];

  const TreatmentDropdown = ({ mobile = false }) => (
    <div className="relative">
      <button
        onClick={() => setShowDropDown(!showDropDown)}
        type="button"
        className={`inline-flex items-center justify-center gap-2 rounded-md text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 ${
          mobile ? 'w-full px-4 py-3' : 'px-3 py-2'
        }`}
        aria-expanded={showDropDown}
        aria-haspopup="true"
      >
        {navbar.dropdown?.title}
        <svg className={`h-4 w-4 transition ${showDropDown ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {showDropDown && (
        <div className={`${mobile ? 'mt-2 w-full' : 'absolute right-0 z-20 mt-3 w-64'} overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl shadow-slate-900/10`}>
          {navbar.dropdown?.items.map((item, index) => (
            <a
              href={`/${lang}/${item.link}`}
              key={`dropdown-${index}`}
              className="block px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-primary-soft hover:text-primary-ink"
            >
              {item.text}
            </a>
          ))}
        </div>
      )}
    </div>
  );

  const LanguageMenu = () => (
    <div className="relative">
      <button
        onClick={() => setLangDropIsOpen(!langDropIsOpen)}
        className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        aria-label="Change language"
        aria-expanded={langDropIsOpen}
      >
        <img src={activeLang.flag} alt={activeLang.label} className="h-5 w-5 rounded-full object-cover" />
        <span className="hidden sm:inline">{activeLang.code.toUpperCase()}</span>
        <svg className={`h-4 w-4 transition ${langDropIsOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {langDropIsOpen && (
        <div className="absolute right-0 z-30 mt-3 w-40 overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
          {languages.map(({ code, label, flag }) => (
            <button
              key={code}
              onClick={() => handleLangChange(code)}
              className="flex w-full items-center gap-3 px-4 py-3 text-start text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <img src={flag} alt="" className="h-5 w-5 rounded-full object-cover" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const DesktopNav = () => (
    <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
      {navLinks.map((item) => (
        <a key={item.href} href={item.href} className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950">
          {item.label}
        </a>
      ))}
      <TreatmentDropdown />
    </nav>
  );

  const MobileNav = () => (
    <div className={`${isMenuOpen ? 'block' : 'hidden'} border-t border-slate-200 bg-white lg:hidden`}>
      <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4">
        {navLinks.map((item) => (
          <a key={item.href} href={item.href} className="rounded-md px-4 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-100">
            {item.label}
          </a>
        ))}
        <TreatmentDropdown mobile />
      </div>
    </div>
  );

  return (
    <header dir={dir} className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 shadow-sm shadow-slate-900/5 backdrop-blur">
      <div className="hidden border-b border-slate-100 bg-slate-50/90 lg:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-2 text-sm text-slate-600">
          <div className="flex min-w-0 items-center gap-3">
            <Icon>
              <path d="M12 21s7-4.4 7-11a7 7 0 10-14 0c0 6.6 7 11 7 11z" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 10.5h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </Icon>
            <span className="truncate">{contact.address}</span>
          </div>
          <div className="flex items-center gap-3">
            <span dir="ltr" className="font-semibold text-slate-800">{telText}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <a href={`/${lang}`} className="flex min-w-0 items-center gap-3">
          <img src="/assets/images/logo.png" alt={navbar.title} className="h-12 w-12 shrink-0 rounded-md object-contain" />
          <div className="min-w-0">
            <p className="truncate text-base font-black text-slate-950 sm:text-lg">{navbar.title}</p>
            <p className="truncate text-xs font-semibold text-primary">{navbar.subtitle}</p>
          </div>
        </a>

        <DesktopNav />

        <div className="flex items-center gap-2">
          <a href={`tel:${contact.telephone?.[0]}`} className="hidden rounded-md bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary-strong sm:inline-flex">
            {navbar.cta}
          </a>
          <LanguageMenu />
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-slate-950 text-white lg:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle navigation"
            aria-expanded={isMenuOpen}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              {isMenuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              ) : (
                <path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>
      <MobileNav />
    </header>
  );
}
