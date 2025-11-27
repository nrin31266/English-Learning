
import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import { nanoid } from "nanoid"

export type NotificationVariant = "info" | "success" | "warning" | "error"

export interface INotification {
  id: string
  title?: string
  message: string
  variant: NotificationVariant
  durationMs?: number | null // null = không auto ẩn
  closable?: boolean
}

interface INotificationState {
  items: INotification[]
}

const initialState: INotificationState = {
  items: [],
}

const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    showNotification: {
      reducer(state, action: PayloadAction<INotification>) {
        state.items.push(action.payload)
      },
      // cho phép gọi showNotification({ message, variant, ... }) mà không cần tự tạo id
      prepare(
        payload: Omit<INotification, "id"> & { id?: string }
      ) {
        return {
          payload: {
            id: payload.id ?? nanoid(),
            title: payload.title,
            message: payload.message,
            variant: payload.variant ?? "info",
            durationMs: payload.durationMs ?? 4000,
            closable: payload.closable ?? true,
          } as INotification,
        }
      },
    },
    hideNotification(state, action: PayloadAction<string>) {
      state.items = state.items.filter((n) => n.id !== action.payload)
    },
    clearNotifications(state) {
      state.items = []
    },
  },
})

export const {
  showNotification,
  hideNotification,
  clearNotifications,
} = notificationSlice.actions

export default notificationSlice.reducer
