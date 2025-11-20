import en from "./en.json";
import vi from "./vi.json";

export const resources = {
  en: { translation: en },
  vi: { translation: vi }
} as const;

export type LangResources = typeof resources["vi"]["translation"];
