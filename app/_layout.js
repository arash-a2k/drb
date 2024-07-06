import React from 'react';

import '../global.css';

import { Helmet, HelmetProvider } from 'react-helmet-async';
import { LanguageProvider } from '../hooks'
import Header from '../components/header/Header';
import Footer from '../components/footer/Footer'
import { Link, Slot, Tabs } from 'expo-router';

const meta = {
  title: '',
  meta: [],
  link: [],
  style: [],
  script: [],
};



export default function Layout() {
  return <LanguageProvider>
    <HelmetProvider>
      <Helmet {...meta}></Helmet>
      <Header />
      <Slot />
      <Footer />

    </HelmetProvider>
  </LanguageProvider>
}

