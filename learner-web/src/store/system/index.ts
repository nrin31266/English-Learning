import { combineReducers } from "@reduxjs/toolkit";
import notificationReducer from "./notificationSlice";
const systemContentReducer = combineReducers({
    notifications: notificationReducer,
});

export default systemContentReducer;