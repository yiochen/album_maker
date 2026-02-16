import React, { useRef } from 'react';

interface TokenHighlightInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    id?: string;
}

/**
 * TokenHighlightInput provides a text input that highlights certain keywords (tokens).
 * It uses a "Transparent Overlay" approach where the natural input sits on top of a 
 * formatted background div.
 */
export const TokenHighlightInput: React.FC<TokenHighlightInputProps> = ({
    value,
    onChange,
    placeholder,
    id,
}) => {
    const backdropRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync scroll if needed (though input is usually single line)
    const handleScroll = () => {
        if (backdropRef.current && inputRef.current) {
            backdropRef.current.scrollLeft = inputRef.current.scrollLeft;
        }
    };

    // Replace {page} and {spread} with highlighted spans
    const getHighlightedText = (text: string) => {
        // Escape HTML to prevent XSS (since we use dangerouslySetInnerHTML for simplicity, 
        // though we could use React children mapping)
        const escaped = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        return escaped.replace(
            /(\{page\}|\{spread\})/g,
            '<span class="token-highlight">$1</span>'
        );
    };

    return (
        <div className="token-input-container">
            <div
                ref={backdropRef}
                className="token-input-backdrop"
                aria-hidden="true"
                dangerouslySetInnerHTML={{ __html: getHighlightedText(value) + '&nbsp;' }}
            />
            <input
                ref={inputRef}
                id={id}
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onScroll={handleScroll}
                placeholder={placeholder}
                className="token-input-field"
                autoComplete="off"
                spellCheck="false"
            />
        </div>
    );
};
