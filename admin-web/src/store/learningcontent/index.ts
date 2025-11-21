import { combineReducers } from "@reduxjs/toolkit";
import topicReducer from "./topicReducer";
const learningContentReducer = combineReducers({
    topics: topicReducer
});

export default learningContentReducer;