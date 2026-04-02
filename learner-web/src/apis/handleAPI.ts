import type { Method } from "axios";
import axiosInstance from "./axiosInstance";
import axios from "axios";
import type { IApiResponse } from "@/types";


interface RequestParams<B = unknown> {
  endpoint: string;
  body?: B;
  method?: Method;
  isAuth?: boolean;
  params?: Record<string, any>;
  withCredentials?: boolean;
  timeout?: number; // in milliseconds
  contentType?: string;
  signal?: AbortSignal; // optional: for request cancellation
}



const handleAPI = async <T, B = unknown>({
  endpoint,
  body,
  method = "GET",
  isAuth = true,
  params,
  withCredentials = false,
  timeout,
  contentType,
  signal, // optional: for request cancellation
}: RequestParams<B>): Promise<T> => {
  try {
    const headers: Record<string, string> = {};

    if (isAuth) {
      //headers: { "X-Auth": "true" }
        headers["X-Auth"] = "true";
    }
    if (contentType) {
      headers["Content-Type"] = contentType;
    }else{
      headers["Content-Type"] = "application/json";
    }

    const axiosResponse = await axiosInstance({
      url: endpoint,
      method,
      data: body,
      headers,
      params,
      withCredentials: withCredentials,
      timeout: timeout || 10000, // default timeout 10s
      signal, // optional: for request cancellation
    });

    const response: IApiResponse<T> = axiosResponse.data;
    return response.result;

  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
        // ⬇️ Trả ra object lỗi để UI tự map theo từng ngôn ngữ
        throw {
          code: error.response.data.code,
          message: error.response.data.message,
          // raw: error.response.data, // optional: debug
        };
      }

      throw {
        code: -1,
        message: "An unexpected error occurred.",
      };
  }
};

export default handleAPI;
