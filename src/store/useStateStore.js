import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useStateStore = create(persist(
  (set) => ({
    artifacts: {},
    addArtifact: (key, data) => set((state) => ({
      artifacts: { ...state.artifacts, [key]: data }
    })),
  }),
  {
    name: 'artifact-storage',
    getStorage: () => localStorage,
  }
));
