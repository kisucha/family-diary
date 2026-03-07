import { create } from "zustand";

interface UIStore {
  /** PC: 사이드바 고정 표시 여부 / 모바일: Sheet 열림 여부 */
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

/**
 * UI 전역 상태 스토어
 *
 * - 사이드바 열림/닫힘 상태를 Header(햄버거 버튼)와 MobileNav(Sheet) 간에 공유
 * - Zustand: 경량, boilerplate 없음, Context 없이 어디서든 사용 가능
 *
 * @example
 * const { isSidebarOpen, toggleSidebar } = useUIStore();
 */
export const useUIStore = create<UIStore>((set) => ({
  isSidebarOpen: false,

  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  setSidebarOpen: (open: boolean) => set({ isSidebarOpen: open }),
}));
