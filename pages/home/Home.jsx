import React from 'react';

import { useLanguage } from '../../hooks'
import * as text from './home.json'
import Highlights from './Highlights';
import Teasers from './Teasers';
import ArticleSolo from '../../components/article-solo/ArticleSolo'

export default function Home() {
    
    const { lang } = useLanguage()
    const home = text[lang || 'fa']
    const dir = lang === 'fa' ? 'rtl' : 'ltr'
    const { highlightTitle, highlights, teasers, social } = home

    return (<div dir={dir}>
        <section className="pt-6 pb-10 bg-gray-50 overflow-hidden">

            {/** Leader Section */}

            <div className="container mx-auto px-4">
                <div className="px-8 md:w-full md:h-auto min-h-[450px] lg:min-h-[650px] overflow-hidden border border-gray-100 rounded-lg" style={{ backgroundImage: 'url("assets/images/carousel/office-main.webp")', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>

                </div>
            </div>

        </section>
        {/** Welcome Section */}
        <ArticleSolo title={home.name} subtitle={`👋 ${home.title}`} content={home.content} imageSrc="assets/images/home/drb.webp" />

        {/** Highlights Section */}
        <Highlights title={highlightTitle} highlights={highlights} />
        <Teasers teasers={teasers} />
    </div>
    )

}