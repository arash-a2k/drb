import React from 'react';

export default function Teasers(props) {
    const { teasers } = props
    const [first, second, third, ...rest] = [...teasers]

    const genarateTeaser = (header, content, imageSrc, labels = [], imageRight = false) => {

        const genarateImage = () => {
            const justify = imageRight ? "justify-end" : "justify-start"
            return <div className={`w-full md:w-1/2 md:justify-self-end flex ${justify} p-2`}>
            <img className="md:ml-0 rounded-3xl md:max-h-[290px] lg:max-w-[550px] lg:max-h-[450px]" src={imageSrc} alt={header} />
            </div>
        }

        return <section className="py-5 bg-gray-50 overflow-hidden">
            <div className="container mx-auto px-4">
                <div className="py-16 px-8 md:px-16 bg-white rounded-3xl">
                    <div className="flex flex-wrap -m-8 justify-around">
                        {/*if image should be on the left */}
                        {!imageRight && genarateImage()}
                        <div className="w-full md:w-1/2 p-8">
                            <div className="md:max-w-md">
                                <h2 className="font-heading mb-4 text-4xl text-gray-900 font-black tracking-tight"><span className="text-blue-500">{header}</span></h2>
                                <p className="mb-16 leading-relaxed">{content}</p>
                                <div className="flex flex-wrap -m-2">
                                    {labels.map(label => (
                                        <div className="w-auto p-2">
                                            <div className="flex flex-wrap px-3 py-2 bg-blue-400 rounded-full align-self">
                                                <div className="w-auto mx-2 pt-1 self-center">
                                                    <svg width={24} height={24} viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
                                                        <path fill="white" d="M8.095 1H3.905C2.085 1 1 2.085 1 3.905V8.09C1 9.915 2.085 11 3.905 11H8.09C9.91 11 10.995 9.915 10.995 8.095V3.905C11 2.085 9.915 1 8.095 1ZM8.39 4.85L5.555 7.685C5.485 7.755 5.39 7.795 5.29 7.795C5.19 7.795 5.095 7.755 5.025 7.685L3.61 6.27C3.465 6.125 3.465 5.885 3.61 5.74C3.755 5.595 3.995 5.595 4.14 5.74L5.29 6.89L7.86 4.32C8.005 4.175 8.245 4.175 8.39 4.32C8.535 4.465 8.535 4.7 8.39 4.85Z"  />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 self-center">
                                                    <p className="text-sm text-white font-bold">{label}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        {/*if image should be on the right */}

                        {imageRight && genarateImage()}

                    </div>
                </div>
            </div>
        </section>
    }

    return <div className='flex flex-col'>
        {genarateTeaser(first.header, first.content, first.image, first.labels)}
        {genarateTeaser(second.header, second.content, second.image, second.labels, true)}
        {genarateTeaser(third.header, third.content, third.image, third.labels)}

    </div>
}