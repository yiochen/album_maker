import { create } from 'zustand';
import type * as fabric from 'fabric';
import type { Editor } from '@tiptap/react';

interface EditorInfraState {
  fabricCanvas: fabric.Canvas | null;
  tiptapEditor: Editor | null;
  setFabricCanvas: (canvas: fabric.Canvas | null) => void;
  clearFabricCanvasIfMatch: (canvas: fabric.Canvas) => void;
  setTiptapEditor: (editor: Editor | null) => void;
  clearTiptapEditorIfMatch: (editor: Editor) => void;
}

export const useEditorInfraStore = create<EditorInfraState>((set) => ({
  fabricCanvas: null,
  tiptapEditor: null,

  setFabricCanvas: (canvas) => set({ fabricCanvas: canvas }),
  clearFabricCanvasIfMatch: (canvas) =>
    set((state) => (state.fabricCanvas === canvas ? { fabricCanvas: null } : {})),

  setTiptapEditor: (editor) => set({ tiptapEditor: editor }),
  clearTiptapEditorIfMatch: (editor) =>
    set((state) => (state.tiptapEditor === editor ? { tiptapEditor: null } : {})),
}));

export const useFabricCanvas = () => useEditorInfraStore((state) => state.fabricCanvas);
export const useSetFabricCanvas = () => useEditorInfraStore((state) => state.setFabricCanvas);
export const useClearFabricCanvasIfMatch = () => useEditorInfraStore((state) => state.clearFabricCanvasIfMatch);

export const useTiptapEditor = () => useEditorInfraStore((state) => state.tiptapEditor);
export const useSetTiptapEditor = () => useEditorInfraStore((state) => state.setTiptapEditor);
export const useClearTiptapEditorIfMatch = () => useEditorInfraStore((state) => state.clearTiptapEditorIfMatch);
