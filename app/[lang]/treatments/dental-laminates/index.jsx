import React from 'react';
import { useLanguage } from '../../../../hooks'

import SoloImageContentImageLines from '../../../../components/pageTemplates/SoloImageContentImageLines'


import * as text from './dental-implants.json'

export default function DentalLaminates() {
    const { lang } = useLanguage() || 'fa'

    const { images, title, sections, heroImage, imageTitle } = text[lang] || text['en'] || { images: [], title: "", sections: "" }
    const dir = lang === 'fa' ? 'rtl' : 'ltr'

    return <div dir={dir}>
        <SoloImageContentImageLines
            images={images}
            title={title}

            sections={sections}
            imageTitle={imageTitle}
            heroImage={heroImage}
        />
    </div>
}