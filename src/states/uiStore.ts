import { create } from 'zustand';
import type { LogicalPage } from '../commands/spreadCommands';
import type { PageElement } from '../types';

interface UIState {
  currentSpreadIndex: number;
  selectedElementId: string | null;
  /** Array of all currently selected element IDs on the canvas. */
  selectedElementIds: string[];
  selectedPageId: string | null;
  selectedPageSide: 'left' | 'right';
  selectedPoolImageIds: string[];
  activeSidePanelTab: 'navigator' | 'images' | 'properties' | 'templates' | null;
  isSettingsOpen: boolean;
  isSnappingEnabled: boolean;
  /** ID of the text element currently in inline-editing mode, or null. */
  editingTextElementId: string | null;
  /** Set of 1-based page numbers that are selected for batch operations. */
  selectedPages: Set<number>;
  /** Discriminator for the shared clipboard: 'pages' for page clipboard, 'elements' for element clipboard. */
  clipboardType: 'pages' | 'elements' | null;
  /** Pages stored in the internal clipboard. */
  clipboardPages: LogicalPage[];
  /** Whether the clipboard was populated via copy or cut. */
  clipboardMode: 'copy' | 'cut' | null;
  /** 1-based page index where paste inserts before. null = append to end. */
  insertionPoint: number | null;
  /** Elements stored in the element clipboard. */
  clipboardElements: PageElement[];
  /** Spread ID where the clipboard elements were copied from. */
  clipboardSourceSpreadId: string | null;
  /** Page side ('left'/'right') where the clipboard elements were copied from. */
  clipboardSourcePageSide: 'left' | 'right' | null;

  // Actions
  setCurrentSpreadIndex: (index: number) => void;
  setSelectedElementId: (id: string | null) => void;
  setSelectedElementIds: (ids: string[]) => void;
  setSelectedPageId: (id: string | null) => void;
  setSelectedPageSide: (side: 'left' | 'right') => void;
  setSelectedPoolImageIds: (ids: string[]) => void;
  togglePoolImageSelection: (imageId: string, multi: boolean) => void;
  clearPoolImageSelection: () => void;
  setActiveSidePanelTab: (tab: 'navigator' | 'images' | 'properties' | 'templates' | null) => void;
  toggleSidePanel: (tab: 'navigator' | 'images' | 'properties' | 'templates') => void;
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
  setElementClipboard: (elements: PageElement[], spreadId: string, pageSide: 'left' | 'right') => void;
  clearElementClipboard: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentSpreadIndex: 0,
  selectedElementId: null,
  selectedElementIds: [],
  selectedPageId: null,
  selectedPageSide: 'left',
  selectedPoolImageIds: [],
  activeSidePanelTab: 'navigator',
  isSettingsOpen: false,
  isSnappingEnabled: true,
  editingTextElementId: null,
  selectedPages: new Set<number>(),
  clipboardType: null,
  clipboardPages: [],
  clipboardMode: null,
  insertionPoint: null,
  clipboardElements: [],
  clipboardSourceSpreadId: null,
  clipboardSourcePageSide: null,

  setCurrentSpreadIndex: (index) => set({ currentSpreadIndex: index }),

  setSelectedElementId: (id) => set({
    selectedElementId: id,
    selectedElementIds: id ? [id] : [],
  }),

  setSelectedElementIds: (ids) => set({
    selectedElementIds: ids,
    selectedElementId: ids.length === 1 ? ids[0] : null,
  }),

  setSelectedPageId: (id) => set({ selectedPageId: id }),

  setSelectedPageSide: (side) => set({ selectedPageSide: side }),

  setSelectedPoolImageIds: (ids) => set({ selectedPoolImageIds: ids }),

  togglePoolImageSelection: (imageId, multi) => set((state) => {
    if (!multi) {
      if (state.selectedPoolImageIds.length === 1 && state.selectedPoolImageIds[0] === imageId) {
        return { selectedPoolImageIds: [] };
      }
      return { selectedPoolImageIds: [imageId] };
    }

    if (state.selectedPoolImageIds.includes(imageId)) {
      return { selectedPoolImageIds: state.selectedPoolImageIds.filter(id => id !== imageId) };
    }

    return { selectedPoolImageIds: [...state.selectedPoolImageIds, imageId] };
  }),

  clearPoolImageSelection: () => set({ selectedPoolImageIds: [] }),

