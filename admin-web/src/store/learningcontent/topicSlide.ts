import handleAPI from "@/apis/handleAPI";
import type { IAsyncState, IErrorState, ITopicDto, ITopicOption, MutationType } from "@/types";
import { extractError } from "@/utils/reduxUtils";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";



interface ITopicReducer {
  topics: IAsyncState<ITopicDto[]>;
  topicOptions: IAsyncState<ITopicOption[]>;
  topicMutation: IAsyncState<null> & { type: MutationType };

}


const initialState: ITopicReducer = {
  topics: {
    data: [],
    status: "idle",
    error: { code: null, message: null }
  },
  topicOptions: {
    data: [],
    status: "idle",
    error: { code: null, message: null }
  },
  topicMutation: {
    data: null,
    status: "idle",
    type: null,
    error: { code: null, message: null }
  }
    ,
};


const topicSlide = createSlice({
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
      })
      .addCase(fetchTopicOptions.pending, (state) => {
        state.topicOptions.status = "loading";
        state.topicOptions.error = { code: null, message: null };
      })
      .addCase(fetchTopicOptions.fulfilled, (state, action) => {
        state.topicOptions.status = "succeeded";
        state.topicOptions.data = action.payload;
      })
      .addCase(fetchTopicOptions.rejected, (state, action) => {
        state.topicOptions.status = "failed";
        state.topicOptions.error = action.payload as IErrorState;
      })
      .addCase(addTopic.pending, (state) => {
        state.topicMutation.status = "loading";
        state.topicMutation.error = { code: null, message: null };
        state.topicMutation.type = "add";
      })
      .addCase(addTopic.fulfilled, (state, action) => {
        state.topicMutation.status = "succeeded";
        state.topicMutation.data = null;
        state.topics.data.push(action.payload);
        state.topicOptions.data.push({
          id: action.payload.id,
          name: action.payload.name,
          slug: action.payload.slug,
        });
      })
      .addCase(addTopic.rejected, (state, action) => {
        state.topicMutation.status = "failed";
        state.topicMutation.error = action.payload as IErrorState;
        
      })
      .addCase(editTopic.pending, (state) => {
        state.topicMutation.status = "loading";
        state.topicMutation.error = { code: null, message: null };
        state.topicMutation.type = "edit";
      })
      .addCase(editTopic.fulfilled, (state, action) => {
        state.topicMutation.status = "succeeded";
        state.topicMutation.data = null;
        const index = state.topics.data.findIndex(topic => topic.id === action.payload.id);
        if (index !== -1) {
          state.topics.data[index] = action.payload;
        }
        const optionIndex = state.topicOptions.data.findIndex(option => option.id === action.payload.id);
        if (optionIndex !== -1) {
          state.topicOptions.data[optionIndex] = {
            id: action.payload.id,
            name: action.payload.name,
            slug: action.payload.slug,
          };
        }
      })
      .addCase(editTopic.rejected, (state, action) => {
        state.topicMutation.status = "failed";
        state.topicMutation.error = action.payload as IErrorState;
      })
      .addCase(deleteTopic.pending, (state) => {
        state.topicMutation.status = "loading";
        state.topicMutation.error = { code: null, message: null };
        state.topicMutation.type = "delete";
      })
      .addCase(deleteTopic.fulfilled, (state, action) => {
        state.topicMutation.status = "succeeded";
        state.topicMutation.data = null;
        state.topics.data = state.topics.data.filter(topic => topic.slug !== action.meta.arg);
        state.topicOptions.data = state.topicOptions.data.filter(option => option.slug !== action.meta.arg);
      })
      .addCase(deleteTopic.rejected, (state, action) => {
        state.topicMutation.status = "failed";
        state.topicMutation.error = action.payload as IErrorState;
      });
  }
});


export default topicSlide.reducer;

export const fetchTopics = createAsyncThunk(
  "topics/fetchTopics",
  async (_, { rejectWithValue }) => {
    try {
      const data = await handleAPI<ITopicDto[]>({
        endpoint: "/learning-contents/admin/topics",
        method: "GET",
        isAuth: true,
      });
      return data;
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

export const addTopic = createAsyncThunk(
  "topics/addTopic",
  async (payload: FormData, { rejectWithValue }) => {
    try {
      const data = await handleAPI<ITopicDto>({
        endpoint: "/learning-contents/topics",
        method: "POST",
        isAuth: true,
        body: payload,
      });
      return data;
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

export const editTopic = createAsyncThunk(
  "topics/editTopic",
  async (payload: { slug: string; data: FormData }, { rejectWithValue }) => {
    try {
      const data = await handleAPI<ITopicDto>({
        endpoint: `/learning-contents/topics/${payload.slug}`,
        method: "PUT",
        isAuth: true,
        body: payload.data,
      });
      return data;
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);
export const deleteTopic = createAsyncThunk(
  "topics/deleteTopic",
  async (slug: string, { rejectWithValue }) => {
    try {
      const data = await handleAPI<null>({
        endpoint: `/learning-contents/topics/${slug}`,
        method: "DELETE",
        isAuth: true,
      });
      return data;
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

export const fetchTopicOptions = createAsyncThunk(
  "topics/fetchTopicOptions",
  async (_, { rejectWithValue }) => {
    try {
      const data = await handleAPI<ITopicOption[]>({
        endpoint: "/learning-contents/topics/minimals",
        method: "GET",
        isAuth: true,
      });
      return data;
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);
