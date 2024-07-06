import React from 'react';

export default function ArticleSolo (props) {
    const { subtitle, title, content, imageSrc } = props
    
    return  <section className="bg-gray-50 overflow-hidden py-12"><div className="container px-4 mx-auto">
    <div className="flex flex-wrap lg:items-center justify-center -m-8 lg:-m-14">
        <div className="w-full md:w-1/2 p-8 lg:p-14">
            <div className="relative max-w-max mx-auto lg:ml-auto lg:mr-0 overflow-hidden rounded-4xl">
                <img className="transform hover:scale-105 transition ease-in-out duration-1000" src={imageSrc} alt="dentist-dr-khatayee" />
            </div>
        </div>

        <div className="w-full md:w-1/2 p-8 lg:p-14">
            <div className="md:max-w-2xl">
            {subtitle && <p className="mb-8 font-sans text-md text-indigo-400 font-semibold uppercase tracking-px text-center ">{subtitle}</p> }
                <h2 className="mb-8 text-6xl md:text-8xl xl:text-10xl font-bold font-heading tracking-px-n leading-none text-center">{title}</h2>
                <p className="leading-relaxed text-lg text-gray-700">{content}</p>
            </div>
        </div>
    </div>
</div>
</section>
}
