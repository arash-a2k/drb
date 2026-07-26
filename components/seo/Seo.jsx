import React from 'react';
import { Helmet } from 'react-helmet-async';

const siteUrl = 'https://dr-khatayee.com';

const clinicSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'MedicalClinic',
      '@id': `${siteUrl}/#clinic`,
      name: 'Dentistry Clinic Dr. Babak Khatayee',
      alternateName: 'مطب دکتر بابک ختایی',
      url: siteUrl,
      logo: `${siteUrl}/assets/images/logo.png`,
      image: `${siteUrl}/assets/images/carousel/office-main.webp`,
      telephone: ['+982122728768', '+982126851277', '+989039409045'],
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'No. 14, Moghadas Ardebili Street, Zafaraniyeh',
        addressLocality: 'Tehran',
        addressCountry: 'IR',
      },
      medicalSpecialty: ['Dentistry', 'CosmeticDentistry', 'DentalImplant'],
      founder: {
        '@id': `${siteUrl}/#dr-babak-khatayee`,
      },
    },
    {
      '@type': 'Person',
      '@id': `${siteUrl}/#dr-babak-khatayee`,
      name: 'Dr. Babak Khatayee',
      alternateName: 'دکتر بابک ختایی',
      jobTitle: 'Dentist',
      worksFor: {
        '@id': `${siteUrl}/#clinic`,
      },
      identifier: {
        '@type': 'PropertyValue',
        propertyID: 'Iran Medical Council Number',
        value: '133476',
      },
    },
  ],
};

export default function Seo({ lang = 'fa', title, description, path = '', image = '/assets/images/carousel/office-main.webp' }) {
  const canonical = `${siteUrl}/${lang}${path}`;
  const dir = lang === 'fa' ? 'rtl' : 'ltr';

  return (
    <Helmet htmlAttributes={{ lang, dir }}>
      {title && <title>{title}</title>}
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={canonical} />
      <meta property="og:type" content="website" />
      {title && <meta property="og:title" content={title} />}
      {description && <meta property="og:description" content={description} />}
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={`${siteUrl}${image}`} />
      <script type="application/ld+json">{JSON.stringify(clinicSchema)}</script>
    </Helmet>
  );
}
