import { configureStore } from "@reduxjs/toolkit";
import complaintReducer from "./complaintSlice";
import notificationReducer from "./notificationSlice";

const store = configureStore({
  reducer: {
    complaints: complaintReducer,
    notifications: notificationReducer,
  },
});

export default store;