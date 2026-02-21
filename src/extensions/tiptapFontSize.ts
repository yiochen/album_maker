/**
 * Custom Tiptap FontSize extension.
 *
 * Built on top of @tiptap/extension-text-style to add `font-size` support.
 * Stores font size as a CSS string (e.g. "14pt") on inline `<span>` marks.
 */
import { Extension } from '@tiptap/core';
import '@tiptap/extension-text-style';

/** Module augmentation to add fontSize commands to Tiptap's type system. */
declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        fontSize: {
            setFontSize: (size: string) => ReturnType;
            unsetFontSize: () => ReturnType;
        };
    }
}

export const FontSize = Extension.create({
    name: 'fontSize',

    addOptions() {
        return {
            types: ['textStyle'],
        };
    },

    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    fontSize: {
                        default: null,
                        parseHTML: (element: HTMLElement) =>
                            element.style.fontSize?.replace(/['"]+/g, '') || null,
                        renderHTML: (attributes: Record<string, string | null>) => {
                            if (!attributes.fontSize) return {};
                            return { style: `font-size: ${attributes.fontSize}` };
                        },
                    },
                },
            },
        ];
    },

    addCommands() {
        return {
            setFontSize:
                (fontSize: string) =>
                    ({ chain }) =>
                        chain().setMark('textStyle', { fontSize }).run(),
            unsetFontSize:
                () =>
                    ({ chain }) =>
                        chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
        };
    },
});
