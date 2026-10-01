import React from 'react';
import { useLanguage } from '../../../../hooks';
import Seo from '../../../../components/seo/Seo';
import ContentWithImageGridTemplate from '../../../../components/pageTemplates/ContentWithImageGrid';
import * as text from './dental-laminates-2.json';

export default function ContentWithImageGridPage() {
  const { lang = 'fa' } = useLanguage() || {};
  const content = text[lang] || text.en;
  const dir = lang === 'fa' ? 'rtl' : 'ltr';

  return (
    <div dir={dir}>
      <Seo
        lang={lang}
        path="/treatments/dental-laminates-2"
        title={content.seoTitle}
        description={content.seoDescription}
        image={content.heroImage}
        faq={content.faq}
      />
      <ContentWithImageGridTemplate
        images={content.images}
        title={content.title}
        sections={content.sections}
        imageTitle={content.imageTitle}
        heroImage={content.heroImage}
        intro={content.intro}
        tables={content.tables}
        faq={content.faq}
      />
    </div>
  );
}
