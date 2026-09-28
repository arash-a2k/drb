export const DENTAL_SLUG_MAP: Array<{ keywords: string[]; slug: string }> = [
  { keywords: ['کامپوزیت ونیر', 'ونیر کامپوزیت', 'کامپوزیت دندان', 'کامپوزیت', 'композитные виниры', 'композит'], slug: 'composite-veneers' },
  { keywords: ['لمینت سرامیکی', 'لمینت دندان', 'ونیر سرامیکی', 'لمینت', 'керамические виниры', 'виниры', 'laminate'], slug: 'dental-laminates' },
  { keywords: ['ایمپلنت دیجیتال', 'دیجیتال ایمپلنت', 'digital implant'], slug: 'digital-dental-implants' },
  { keywords: ['ایمپلنت فوری', 'immediate implant'], slug: 'immediate-dental-implants' },
  { keywords: ['ایمپلنت دندان', 'کاشت دندان', 'ایمپلنت', 'имплантация', 'имплант', 'dental implant'], slug: 'dental-implants' },
  { keywords: ['بلیچینگ دندان', 'سفید کردن دندان', 'بلیچینگ', 'отбеливание зубов', 'отбеливание', 'teeth whitening', 'bleaching'], slug: 'teeth-whitening' },
  { keywords: ['جرم گیری دندان', 'بروساژ دندان', 'جرم گیری', 'جرمگیری', 'بروساژ', 'чистка зубов', 'teeth cleaning'], slug: 'teeth-cleaning' },
  { keywords: ['عصب کشی', 'درمان ریشه', 'عصبکشی', 'эндодонтия', 'root canal'], slug: 'root-canal-treatment' },
  { keywords: ['ارتودنسی نامرئی', 'اینویزیلاین', 'اینویزالاین'], slug: 'invisible-orthodontics' },
  { keywords: ['ارتودنسی', 'ارتودونسی', 'ортодонтия', 'orthodontics'], slug: 'orthodontics' },
  { keywords: ['روکش زیرکونیا', 'روکش سرامیکی', 'روکش دندان', 'روکش', 'коронки', 'dental crown'], slug: 'dental-crowns' },
  { keywords: ['طراحی لبخند', 'اصلاح طرح لبخند', 'لبخند هالیوودی', 'дизайн улыбки', 'smile design', 'smile makeover'], slug: 'smile-makeover' },
  { keywords: ['جراحی لثه', 'لیفت لثه', 'پریودنتال', 'лечение десен', 'gum surgery', 'periodontal'], slug: 'gum-treatment' },
  { keywords: ['دندانپزشکی اطفال', 'دندانپزشکی کودکان', 'детская стоматология', 'pediatric'], slug: 'pediatric-dentistry' },
  { keywords: ['پروتز دندان', 'دندان مصنوعی', 'протезирование', 'dentures'], slug: 'dental-prosthetics' },
  { keywords: ['دندانپزشکی دیجیتال', 'digital dentistry'], slug: 'digital-dentistry' },
  { keywords: ['دندان عقل', 'جراحی دندان عقل', 'wisdom tooth'], slug: 'wisdom-tooth-extraction' },
  { keywords: ['دندانپزشکی زیبایی', 'زیبایی دندان', 'эстетическая стоматология', 'cosmetic dentistry'], slug: 'cosmetic-dentistry' },
];

export function generateSeoSlug(title: string, text = ''): string {
  const normalizedTitle = (title || '').toLowerCase();
  const normalizedText = (text || '').toLowerCase();

  for (const entry of DENTAL_SLUG_MAP) {
    if (entry.keywords.some((kw) => normalizedTitle.includes(kw.toLowerCase()))) {
      return entry.slug;
    }
  }

  const asciiMatch = normalizedTitle.match(/[a-z0-9]+/g);
  if (asciiMatch && asciiMatch.length > 0) {
    const candidate = asciiMatch.join('-');
    if (candidate.length >= 3 && !/^page-\d+$/.test(candidate)) {
      return candidate;
    }
  }

  for (const entry of DENTAL_SLUG_MAP) {
    if (entry.keywords.some((kw) => normalizedText.includes(kw.toLowerCase()))) {
      return entry.slug;
    }
  }

  return `treatment-${Date.now().toString(36)}`;
}
