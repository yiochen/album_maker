import { create } from 'zustand';

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
