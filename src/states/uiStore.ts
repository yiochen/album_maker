import { create } from 'zustand';

interface UIState {
  currentSpreadIndex: number;
  selectedElementId: string | null;
  selectedPageId: string | null;
  isImagePoolOpen: boolean;
  isSettingsOpen: boolean;
  isSnappingEnabled: boolean;

  // Actions
  setCurrentSpreadIndex: (index: number) => void;
  setSelectedElementId: (id: string | null) => void;
  setSelectedPageId: (id: string | null) => void;
  toggleImagePool: () => void;
  setImagePoolOpen: (isOpen: boolean) => void;
  toggleSettings: () => void;
  setSettingsOpen: (isOpen: boolean) => void;
  toggleSnapping: () => void;
  setSnappingEnabled: (enabled: boolean) => void;
  resetSelection: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentSpreadIndex: 0,
  selectedElementId: null,
  selectedPageId: null,
  isImagePoolOpen: true,
  isSettingsOpen: false,
  isSnappingEnabled: true,

  setCurrentSpreadIndex: (index) => set({ currentSpreadIndex: index }),

  setSelectedElementId: (id) => set({ selectedElementId: id }),

  setSelectedPageId: (id) => set({ selectedPageId: id }),

  toggleImagePool: () => set((state) => ({ isImagePoolOpen: !state.isImagePoolOpen })),

  setImagePoolOpen: (isOpen) => set({ isImagePoolOpen: isOpen }),

  toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),

  setSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),

  toggleSnapping: () => set((state) => ({ isSnappingEnabled: !state.isSnappingEnabled })),

  setSnappingEnabled: (enabled) => set({ isSnappingEnabled: enabled }),

  resetSelection: () => set({ selectedElementId: null, selectedPageId: null }),
}));
