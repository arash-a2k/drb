import React from 'react';
import { useLanguage } from '../../../../hooks'

import SoloImageContentImageLines from '../../../../components/pageTemplates/SoloImageContentImageLines'
import Seo from '../../../../components/seo/Seo'


import * as text from '../dental-laminates/dental-implants.json'

export default function DentalImplants() {
    const { lang } = useLanguage() || 'fa'

    const { images, title, sections, heroImage, imageTitle, tables } = text[lang] || text['en'] || { images: [], title: "", sections: "" }
    const dir = lang === 'fa' ? 'rtl' : 'ltr'

    return <div dir={dir}>
        <Seo
            lang={lang}
            path="/treatments/dental-implants"
            title={lang === 'fa' ? 'ایمپلنت دندان قسطی تهران | دکتر بابک ختایی زعفرانیه' : title}
            description={lang === 'fa'
                ? 'اطلاعات ایمپلنت دندان در تهران، شرایط پرداخت قسطی، مراحل جراحی، ایمپلنت بدون درد و نمونه درمان های مطب دکتر بابک ختایی در زعفرانیه.'
                : 'Dental implant treatment in Tehran at Dr. Babak Khatayee clinic, including implant steps, pain-free implant information, payment timing, and treatment examples.'}
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
