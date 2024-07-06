import React from 'react';
import { useLanguage  } from '../../hooks'

import ArticleSolo from '../../components/article-solo/ArticleSolo';
import Treatments from '../../components/treatments/Treatments';

import * as text from './about.json'

export default function About() {
    const { lang } = useLanguage() || 'fa'

    const about = text[lang]

    return <>
        <section className="pt-6 pb-10 bg-gray-50 overflow-hidden">
        {/** Welcome Section */}
        <ArticleSolo title={about.header1} content={about.content} imageSrc="assets/images/home/drb.webp" />
        </section>

        <Treatments />
        
    </>

}