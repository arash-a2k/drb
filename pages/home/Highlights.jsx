import React from 'react';

export default function Highlights(props) {
  const { title, highlights } = props
  const [first, second, third, ...rest] = [...highlights]

  function genarateHighlight(header, content, imageSrc) {
    return (
      <div className="w-full md:w-1/3 p-4 min-h-[300px]">
        <div className="flex flex-col justify-around h-full px-8 pt-8 pb-16 text-center bg-green-300 border border-gray-300 rounded-3xl">
          <h3 className="my-8 text-black text-2xl font-bold font-heading tracking-px-n leading-none">{header}</h3>
          <img className="h-[250px] w-auto mb-4 self-center" src={imageSrc} alt={header} />
          <p className="text-base text-gray-700 min-h-[150px]">{content}</p>
        </div>
      </div>
    );
  }

  return (
    <React.Fragment>
      <>
        <section className="py-10 bg-gray-50 overflow-hidden">
          <div className="container mx-auto px-4">
            <div className="py-16 px-8 bg-white border border-gray-200 rounded-3xl">
              <div className="max-w-7xl mx-auto">
                <div className="max-w-lg mx-auto text-center">
                  <h3 className="mb-8 text-3xl md:text-4xl xl:text-5xl font-bold font-heading tracking-px-n leading-none text-center lg:text-start">{title}</h3>
                </div>
                <div className="flex flex-wrap -m-4 min-h-[520px]">
                  {first && genarateHighlight(first.header, first.content, first.image)}
                  {second && genarateHighlight(second.header, second.content, second.image)}
                  {third && genarateHighlight(third.header, third.content, third.image)}
                </div>
              </div>
            </div>
          </div>
        </section>


      </>
    </React.Fragment>
  );
}

