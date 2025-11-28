
import handleAPI from "@/apis/handleAPI";
import type { IAsyncState, IErrorState, ILTopicResponse } from "@/types";
import { extractError } from "@/utils/reduxUtils";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

//     }
interface ITopicReducer {
  topic: IAsyncState<ILTopicResponse | null>;
}
const initialState: ITopicReducer = {
    topic: {
      data: null,
      status: "idle",
      error: {
        code: null,
        message: null,
      },
    },
};

export const fetchTopicBySlug = createAsyncThunk(
  "topic/fetchTopicBySlug",
  async (slug: string, { rejectWithValue }) => {
    try {
      const data = await handleAPI<ILTopicResponse>({
        endpoint: `/learning-contents/learner/topics/${slug}`,
        method: "GET",
        isAuth: true,
      });
      return data;
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

export const topicSlide = createSlice({
  name: "topic",
  initialState,
  reducers: {},
  extraReducers: (builder: any) => {
    builder
      .addCase(fetchTopicBySlug.pending, (state: ITopicReducer) => {
        state.topic.status = "loading";
        state.topic.error = { code: null, message: null };
      })
      .addCase(fetchTopicBySlug.fulfilled, (state: ITopicReducer, action: { payload: ILTopicResponse }) => {
        state.topic.status = "succeeded";
        state.topic.data = action.payload;
      })
      .addCase(fetchTopicBySlug.rejected, (state: ITopicReducer, action: { payload: IErrorState }) => {
        state.topic.status = "failed";
        state.topic.error = action.payload;
      });
  },
});

export default topicSlide.reducer;