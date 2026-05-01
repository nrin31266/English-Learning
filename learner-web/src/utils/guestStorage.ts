// utils/guestStorage.ts

const GUEST_KEY_PREFIX = "fluenrin_guest_progress_v1";

const getKey = (id: string, mode: string) => {
    return `${GUEST_KEY_PREFIX}:${mode.toUpperCase()}:${id}`;
};

export const saveGuestProgress = (
    id: string,
    mode: string,
    completedIds: number[]
) => {
    try {
        localStorage.setItem(
            getKey(id, mode),
            JSON.stringify(completedIds ?? [])
        );
    } catch (err) {
        console.error("saveGuestProgress failed:", err);
    }
};

export const getGuestProgress = (
    id: string,
    mode: string
): number[] => {
    try {
        const data = localStorage.getItem(getKey(id, mode));
        if (!data) return [];

        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        console.error("getGuestProgress failed:", err);
        return [];
    }
};

export const clearGuestProgress = (
    id: string,
    mode: string
) => {
    try {
        localStorage.removeItem(getKey(id, mode));
    } catch (err) {
        console.error("clearGuestProgress failed:", err);
    }
};