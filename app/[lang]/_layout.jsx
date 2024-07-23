import {  Slot } from 'expo-router';

// This file only created to Define the static parameters for static rendering of expo router
// lang is the same as the [lang] for dynamic route
export async function generateStaticParams() {
    return [
      { lang: 'en' },
      { lang: 'fa' },
      { lang: 'ru' }
    ];
  }

  // this is only added to have a base layout for all the childeren pages under this dir
  export default function Layout() {
    return <Slot />
  }
  