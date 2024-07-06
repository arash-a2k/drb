import React, { useState } from 'react';
import { useLanguage  } from '../../hooks'
import * as text from './header.json'
import * as contactText from '../../translations/contact.json'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDropDown, setShowDropDown] = useState(false);

  const { lang, changeLang } = useLanguage()

  const navbar = text['navbar'][lang || 'fa']
  const contact = contactText[lang]


  const generateDropDown = () => {
    return (
      <div className="relative inline-block text-center">
        <div>
          <button onClick={() => setShowDropDown(!showDropDown)} type="button"
            className="inline-flex w-full justify-center gap-x-1.5 rounded-md p-4 border-transparent bg-transparent text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50" id="menu-button" aria-expanded="true" aria-haspopup="true">
            {navbar.dropdown?.title}
            <svg className="-mr-1 h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Dropdown menu, show/hide based on menu state.*/}
        {showDropDown &&
          <div className="absolute text-center right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none" role="menu" aria-orientation="vertical" aria-labelledby="menu-button" tabindex="-1">
            <div className="py-1" role="none">
              {navbar.dropdown?.items.map((item, index) =>
                <a href={item.link} key={`dropdown-${index}`} className="text-gray-700 block px-4 py-2 text-sm" role="menuitem" tabindex="-1" id="menu-item-0">{item.text}</a>

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
      <li className="mx-4 my-2 text-center self-center"><a className="inline-block text-sm font-bold text-gray-900 hover:text-gray-700" href="/">{navbar.home}</a></li>
      <li className="mx-4 my-2 text-center self-center"><a className="inline-block text-sm font-bold text-gray-900 hover:text-gray-700" href="/about-us">{navbar.about}</a></li>
      <li className="mx-4 my-2 text-center self-center"><a className="inline-block text-sm font-bold text-gray-900 hover:text-gray-700" href="/contact-us">{navbar.contact}</a></li>
      <li className='mx-4 my-2 text-center self-center'>
        {generateDropDown()}
      </li>
      <li className="mx-4 my-1 text-center self-center">
        {genarateLang()}
      </li>

    </ul>)
  }

  const genarateLang = () => {
    const altLang = lang === 'fa' ? 'en' : 'fa'
    return (
      <button onClick={() => changeLang(altLang)} className="px-0 py-0 w-[32px] h-[32px] border border-transparent rounded-md shadow-sm inline-flex items-center justify-center overflow-hidden">
        <img src={`/assets/${altLang}.png`} alt="en" className="w-full h-full object-cover" />
      </button>
    )
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

