import React, { useState } from 'react';
import { useLanguage } from '../../hooks'

import * as text from './footer.json'

export default function Footer() {
    const { lang } = useLanguage() || { lang: 'fa' }

    const footer = text[lang]
    const { quote, blocks, social } = footer


    return <div>
               {/* Insta Banner */}
     <section className="py-10 bg-gray-50 overflow-hidden">
            <div className="container mx-auto px-4 flex">
                    <div className="flex flex-wrap items-center p-8 md:w-full bg-gradient-pink rounded-3xl">
                        <div className="w-full">
                            <h2 className="font-heading text-4xl md:text-4xl text-white font-black tracking-tight text-center">{social.text}</h2>
                        </div>
                        <div className="w-full mt-2 md:mt-0 md:px-2">
                            <div className="flex flex-wrap justify-center align-center">
                                <div className="w-auto p-2">
                                    <a className="block w-full text-lg text-center text-white font-bold bg-transparent focus:ring-4 hover:text-gray-800 focus:ring-gray-600 self-center" href={social.link}>
                                        <span class="[&>svg]:h-16 [&>svg]:w-16 ">
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="#ddc69b"
                                                viewBox="0 0 448 512">
                                                <path
                                                    d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z" />
                                            </svg>
                                        </span>
                                    </a>
                                </div>
                                <a href={social.link} dir='ltr' className="text-gold font-bold text-center self-center">{social.id}</a>

                            </div>
                        </div>
                    </div>
            </div>
    </section>
    {/** Footer */}
    <section className="py-10 bg-gray-50 overflow-hidden">
        <div className="container mx-auto px-4">
            <div className="py-16 px-8 bg-blue-500 rounded-3xl">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-wrap -m-8 mb-8">
                        <div className="w-full md:w-1/3 p-8 flex items-center justify-center flex-col">
                            <img className="mb-2 w-[64px] h-[64px]"  src="/assets/images/logo.png" alt="" />
                            <p className="text-xl text-gold font-bold text-center">{quote}</p>
                        </div>
                        <div className="w-full md:w-2/3 p-4">
                            <ul className="md:max-w-max ml-auto">
                                {blocks.map((block, index) => (
                                    <li className="mb-6" key={`block-${index}`}>
                                        <div className='flex flex-col items-center lg:flex-row lg:items-start'>
                                            <span className="inline-block text-2xl text-white font-black mx-4 mb-2">{block.title}</span>
                                            <span className="inline-block text-xl text-gray-700 font-black text-center lg:text-start">{block.descr}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
     
    </div>
}