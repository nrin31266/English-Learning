import { combineReducers } from "@reduxjs/toolkit";
import topicReducer from "./topicSlide";
import lessonReducer from "./lessonSlice";
import lessonDetailsReducer from "./lessonDetailsSlide";
const learningContentReducer = combineReducers({
    topics: topicReducer,
    lessons: lessonReducer,
    lessonDetails: lessonDetailsReducer
});

export default learningContentReducer;