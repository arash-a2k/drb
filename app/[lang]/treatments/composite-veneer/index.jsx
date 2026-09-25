import React from 'react';
import { useLanguage } from '../../../../hooks'
import * as text from './composite-veneer.json'
import ContentWithImageGrid from '../../../../components/pageTemplates/ContentWithImageGrid'
import Seo from '../../../../components/seo/Seo'

export default function CompositVeneer() {
    const { lang } = useLanguage() || 'fa'
    const dir = lang === 'fa' ? 'rtl' : 'ltr'

    const { images, title, sections, tables } = text[lang] || text['en'] || { images: [], title: "", sections: "" }

    return <div dir={dir}>
        <Seo
            lang={lang}
            path="/treatments/composite-veneer"
            title={lang === 'fa' ? 'ونیر کامپوزیت مقدس اردبیلی و زعفرانیه | دکتر بابک ختایی' : title}
            description={lang === 'fa'
                ? 'اطلاعات ونیر کامپوزیت در مطب دکتر بابک ختایی نزدیک مقدس اردبیلی و زعفرانیه تهران؛ مراحل درمان، نمونه کارها و خدمات دندانپزشکی زیبایی.'
                : 'Composite veneer treatment at Dr. Babak Khatayee clinic in Zafaraniyeh, Tehran near Moghadas Ardebili, including treatment steps and smile makeover examples.'}
        />
        <ContentWithImageGrid images={images} title={title} sections={sections} tables={tables} />

    </div>

}
