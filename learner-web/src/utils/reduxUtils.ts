import type { IApiResponse } from "@/types"


export const extractError = (error: unknown): IApiResponse<null> => {
    
  // TH1: lỗi do handleAPI ném ra: { code, message }
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as any).code === "number"
  ) {
    return {
      code: (error as any).code,
      message: (error as any).message || "Unknown error",
      result: null,
    };
  }

  // TH2: lỗi dạng Error chuẩn của JS
  if (error instanceof Error) {
    return {
      code: -1,
      message: error.message,
      result: null,
    };
  }

  // TH3: fallback
  return {
    code: -2,
    message: "Unexpected error occurred.",
    result: null,
  };
};
