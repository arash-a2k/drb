import React from 'react';

export const HighlightedText = ({ text, highlights }) => {
    if (!text || !highlights?.length) {
        return text || null;
    }

    const orderedHighlights = [...highlights].sort((a, b) => b.length - a.length);
    const escapedHighlights = orderedHighlights.map((highlight) =>
        highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );
    const parts = text.split(new RegExp(`(${escapedHighlights.join('|')})`, 'g'));
    return parts.map((part, index) =>
        highlights.includes(part) ? <span key={index} className="font-black text-primary-ink">{part}</span> : part
    );
};

export const ContentSection = ({ title, text, highlights, id }) => {
    return <div className="my-6 text-center" key={`${id}`}>
        <h2 className="text-2xl font-bold mb-4 text-gold" >{title}</h2>
        <p className="text-lg text-gray-600">
            <HighlightedText text={text} highlights={highlights} />
        </p>
    </div>
};

export const DataTable = ({ table }) => {
    if (!table?.columns?.length || !table?.rows?.length) {
        return null;
    }

    return (
        <section className="my-10 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            {table.title && (
                <div className="border-b border-slate-200 p-5">
                    <h2 className="text-2xl font-black text-slate-950">{table.title}</h2>
                    {table.description && (
                        <p className="mt-2 text-sm leading-7 text-slate-600">{table.description}</p>
                    )}
                </div>
            )}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-start text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            {table.columns.map((column) => (
                                <th key={column.key} scope="col" className="whitespace-nowrap px-4 py-3 text-start font-black text-slate-700">
                                    {column.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {table.rows.map((row, rowIndex) => (
                            <tr key={`${table.title || 'table'}-${rowIndex}`}>
                                {table.columns.map((column) => (
                                    <td key={column.key} className="px-4 py-4 align-top leading-7 text-slate-600">
                                        {row[column.key]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
};
