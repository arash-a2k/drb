import React from 'react';
import { useLanguage  } from '../../hooks'
import ImageGrid from '../imageGrid/ImageGrid'
import * as treatments from './treatments.json'

export default function Treatments() {
    const { lang } = useLanguage() || 'fa'

    const { images, title } = treatments[lang] || treatments['en'] || { images: [], title: "" }

    return <ImageGrid title={title} images={images}/>
}
