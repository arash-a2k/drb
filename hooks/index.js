// LanguageContext.js
import React, { createContext, useState, useContext } from 'react';
import { getLanguageFromUrl } from "../utils";

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const urlLang = getLanguageFromUrl()

    const [lang, setLang] = useState(urlLang);

    const changeLang = (lang) => {
        setLang(lang);
    };

    return (
        <LanguageContext.Provider value={{ lang, changeLang }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);
