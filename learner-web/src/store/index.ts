

import { combineReducers, configureStore } from '@reduxjs/toolkit';
 // Thunk không cần destructure
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux'; 
import systemReducer from './system/index';
import topicsReducer from './topicsSlide';
import topicReducer from './topicSlide';
import lessonForShadowingReducer from './lessonForShadowingSlide';
const rootReducer = combineReducers({
  system: systemReducer,
  topics: topicsReducer,
  topic: topicReducer,
  lessonForShadowing: lessonForShadowingReducer,
});


const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware(),
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof rootReducer>;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store;
