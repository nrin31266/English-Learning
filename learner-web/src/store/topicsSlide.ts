import handleAPI from "@/apis/handleAPI";
import type { IAsyncState, IErrorState, ILHomeResponse, ITopicDto, ITopicOption, MutationType } from "@/types";
import { extractError } from "@/utils/reduxUtils";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";



interface ITopicsReducer {
  topics: IAsyncState<ILHomeResponse>;
}
const initialState: ITopicsReducer = {
  topics: {
    data: {
      allTopics: [],
      topics: [],
    },
    status: "idle",
    error: {
      code: null,
      message: null,
    },
  },
};
export const fetchTopics = createAsyncThunk(
  "topics/fetchTopics",
  async ({ limitLessonsPerTopic = 4, limitTopics = 10 } : { limitLessonsPerTopic?: number; limitTopics?: number }, { rejectWithValue }) => {
    try {
      const data = await handleAPI<ILHomeResponse>({
        endpoint: "/learning-contents/learner/home/topics",
        method: "GET",
        isAuth: true,
        params: {
          limitLessonsPerTopic,
          limitTopics
        }
      });
      return data;
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);
export const topicsSlide = createSlice({
  name: "topics",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTopics.pending, (state) => {
        state.topics.status = "loading";
        state.topics.error = { code: null, message: null };
      })
      .addCase(fetchTopics.fulfilled, (state, action) => {
        state.topics.status = "succeeded";
        state.topics.data = action.payload;
      })
      .addCase(fetchTopics.rejected, (state, action) => {
        state.topics.status = "failed";
        state.topics.error = action.payload as IErrorState;
      });
  },
});

export default topicsSlide.reducer;
