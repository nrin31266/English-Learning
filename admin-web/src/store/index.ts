

import { combineReducers, configureStore } from '@reduxjs/toolkit';
 // Thunk không cần destructure
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux'; 
import learningContentReducer from './learningcontent/index';
import systemReducer from './system/index';
const rootReducer = combineReducers({
  learningContent: learningContentReducer,
  system: systemReducer
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