  setActiveSidePanelTab: (tab) => set({ activeSidePanelTab: tab }),

  toggleSidePanel: (tab) => set((state) => ({
    activeSidePanelTab: state.activeSidePanelTab === tab ? null : tab,
  })),

  toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),

  setSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),

  toggleSnapping: () => set((state) => ({ isSnappingEnabled: !state.isSnappingEnabled })),

  setSnappingEnabled: (enabled) => set({ isSnappingEnabled: enabled }),

  setEditingTextElementId: (id) => set({ editingTextElementId: id }),

  resetSelection: () => set({ selectedElementId: null, selectedElementIds: [], selectedPageId: null, editingTextElementId: null }),

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

  setClipboard: (pages, mode) => set({
    clipboardPages: pages,
    clipboardMode: mode,
    clipboardType: 'pages',
    clipboardElements: [],
    clipboardSourceSpreadId: null,
    clipboardSourcePageSide: null,
  }),

  clearClipboard: () => set({
    clipboardPages: [],
    clipboardMode: null,
    clipboardType: null,
    clipboardElements: [],
    clipboardSourceSpreadId: null,
    clipboardSourcePageSide: null,
  }),

  setInsertionPoint: (pageIndex) => set({ insertionPoint: pageIndex }),

  setElementClipboard: (elements, spreadId, pageSide) => set({
    clipboardElements: elements,
    clipboardSourceSpreadId: spreadId,
    clipboardSourcePageSide: pageSide,
    clipboardType: 'elements',
    clipboardPages: [],
    clipboardMode: null,
  }),

  clearElementClipboard: () => set({
    clipboardElements: [],
    clipboardSourceSpreadId: null,
    clipboardSourcePageSide: null,
    clipboardType: null,
  }),
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

/** Select the currently selected image pool item ids */
export const useSelectedPoolImageIds = () => useUIStore(state => state.selectedPoolImageIds);

/** Select the number of selected image pool items */
export const useSelectedPoolImageCount = () => useUIStore(state => state.selectedPoolImageIds.length);

/** Select the setSelectedPoolImageIds action */
export const useSetSelectedPoolImageIds = () => useUIStore(state => state.setSelectedPoolImageIds);

/** Select the togglePoolImageSelection action */
export const useTogglePoolImageSelection = () => useUIStore(state => state.togglePoolImageSelection);

/** Select the clearPoolImageSelection action */
export const useClearPoolImageSelection = () => useUIStore(state => state.clearPoolImageSelection);

/** Select the active side panel tab */
export const useActiveSidePanelTab = () => useUIStore(state => state.activeSidePanelTab);

/** Select whether settings modal is open */
export const useIsSettingsOpen = () => useUIStore(state => state.isSettingsOpen);

/** Select the toggleSettings action */
export const useToggleSettings = () => useUIStore(state => state.toggleSettings);

/** Select whether snapping is enabled */
export const useIsSnappingEnabled = () => useUIStore(state => state.isSnappingEnabled);

/** Select the toggleSnapping action */
export const useToggleSnapping = () => useUIStore(state => state.toggleSnapping);

/** Select the setActiveSidePanelTab action */
export const useSetActiveSidePanelTab = () => useUIStore(state => state.setActiveSidePanelTab);

/** Select the toggleSidePanel action */
export const useToggleSidePanel = () => useUIStore(state => state.toggleSidePanel);

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

/** Select the array of selected element IDs */
export const useSelectedElementIds = () => useUIStore(state => state.selectedElementIds);

/** Select the setSelectedElementIds action */
export const useSetSelectedElementIds = () => useUIStore(state => state.setSelectedElementIds);

/** Select the clipboard type discriminator */
export const useClipboardType = () => useUIStore(state => state.clipboardType);

/** Select the element clipboard contents */
export const useClipboardElements = () => useUIStore(state => state.clipboardElements);

/** Select the spread ID where clipboard elements were copied from */
export const useClipboardSourceSpreadId = () => useUIStore(state => state.clipboardSourceSpreadId);

/** Select the page side where clipboard elements were copied from */
export const useClipboardSourcePageSide = () => useUIStore(state => state.clipboardSourcePageSide);

/** Select the setElementClipboard action */
export const useSetElementClipboard = () => useUIStore(state => state.setElementClipboard);

/** Select the clearElementClipboard action */
export const useClearElementClipboard = () => useUIStore(state => state.clearElementClipboard);
