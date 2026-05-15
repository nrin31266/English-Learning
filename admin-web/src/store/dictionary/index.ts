import { combineReducers } from "@reduxjs/toolkit";
import dictionaryReducer from "./dictionarySlice";

export default combineReducers({
  dictionary: dictionaryReducer,
});

