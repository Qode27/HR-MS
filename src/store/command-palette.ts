"use client";

import { create } from "zustand";

type CommandState = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

export const useCommandPaletteStore = create<CommandState>((set) => ({
  open: false,
  setOpen: (open) => set({ open })
}));
