import { combineReducers } from "@reduxjs/toolkit";
import vocabReducer from "./vocabSlice";

export default combineReducers({ vocab: vocabReducer });
