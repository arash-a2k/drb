import React from 'react';
import { useLanguage } from '../../../../hooks'

import SoloImageContentImageLines from '../../../../components/pageTemplates/SoloImageContentImageLines'
import Seo from '../../../../components/seo/Seo'


import * as text from '../dental-implants/dental-laminates.json'

export default function DentalLaminates() {
    const { lang } = useLanguage() || 'fa'

    const { images, title, sections, heroImage, imageTitle, tables } = text[lang] || text['en'] || { images: [], title: "", sections: "" }
    const dir = lang === 'fa' ? 'rtl' : 'ltr'

    return <div dir={dir}>
        <Seo
            lang={lang}
            path="/treatments/dental-laminates"
            title={lang === 'fa' ? 'لمینت سرامیکی زعفرانیه و مقدس اردبیلی | دکتر بابک ختایی' : title}
            description={lang === 'fa'
                ? 'راهنمای لمینت سرامیکی و ونیر دندان در زعفرانیه تهران، نزدیک مقدس اردبیلی؛ تفاوت لمینت و کامپوزیت، قیمت، مراحل و نمونه درمان ها.'
                : 'Ceramic dental laminates and veneers at Dr. Babak Khatayee clinic in Zafaraniyeh, Tehran, including laminate cost, treatment steps, and veneer examples.'}
        />
        <SoloImageContentImageLines
            images={images}
            title={title}

            sections={sections}
            imageTitle={imageTitle}
            heroImage={heroImage}
            tables={tables}
        />
    </div>
}
