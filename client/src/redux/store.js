import { configureStore } from "@reduxjs/toolkit";
import complaintReducer from "./complaintSlice";

const store = configureStore({
  reducer: {
    complaints: complaintReducer,
  },
});

export default store;