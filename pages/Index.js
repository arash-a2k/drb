import React from 'react';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import Home from '../components/home/Home';
import IndexSectionFootersLightReverse12 from '../components/footers-light-reverse/IndexSectionFootersLightReverse12';

const meta = {
  title: '',
  meta: [],
  link: [],
  style: [],
  script: [],
};

export default function Index() {
  return (
    <React.Fragment>
      <HelmetProvider>
        <Helmet {...meta}></Helmet>
      </HelmetProvider>
      <Home />
    </React.Fragment>
  );
}

