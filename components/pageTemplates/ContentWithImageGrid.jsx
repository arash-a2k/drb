import React from 'react';
import ImageGrid from '../imageGrid/ImageGrid'
import { ContentSection, DataTable } from '../common'

export default function ContentWithImageGrid(props) {

    const { images, title, sections, tables = [] } = props

    return <>
        <h3 className="mb-8 self-center text-4xl md:text-8xl xl:text-10xl font-bold font-heading tracking-px-n leading-none text-center self-center">
            {title}
        </h3>
        <div className="flex flex-col space-y-6 container mx-auto p-4">
        {/** Welcome Section */}
            {sections.map((section, index) => (
                <ContentSection
                    id={section.id || `section-${index}`}
                    title={section.title}
                    text={section.content}
                    highlights={section.bold}
                />
            ))}
        </div>

        {tables.map((table, index) => (
            <div className="container mx-auto px-4" key={`${table.title || 'table'}-${index}`}>
                <DataTable table={table} />
            </div>
        ))}

        <ImageGrid images={images} />
    </>

}
