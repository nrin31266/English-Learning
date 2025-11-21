export interface IUserProfile {
  email?: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
}

export interface IApiResponse<T> {
  result: T;
  message: string;
  code: number;
}
export interface ITopicDto {
  id: number;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  color: string | null; // nếu color có thể null từ backend
  createdAt: string; // ISO datetime string
  updatedAt: string; // ISO datetime string
  lessonCount?: number; // Số lượng bài học trong chủ đề này
}

export interface ITopicOption{
    id: number;
    name: string;
    slug: string;
}
export interface IErrorState {
  code: number | null;
  message: string | null;
}

// export interface IAddEditTopicPayload {
//   name: string;
//   description: string;
//   isActive: boolean;
//   color: string; 
// }

export interface IAsyncState<T> {
  data: T;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: IErrorState;
}

export type MutationType = "add" | "edit" | "delete" | null;
export const lessonTypeOptions = ["AI_ASSISTED", "TRADITIONAL"] as const
export const cefrLevelOptions = ["A1", "A2", "B1", "B2", "C1", "C2"] as const
export const sourceTypeOptions = ["YOUTUBE", "AUDIO_FILE", "OTHER"] as const
export const sourceLanguageOptions = ["en-US", "en-UK"] as const