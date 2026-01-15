import { combineReducers } from "@reduxjs/toolkit";
import wordQueueSlide from "./wordQueueSlide";

const wordReducer = combineReducers({
    wordQueue: wordQueueSlide,
});

export default wordReducer;