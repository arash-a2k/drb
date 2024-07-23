import React, { useState } from 'react';
import { useLanguage  } from '../../hooks'
import * as text from './header.json'
import * as contactText from '../../translations/contact.json'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDropDown, setShowDropDown] = useState(false);

  const { lang, changeLang } = useLanguage()

  const navbar = text['navbar'][lang || 'fa'] || text['navbar']['en']
  const contact = contactText[lang] || contactText['en']

  const [langDropIsOpen, setLangDropIsOpen] = useState(false);

  const languages = [
    { code: 'fa', label: 'فارسی', flag: '/assets/fa.png' },
    { code: 'en', label: 'English', flag: '/assets/en.png' },
    { code: 'ru', label: 'Русский', flag: '/assets/ru.png' },
  ];

  const handleLangChange = (code) => {
    changeLang(code);
    setLangDropIsOpen(false);
  };

  const generateDropDown = () => {
    return (
      <div className="relative inline-block text-center rounded-md shadow-lg bg-white">
        <div>
          <button onClick={() => setShowDropDown(!showDropDown)} type="button"
            className="inline-flex w-full justify-center gap-x-1.5 rounded-md p-4 border-transparent bg-transparent text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50" id="menu-button" aria-expanded="true" aria-haspopup="true">
            {navbar.dropdown?.title}
            <svg className="mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Dropdown menu, show/hide based on menu state.*/}
        {showDropDown &&
          <div className="absolute text-center right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none" role="menu" aria-orientation="vertical" aria-labelledby="menu-button" tabindex="-1">
            <div className="py-1" role="none">
              {navbar.dropdown?.items.map((item, index) =>
                <a href={`/${lang}/${item.link}`} key={`dropdown-${index}`} className="text-gray-700 block px-4 py-2 text-sm" role="menuitem" tabindex="-1" id="menu-item-0">{item.text}</a>

              )}
            </div>
          </div>
        }

      </div>
    )
  }

  const genarateNavLinks = (isHamburger = false) => {
    const mobileClassNames = `menu ${isMenuOpen ? 'block lg:hidden' : 'hidden'}`
    const className = isHamburger ? mobileClassNames : 'flex items-center justify-center'
    return (<ul className={className}>
      <li className="mx-4 my-2 text-center self-center"><a className="inline-block text-sm font-bold text-gray-900 hover:text-gray-700" href={`/${lang}`}>{navbar.home}</a></li>
      <li className="mx-4 my-2 text-center self-center"><a className="inline-block text-sm font-bold text-gray-900 hover:text-gray-700"  href={`/${lang}/about-us`}>{navbar.about}</a></li>
      <li className="mx-4 my-2 text-center self-center"><a className="inline-block text-sm font-bold text-gray-900 hover:text-gray-700" href={`/${lang}/contact-us`}>{navbar.contact}</a></li>
      <li className='mx-4 my-2 text-center self-center'>
        {generateDropDown()}
      </li>
      <li className="mx-4 my-1 text-center self-center">
        {genarateLang()}
      </li>

    </ul>)
  }

  const genarateLang = () => {
    return (
      <div className="relative inline-block text-left">
        <div>
          <button
            onClick={() => setLangDropIsOpen(!langDropIsOpen)}
            className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <img src={`/assets/${lang}.png`} alt={lang} className="w-[24px] h-[24px] object-cover ml-2" />
            <svg className="mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
  
        {langDropIsOpen && (
          <div className="origin-top-right absolute right-0 mt-2 w-24 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
              {languages.map(({ code, label, flag }) => (
                <button
                  key={code}
                  onClick={() => handleLangChange(code)}
                  className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  role="menuitem"
                >
                  <img src={flag} alt={label} className="w-[24px] h-[24px] object-cover mr-3" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const genarateContact = () => {

        const telText = contact?.telephone.join(' - ')
    return (
      <div className="container mx-auto justify-center item-center text-gray-600 px-4 pt-0 lg-pt-8 mb-2 text-center">
        <div className="flex justify-center item-center">
          <h5 className="mb-2 mx-2 md:text-3xl text-2xl font-bold font-heading tracking-px-n leading-tight self-center">{contact?.title}</h5>
          <img src={`/assets/dr-khatayee.webp`} alt="logo" className="z-1 w-[125x] h-[120px] object-cover" />
        </div>

        <h6 className="mb-2 text-xl font-bold font-heading tracking-px-n leading-tight text-gray-500">{contact.address}</h6>
        <h6 className="mb-1 text-l font-heading leading-snug text-blue-500 font-bold">{telText}</h6>
      </div>
    )

  }

  return (
    <React.Fragment>
      {genarateContact()}
        <div className="container mx-auto px-0 lg-px-4 ">
          <div className="mb-6">
            <div className="flex flex-col px-6 py-3.5 bg-blue-400 border border-gray-100">
              <div className="flex items-center justify-center">


                {/*
                adding logo
                 <div className="w-auto">
                  <div className="flex flex-wrap items-center">
                    <div className="w-[32px] h-[32px]"><a href="#"><img src="assets/logo.png" alt="" /></a></div>
                  </div>
                </div> */}
                <div className="w-auto">
                  <div className="flex flex-wrap items-center">
                    <div className="w-auto hidden lg:block">
                      {genarateNavLinks()}
                    </div>
                  </div>
                </div>
                <div className="w-auto">
                  <div className="flex flex-wrap items-center">
                    <div className="w-auto hidden lg:block">
                      <div className="flex flex-wrap -m-2">
                        <div className="w-full md:w-auto p-2" />
                        <div className="w-full md:w-auto p-2" />
                      </div>
                    </div>
                    <div className="w-auto lg:hidden">
                      <a className="inline-block" href="#" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        <svg className="navbar-burger text-blue-500" width={45} height={45} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect width={56} height={56} rx={28} fill="currentColor" />
                          <path d="M37 32H19M37 24H19" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
              {/* Nav bar items for mobile */}
              {genarateNavLinks(true)}
            </div>

          </div>
        </div>
    </React.Fragment>
  );
}

