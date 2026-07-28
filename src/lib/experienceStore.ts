import { create } from "zustand";
import { persist } from "zustand/middleware";
import { clampEnergy, getBadgeEnergy } from "@/lib/energyRules";

type ExperienceState = {
  badges: string[];
  pledges: string[];
  confirmedPledges: string[];
  energy: number;
  soundEnabled: boolean;
  liteMode: boolean;
  presenterChapter: number;
  addBadge: (badge: string) => void;
  togglePledge: (pledge: string) => void;
  confirmPledges: (pledges: string[]) => void;
  addEnergy: (amount: number) => void;
  toggleSound: () => void;
  toggleLiteMode: () => void;
  setPresenterChapter: (chapter: number) => void;
};

export const useExperienceStore = create<ExperienceState>()(
  persist(
    (set) => ({
      badges: [],
      pledges: [],
      confirmedPledges: [],
      energy: 68,
      soundEnabled: true,
      liteMode: false,
      presenterChapter: 0,
      addBadge: (badge) => set((state) => {
        const alreadyCollected = state.badges.includes(badge);
        return {
          badges: alreadyCollected ? state.badges : [...state.badges, badge],
          energy: clampEnergy(state.energy + getBadgeEnergy(alreadyCollected)),
        };
      }),
      togglePledge: (pledge) => set((state) => ({
        pledges: state.pledges.includes(pledge)
          ? state.pledges.filter((item) => item !== pledge)
          : [...state.pledges, pledge],
      })),
      confirmPledges: (pledges) => set((state) => ({
        confirmedPledges: Array.from(new Set([...state.confirmedPledges, ...pledges])),
      })),
      addEnergy: (amount) => set((state) => ({ energy: clampEnergy(state.energy + amount) })),
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
      toggleLiteMode: () => set((state) => ({ liteMode: !state.liteMode })),
      setPresenterChapter: (presenterChapter) => set({ presenterChapter }),
    }),
    {
      name: "jianqi-future-experience",
      partialize: (state) => ({
        badges: state.badges,
        pledges: state.pledges,
        confirmedPledges: state.confirmedPledges,
        energy: state.energy,
        soundEnabled: state.soundEnabled,
        liteMode: state.liteMode,
        presenterChapter: state.presenterChapter,
      }),
    },
  ),
);
