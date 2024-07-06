import React from 'react';

import { ContentSection } from '../common'
import  ImageGrid  from '../imageGrid/ImageGrid'


export default function SoloImageContentImageLines(props) {

    const { images, title, sections, heroImage , imageTitle} = props

    return <>
        <section className="bg-gray-50 overflow-hidden py-12 px-4">
            <div className="container px-4 mx-auto">
            <div className="flex flex-wrap lg:items-center justify-center -m-8 lg:-m-14">
                <div className="w-full md:w-1/2 p-8 lg:p-14">
                    <div className="relative max-w-max mx-auto lg:ml-auto lg:mr-0 overflow-hidden rounded-4xl">
                        <img className="transform hover:scale-105 transition ease-in-out duration-1000" src={heroImage} alt="dentist-dr-khatayee" />
                    </div>
                </div>

                <h3 className="mb-8 text-4xl md:text-8xl xl:text-10xl font-bold font-heading tracking-px-n leading-none text-center self-center">
            {title}
        </h3>
        <div className="flex flex-col space-y-8 container mx-auto p-4">
        {/** Welcome Section */}
            {sections.map(section => (
                <ContentSection
                    key={section.id}
                    title={section.title}
                    text={section.content}
                    highlights={section.bold}
                />
            ))}
        </div>
                
            </div>
        </div>
        </section>

        <ImageGrid title={imageTitle} images={images} />
    </>

}