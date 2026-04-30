// utils/guestStorage.ts
const GUEST_KEY_PREFIX = "fluenrin_guest_progress_";

const getKey = (slug: string, mode: string) => `${GUEST_KEY_PREFIX}${mode.toUpperCase()}_${slug}`;

export const saveGuestProgress = (slug: string, mode: string, completedIds: number[]) => {
    localStorage.setItem(getKey(slug, mode), JSON.stringify(completedIds));
};

export const getGuestProgress = (slug: string, mode: string): number[] => {
    const data = localStorage.getItem(getKey(slug, mode));
    return data ? JSON.parse(data) : [];
};

export const clearGuestProgress = (slug: string, mode: string) => {
    localStorage.removeItem(getKey(slug, mode));
};