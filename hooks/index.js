// LanguageContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { getLanguageFromUrl } from "../utils";

const LanguageContext = createContext();

// Function to get the language from URL or fallback to local storage
const getInitialLanguage = () => {
    const storedLang = localStorage.getItem('lang');
    return storedLang || 'fa'; // default to 'fa' if no language is found
  };

export const LanguageProvider = ({ children }) => {
    const [lang, setLang] = useState(getInitialLanguage());

    useEffect(() => {
        // Get language from local storage
        const lang = getInitialLanguage()
        setLang(lang)
      }, [lang]);

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
