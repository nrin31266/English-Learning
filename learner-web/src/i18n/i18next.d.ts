import "i18next";
import type { LangResources } from "./resources";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: {
      translation: LangResources;
    };
  }
}

// Allow dynamic string keys for t() calls by extending TFunction
declare module "i18next" {
  interface TFunction {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (key: string | string[], options?: Record<string, unknown>): string;
  }
}
