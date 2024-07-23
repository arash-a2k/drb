import React from 'react';

export const HighlightedText = ({ text, highlights }) => {
    const parts = text.split(new RegExp(`(${highlights.join('|')})`, 'g'));
    return parts.map((part, index) =>
        highlights.includes(part) ? <span key={index} className="font-bold">{part}</span> : part
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