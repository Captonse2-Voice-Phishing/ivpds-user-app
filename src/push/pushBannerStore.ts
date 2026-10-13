import { create } from 'zustand';

import type { PushPayload } from './pushData';

export interface PushBannerContent {
  title: string;
  body: string;
  payload: PushPayload | null;
}

interface PushBannerState {
  banner: PushBannerContent | null;
  show: (banner: PushBannerContent) => void;
  hide: () => void;
}

// Dải thông báo trong ứng dụng, hiện khi một thông báo đẩy đến lúc ứng dụng đang mở.
export const usePushBannerStore = create<PushBannerState>((set) => ({
  banner: null,
  show: (banner) => set({ banner }),
  hide: () => set({ banner: null }),
}));
