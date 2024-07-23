import React from 'react';
import { Redirect } from 'expo-router';

// This only redirects to the fa language as main language
export default function IndexPage() {
  return <Redirect href="/fa/about-us" />;
  }