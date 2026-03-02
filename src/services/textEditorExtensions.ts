import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import { FontSize } from '../extensions/tiptapFontSize';

export function createTextEditorExtensions() {
    return [
        StarterKit.configure({
            heading: false,
            blockquote: false,
            codeBlock: false,
            code: false,
            bulletList: false,
            orderedList: false,
            listItem: false,
            horizontalRule: false,
        }),
        Underline,
        TextStyle,
        Color,
        FontFamily,
        FontSize,
    ];
}
