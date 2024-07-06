import React from 'react';

/**
 * Displays images in rows of 3 columns with a title for page and alt for each image
 * @param {*} props 
 * @returns 
 */
export default function ImageGrid(props) {

    const { images, title } = props || { images: [], title: "" }

    const generateImageRow = (images) => {
        return (
          <div className="grid grid-cols-1 gap-x-6 gap-y-10 lg:grid-cols-3 xl:gap-x-8 mb-4 lg:mb-4">
            {images.map((image, index) => (
                <div  key={`${index}-img`} className="group mb-4 lg:mb-0 aspect-h-1 aspect-w-1 w-full overflow-hidden rounded-lg bg-gray-200 xl:aspect-h-8 xl:aspect-w-7 ">
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="h-full w-full object-cover object-center group-hover:opacity-75"
                  />
                </div>
               /* {
                TODO add text for each image to help with SEO
                <h3 className="mt-4 text-sm text-gray-700">{image.text}</h3>
                }*/
             
            ))}
          </div>
        );
      };

    const generateImages = (imgs) => {
        const rows = [];
        for (let i = 0; i < imgs.length; i += 3) {
            const rowImages = imgs.slice(i, i + 3);
            rows.push(generateImageRow(rowImages));
        }
        return <>{rows}</>;
    };

    return <div className="bg-white">
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24 lg:max-w-7xl lg:px-8">
          { title &&  <h3 className="mb-8 text-gold text-4xl md:text-8xl xl:text-10xl font-bold font-heading tracking-px-n leading-none text-center lg:text-start">
                {title}
            </h3>
            }
            {generateImages(images)}
        </div>
    </div>
}
