#!/usr/bin/env node

import { generatePageDraft, type AiCompletionRequest, type AiModelClient } from './orchestrator.ts';

class MockModelClient implements AiModelClient {
  async completeJson(request: AiCompletionRequest): Promise<string> {
    if (request.task === 'classify-page-type') {
      return JSON.stringify({
        pageType: 'content-with-image-grid',
        navPlacement: 'treatments',
        reason: 'Dental service content with multiple images should use a treatment image-grid page.',
        confidence: 'high',
      });
    }

    if (request.task === 'seo-page-optimizer') {
      return [
        '```json',
        JSON.stringify({
          title: 'لمینت سرامیکی زعفرانیه',
          seoTitle: 'لمینت سرامیکی زعفرانیه | دکتر ختایی',
          seoDescription: 'لمینت سرامیکی در زعفرانیه برای اصلاح رنگ و فرم دندان با مشاوره تخصصی دکتر بابک ختایی.',
          intro: 'لمینت سرامیکی پوسته ای نازک برای اصلاح رنگ، فرم و هماهنگی لبخند است.',
          targetKeywords: ['لمینت سرامیکی زعفرانیه', 'لمینت سرامیکی مقدس اردبیلی'],
          sections: [
            {
              id: 'overview',
              title: 'لمینت سرامیکی چیست؟',
              content: 'لمینت سرامیکی زعفرانیه برای اصلاح رنگ، فرم و فاصله های خفیف دندان استفاده می شود.',
              bold: ['لمینت سرامیکی زعفرانیه'],
            },
          ],
          faq: [
            {
              question: 'طول عمر لمینت سرامیکی چقدر است؟',
              answer: 'طول عمر لمینت سرامیکی به کیفیت سرامیک، دقت چسباندن و مراقبت بیمار بستگی دارد.',
            },
          ],
          pricingNote: 'قیمت دقیق لمینت دندان ۱۴۰۵ به تعداد واحدها و نوع سرامیک بستگی دارد. برای قیمت روز با +9821227228768، +982126851277 یا +989039409045 تماس بگیرید.',
          pageTypeRecommendation: {
            pageType: 'content-with-image-grid',
            reason: 'The page has service copy and multiple treatment images.',
          },
          imageAltTextBrief: ['نمونه لمینت سرامیکی دندان در زعفرانیه'],
        }),
        '```',
      ].join('\n');
    }

    return JSON.stringify({
      fa: {
        title: 'لمینت سرامیکی زعفرانیه',
        seoTitle: 'لمینت سرامیکی زعفرانیه | دکتر ختایی',
        seoDescription: 'لمینت سرامیکی در زعفرانیه برای اصلاح رنگ و فرم دندان با مشاوره تخصصی دکتر بابک ختایی.',
        intro: 'لمینت سرامیکی پوسته ای نازک برای اصلاح رنگ، فرم و هماهنگی لبخند است.',
        sections: [
          {
            id: 'overview',
            title: 'لمینت سرامیکی چیست؟',
            content: 'لمینت سرامیکی زعفرانیه برای اصلاح رنگ، فرم و فاصله های خفیف دندان استفاده می شود.',
            bold: ['لمینت سرامیکی زعفرانیه'],
          },
          {
            id: 'pricing-guidance',
            title: 'راهنمای هزینه درمان',
            content: 'قیمت دقیق لمینت دندان ۱۴۰۵ به تعداد واحدها و نوع سرامیک بستگی دارد. برای قیمت روز با +9821227228768، +982126851277 یا +989039409045 تماس بگیرید.',
            bold: ['قیمت لمینت دندان ۱۴۰۵'],
          },
        ],
        faq: [
          {
            question: 'طول عمر لمینت سرامیکی چقدر است؟',
            answer: 'طول عمر لمینت سرامیکی به کیفیت سرامیک، دقت چسباندن و مراقبت بیمار بستگی دارد.',
          },
        ],
        tables: [],
      },
      en: {
        title: 'Ceramic Laminates in Zafaraniyeh',
        seoTitle: 'Ceramic Laminates in Zafaraniyeh',
        seoDescription: 'Ceramic laminates in Zafaraniyeh for improving tooth color and shape with Dr. Babak Khatayee.',
        intro: 'Ceramic laminates are thin shells used to improve tooth color, shape, and smile harmony.',
        sections: [
          {
            id: 'overview',
            title: 'What are ceramic laminates?',
            content: 'Ceramic laminates in Zafaraniyeh are used to improve tooth color, shape, and mild gaps.',
            bold: ['Ceramic laminates in Zafaraniyeh'],
          },
          {
            id: 'pricing-guidance',
            title: 'Treatment Cost Guidance',
            content: 'Exact 2026 laminate pricing depends on the number of units and ceramic type. For current pricing, call +9821227228768, +982126851277, or +989039409045.',
            bold: ['2026 laminate pricing'],
          },
        ],
        faq: [
          {
            question: 'How long do ceramic laminates last?',
            answer: 'Their lifespan depends on ceramic quality, bonding accuracy, and patient care.',
          },
        ],
        tables: [],
      },
      ru: {
        title: 'Керамические виниры в Заферание',
        seoTitle: 'Керамические виниры в Заферание',
        seoDescription: 'Керамические виниры в Заферание для коррекции цвета и формы зубов у доктора Бабака Хатаи.',
        intro: 'Керамические виниры - тонкие накладки для улучшения цвета, формы и гармонии улыбки.',
        sections: [
          {
            id: 'overview',
            title: 'Что такое керамические виниры?',
            content: 'Керамические виниры в Заферание применяются для улучшения цвета, формы и небольших промежутков между зубами.',
            bold: ['Керамические виниры в Заферание'],
          },
          {
            id: 'pricing-guidance',
            title: 'Информация о стоимости лечения',
            content: 'Точная стоимость виниров в 2026 году зависит от количества единиц и типа керамики. Для актуальной цены звоните +9821227228768, +982126851277 или +989039409045.',
            bold: ['стоимость виниров в 2026 году'],
          },
        ],
        faq: [
          {
            question: 'Сколько служат керамические виниры?',
            answer: 'Срок службы зависит от качества керамики, точности фиксации и ухода пациента.',
          },
        ],
        tables: [],
      },
      imageAlt: [
        {
          fa: 'نمونه لمینت سرامیکی دندان در زعفرانیه',
          en: 'Ceramic dental laminate example in Zafaraniyeh',
          ru: 'Пример керамических виниров в Заферание',
        },
      ],
    });
  }
}

async function main(): Promise<void> {
  const draft = await generatePageDraft(
    {
      slug: 'laminate-smoke-test',
      pageTitle: 'لمینت سرامیکی زعفرانیه',
      sourceLanguage: 'fa',
      sourceText: 'لمینت سرامیکی برای اصلاح رنگ و فرم دندان در زعفرانیه انجام می شود.',
      pageGoal: 'Create a treatment page for ceramic laminate patients.',
      images: [
        {
          src: '/assets/images/generated/laminate-smoke-test/hero.webp',
          altHint: 'نمونه لمینت سرامیکی دندان',
        },
      ],
    },
    new MockModelClient(),
  );

  console.log(`Generated valid draft: ${draft.slug}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
