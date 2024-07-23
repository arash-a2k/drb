import React from 'react';
import { useLanguage } from '../../../hooks'
import * as text from './composite-veneer.json'
import ContentWithImageGrid from '../../../components/pageTemplates/ContentWithImageGrid'

export default function CompositVeneer() {
    const { lang } = useLanguage() || 'fa'
    const dir = lang === 'fa' ? 'rtl' : 'ltr'

    const { images, title, sections } = text[lang] || text['en'] || { images: [], title: "", sections: "" }

    return <div dir={dir}>
        <ContentWithImageGrid images={images} title={title} sections={sections} />

    </div>

}
