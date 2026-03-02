import { Editor } from '@tiptap/core';
import type { TextContent, TextRun } from '../types';
import { textContentToTiptapDoc } from '../utils/tiptapSerializer';
import { buildTextRunsFromEditorDOM } from './textSnapshot';
import { createTextEditorExtensions } from './textEditorExtensions';

interface MeasureTextRunsOptions {
    content: TextContent;
    boxWidthPx: number;
    boxHeightPx: number;
}

const waitNextFrame = (): Promise<void> =>
    new Promise((resolve) => window.requestAnimationFrame(() => resolve()));

class TextLayoutMeasurementService {
    private containerEl: HTMLDivElement | null = null;
    private hostEl: HTMLDivElement | null = null;
    private editor: Editor | null = null;

    private ensureInitialized() {
        if (this.editor && this.containerEl && this.hostEl) return;

        const container = document.createElement('div');
        container.className = 'tiptap-text-editor-overlay';
        container.setAttribute('aria-hidden', 'true');
        container.setAttribute('tabindex', '-1');
        container.setAttribute('inert', '');
        container.style.position = 'fixed';
        container.style.left = '-100000px';
        container.style.top = '0';
        container.style.width = '1px';
        container.style.height = '1px';
        container.style.opacity = '0';
        container.style.pointerEvents = 'none';
        container.style.overflow = 'hidden';
        container.style.zIndex = '-1';

        const host = document.createElement('div');
        host.style.margin = '0';
        host.style.padding = '0';
        host.style.boxSizing = 'border-box';
        host.style.display = 'flex';
        host.style.flexDirection = 'column';
        host.style.justifyContent = 'flex-start';
        host.style.height = '100%';
        container.appendChild(host);
        document.body.appendChild(container);

        const editor = new Editor({
            extensions: createTextEditorExtensions(),
            content: '',
            editable: false,
            autofocus: false,
        });

        const editorEl = editor.view.dom as HTMLElement;
        editorEl.setAttribute('tabindex', '-1');
        editorEl.style.margin = '0';
        editorEl.style.padding = '0';
        host.appendChild(editorEl);

        this.containerEl = container;
        this.hostEl = host;
        this.editor = editor;
    }

    async measureRuns(options: MeasureTextRunsOptions): Promise<TextRun[]> {
        this.ensureInitialized();
        if (!this.editor || !this.hostEl) return options.content.runs;

        const doc = textContentToTiptapDoc(options.content);
        const verticalAlign = options.content.placeholderVerticalAlign ?? 'top';
        const justifyContent = verticalAlign === 'center'
            ? 'center'
            : verticalAlign === 'bottom'
                ? 'flex-end'
                : 'flex-start';

        this.hostEl.style.width = `${Math.max(1, Math.ceil(options.boxWidthPx))}px`;
        this.hostEl.style.height = `${Math.max(1, Math.ceil(options.boxHeightPx))}px`;
        this.hostEl.style.textAlign = options.content.textAlign;
        this.hostEl.style.fontFamily = options.content.defaultStyle.fontFamily;
        this.hostEl.style.fontSize = `${options.content.defaultStyle.fontSize}pt`;
        this.hostEl.style.fontWeight = options.content.defaultStyle.fontWeight;
        this.hostEl.style.fontStyle = options.content.defaultStyle.fontStyle;
        this.hostEl.style.color = options.content.defaultStyle.fill;
        this.hostEl.style.lineHeight = String(options.content.lineHeight);
        this.hostEl.style.justifyContent = justifyContent;

        const activeElementBefore = document.activeElement as HTMLElement | null;

        this.editor.commands.setContent(doc, { emitUpdate: false });

        // Wait for Tiptap + browser layout to fully settle before extracting.
        await waitNextFrame();
        await waitNextFrame();

        const editorEl = this.editor.view.dom as HTMLElement;
        const runs = buildTextRunsFromEditorDOM({
            editorEl,
            hostEl: this.hostEl,
            doc,
            defaultStyle: options.content.defaultStyle,
            canvasZoom: 100,
        });

        const activeElementAfter = document.activeElement as HTMLElement | null;
        if (activeElementBefore && activeElementAfter !== activeElementBefore) {
            activeElementBefore.focus();
        }

        return runs;
    }

    dispose() {
        if (this.editor) {
            this.editor.destroy();
            this.editor = null;
        }
        if (this.containerEl && this.containerEl.parentElement) {
            this.containerEl.parentElement.removeChild(this.containerEl);
        }
        this.containerEl = null;
        this.hostEl = null;
    }
}

let singleton: TextLayoutMeasurementService | null = null;

export function getTextLayoutMeasurementService(): TextLayoutMeasurementService {
    singleton ??= new TextLayoutMeasurementService();
    return singleton;
}
