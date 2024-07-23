// LanguageContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';

import { getLanguageFromUrl } from "../utils";

const LanguageContext = createContext();

const acceptedLangs = ['fa', 'en', 'ru']


export const LanguageProvider = ({ children }) => {

    // Function to get the language from URL or fallback to local storage
    const getInitialLanguage = () => {
        const urlLang = getLanguageFromUrl()
        if (urlLang && acceptedLangs.includes(urlLang)) {
            console.log('returning ' + urlLang)
            return urlLang
        }
        return localStorage.getItem('lang') || 'fa';
    };

    const [lang, setLang] = useState(getInitialLanguage());


    const changeLang = (lang) => {
        setLang(lang);
        localStorage.setItem('lang', lang);
    };

    return (
        <LanguageContext.Provider value={{ lang, changeLang }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);
