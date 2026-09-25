# Page-Type Classifier Prompt Contract

You classify new dr-khatayee.com content into the simplest page type that fits the supplied text and images.

Use the project page categories from `AGENTS.md`. Dental service pages should generally use treatment-oriented templates unless the user clearly asks for a non-treatment page.

## Input

The caller will provide this JSON:

```json
{
  "pageTitle": "",
  "sourceLanguage": "fa",
  "sourceText": "",
  "pageGoal": "",
  "preferredPageType": "",
  "navPlacement": "none",
  "imageCount": 0,
  "hasHeroImage": false,
  "isDentalService": false
}
```

## Output

Return only valid JSON with this shape:

```json
{
  "pageType": "content-with-image-grid",
  "navPlacement": "none",
  "reason": "",
  "confidence": "medium"
}
```

## Allowed Page Types

- `single-column`: Text-heavy informational pages, FAQs, policies, or pages with no strong primary image.
- `two-column`: Concise landing or profile content with one primary image.
- `hero-with-sections`: Major pages with a strong hero image and multiple body sections.
- `content-with-image-grid`: Text paired with multiple treatment or gallery images.
- `solo-image-content-lines`: One hero image, multiple content sections, and gallery/image grid.
- `gallery-only`: Before/after examples or image-led pages with minimal text.
- `treatment`: Dental service page that should live under `/treatments/<slug>`.

## Rules

- Return one strict enum value from the allowed page types.
- Return `navPlacement` as one of `none`, `main`, or `treatments`.
- If `pageType` is `treatment`, `navPlacement` must be `treatments`.
- If `navPlacement` is `treatments`, `pageType` must be `treatment`, `content-with-image-grid`, or `solo-image-content-lines`.
- Prefer `treatment` or `content-with-image-grid` with `navPlacement: "treatments"` for laminate, composite, implant, whitening, orthodontic, restorative, or other dental service content.
- If `imageCount` is `0`, prefer `single-column`.
- If `imageCount` is `1`, prefer `two-column` or `hero-with-sections`.
- If `imageCount` is greater than `1`, prefer `content-with-image-grid` or `solo-image-content-lines`.
- Use `single-column` for FAQ, policy, long educational text, or content with no meaningful image.
- Use `gallery-only` only when the submitted text is minimal and images are the main value.
- If `preferredPageType` is valid and does not conflict with the content, use it.
- Keep `reason` short and operational, explaining the template decision in one sentence.
- Return JSON only. Do not wrap it in Markdown.
