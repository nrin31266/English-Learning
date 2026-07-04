// src/store/uiSlice.ts

import { createSlice } from "@reduxjs/toolkit"

type UiState = {
  authDialogOpen: boolean
}

const initialState: UiState = {
  authDialogOpen: false,
}

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    openAuthDialog: (state) => {
      state.authDialogOpen = true
    },
    closeAuthDialog: (state) => {
      state.authDialogOpen = false
    },
  },
})

export const { openAuthDialog, closeAuthDialog } = uiSlice.actions
export default uiSlice.reducer