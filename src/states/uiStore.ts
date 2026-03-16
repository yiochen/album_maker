import { create } from 'zustand';
import type { LogicalPage } from '../commands/spreadCommands';

interface UIState {
  currentSpreadIndex: number;
  selectedElementId: string | null;
  selectedPageId: string | null;
  selectedPageSide: 'left' | 'right';
  isImagePoolOpen: boolean;
  isSettingsOpen: boolean;
  isSnappingEnabled: boolean;
  /** ID of the text element currently in inline-editing mode, or null. */
  editingTextElementId: string | null;
  /** Set of 1-based page numbers that are selected for batch operations. */
  selectedPages: Set<number>;
  /** Pages stored in the internal clipboard. */
  clipboardPages: LogicalPage[];
  /** Whether the clipboard was populated via copy or cut. */
  clipboardMode: 'copy' | 'cut' | null;
  /** 1-based page index where paste inserts before. null = append to end. */
  insertionPoint: number | null;

  // Actions
  setCurrentSpreadIndex: (index: number) => void;
  setSelectedElementId: (id: string | null) => void;
  setSelectedPageId: (id: string | null) => void;
  setSelectedPageSide: (side: 'left' | 'right') => void;
  toggleImagePool: () => void;
  setImagePoolOpen: (isOpen: boolean) => void;
  toggleSettings: () => void;
  setSettingsOpen: (isOpen: boolean) => void;
  toggleSnapping: () => void;
  setSnappingEnabled: (enabled: boolean) => void;
  setEditingTextElementId: (id: string | null) => void;
  resetSelection: () => void;
  togglePageSelection: (pageNum: number) => void;
  setSelectedPages: (pages: Set<number>) => void;
  clearPageSelection: () => void;
  setClipboard: (pages: LogicalPage[], mode: 'copy' | 'cut') => void;
  clearClipboard: () => void;
  setInsertionPoint: (pageIndex: number | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentSpreadIndex: 0,
  selectedElementId: null,
  selectedPageId: null,
  selectedPageSide: 'left',
  isImagePoolOpen: true,
  isSettingsOpen: false,
  isSnappingEnabled: true,
  editingTextElementId: null,
  selectedPages: new Set<number>(),
  clipboardPages: [],
  clipboardMode: null,
  insertionPoint: null,

  setCurrentSpreadIndex: (index) => set({ currentSpreadIndex: index }),

  setSelectedElementId: (id) => set({ selectedElementId: id }),

  setSelectedPageId: (id) => set({ selectedPageId: id }),

  setSelectedPageSide: (side) => set({ selectedPageSide: side }),

  toggleImagePool: () => set((state) => ({ isImagePoolOpen: !state.isImagePoolOpen })),

  setImagePoolOpen: (isOpen) => set({ isImagePoolOpen: isOpen }),

  toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),

  setSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),

  toggleSnapping: () => set((state) => ({ isSnappingEnabled: !state.isSnappingEnabled })),

  setSnappingEnabled: (enabled) => set({ isSnappingEnabled: enabled }),

  setEditingTextElementId: (id) => set({ editingTextElementId: id }),

  resetSelection: () => set({ selectedElementId: null, selectedPageId: null, editingTextElementId: null }),

  togglePageSelection: (pageNum) => set((state) => {
    const next = new Set(state.selectedPages);
    if (next.has(pageNum)) {
      next.delete(pageNum);
    } else {
      next.add(pageNum);
    }
    return { selectedPages: next };
  }),

  setSelectedPages: (pages) => set({ selectedPages: pages }),

  clearPageSelection: () => set({ selectedPages: new Set<number>() }),

  setClipboard: (pages, mode) => set({ clipboardPages: pages, clipboardMode: mode }),

  clearClipboard: () => set({ clipboardPages: [], clipboardMode: null }),

  setInsertionPoint: (pageIndex) => set({ insertionPoint: pageIndex }),
}));

// ============ Selector Helper Hooks ============
// These hooks provide optimized selectors for specific state slices

/** Select the current spread index */
export const useCurrentSpreadIndex = () => useUIStore(state => state.currentSpreadIndex);

/** Select the setCurrentSpreadIndex action */
export const useSetCurrentSpreadIndex = () => useUIStore(state => state.setCurrentSpreadIndex);

/** Select the currently selected element ID */
export const useSelectedElementId = () => useUIStore(state => state.selectedElementId);

/** Select the setSelectedElementId action */
export const useSetSelectedElementId = () => useUIStore(state => state.setSelectedElementId);

/** Select the currently selected page ID */
export const useSelectedPageId = () => useUIStore(state => state.selectedPageId);

/** Select the setSelectedPageId action */
export const useSetSelectedPageId = () => useUIStore(state => state.setSelectedPageId);

/** Select the currently selected page side within the current spread */
export const useSelectedPageSide = () => useUIStore(state => state.selectedPageSide);

/** Select the setSelectedPageSide action */
export const useSetSelectedPageSide = () => useUIStore(state => state.setSelectedPageSide);

/** Select whether the image pool is open */
export const useIsImagePoolOpen = () => useUIStore(state => state.isImagePoolOpen);

/** Select the toggleImagePool action */
export const useToggleImagePool = () => useUIStore(state => state.toggleImagePool);

/** Select whether settings modal is open */
export const useIsSettingsOpen = () => useUIStore(state => state.isSettingsOpen);

/** Select the toggleSettings action */
export const useToggleSettings = () => useUIStore(state => state.toggleSettings);

/** Select whether snapping is enabled */
export const useIsSnappingEnabled = () => useUIStore(state => state.isSnappingEnabled);

/** Select the toggleSnapping action */
export const useToggleSnapping = () => useUIStore(state => state.toggleSnapping);

/** Select the setImagePoolOpen action */
export const useSetImagePoolOpen = () => useUIStore(state => state.setImagePoolOpen);

/** Select the setSettingsOpen action */
export const useSetSettingsOpen = () => useUIStore(state => state.setSettingsOpen);

/** Select the setSnappingEnabled action */
export const useSetSnappingEnabled = () => useUIStore(state => state.setSnappingEnabled);

/** Select the ID of the text element currently being edited */
export const useEditingTextElementId = () => useUIStore(state => state.editingTextElementId);

/** Select the setEditingTextElementId action */
export const useSetEditingTextElementId = () => useUIStore(state => state.setEditingTextElementId);

/** Whether a text element is currently in inline-editing mode */
export const useIsEditingText = () => useUIStore(state => state.editingTextElementId !== null);

/** Select the set of selected page numbers */
export const useSelectedPages = () => useUIStore(state => state.selectedPages);

/** Select the togglePageSelection action */
export const useTogglePageSelection = () => useUIStore(state => state.togglePageSelection);

/** Select the setSelectedPages action */
export const useSetSelectedPages = () => useUIStore(state => state.setSelectedPages);

/** Select the clearPageSelection action */
export const useClearPageSelection = () => useUIStore(state => state.clearPageSelection);

/** Select clipboard pages */
export const useClipboardPages = () => useUIStore(state => state.clipboardPages);

/** Select clipboard mode */
export const useClipboardMode = () => useUIStore(state => state.clipboardMode);

/** Select the setClipboard action */
export const useSetClipboard = () => useUIStore(state => state.setClipboard);

/** Select the clearClipboard action */
export const useClearClipboard = () => useUIStore(state => state.clearClipboard);

/** Select the insertion point */
export const useInsertionPoint = () => useUIStore(state => state.insertionPoint);

/** Select the setInsertionPoint action */
export const useSetInsertionPoint = () => useUIStore(state => state.setInsertionPoint);
