import { create } from "zustand";

export type FeatureFlags = {
  newUI: boolean;
  debugPanel: boolean;
  experimentalSearch: boolean;
};

interface FlagsState extends FeatureFlags {
  setFlag: (key: keyof FeatureFlags, value: boolean) => void;
  toggleFlag: (key: keyof FeatureFlags) => void;
}

export const useFlags = create<FlagsState>((set) => ({
  newUI: true,
  debugPanel: true,
  experimentalSearch: false,
  setFlag: (key, value) => set({ [key]: value } as Partial<FlagsState>),
  toggleFlag: (key) => set((state) => ({ [key]: !state[key] } as Partial<FlagsState>)),
}));
