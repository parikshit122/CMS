import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import complaintService from "../services/complaintService";

export const fetchAssignedComplaints = createAsyncThunk(
  "complaints/fetchAssigned",
  async (_, { rejectWithValue }) => {
    try {
      const res = await complaintService.getAssignedComplaints();
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch assigned complaints"
      );
    }
  }
);

export const fetchAllComplaints = createAsyncThunk(
  "complaints/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const res = await complaintService.getAllComplaints();
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch complaints"
      );
    }
  }
);

export const fetchMyComplaints = createAsyncThunk(
  "complaints/fetchMine",
  async (_, { rejectWithValue }) => {
    try {
      const res = await complaintService.getMyComplaints();
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch your complaints"
      );
    }
  }
);

export const updateComplaintStatus = createAsyncThunk(
  "complaints/updateStatus",
  async ({ complaintId, status, rejectionReason }, { rejectWithValue }) => {
    try {
      const res = await complaintService.updateComplaintStatus(complaintId, {
        status,
        ...(rejectionReason && { rejectionReason }),
      });
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to update status"
      );
    }
  }
);

export const fetchStaffStats = createAsyncThunk(
  "complaints/fetchStaffStats",
  async (_, { rejectWithValue }) => {
    try {
      const res = await complaintService.getStaffStats();
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch stats"
      );
    }
  }
);

const initialState = {
  assigned:      [],
  all:           [],
  mine:          [],
  stats: {
    totalAssigned:   0,
    pending:         0,
    inProgress:      0,
    resolved:        0,
    rejected:        0,
    weeklyTrend:     [],
    statusBreakdown: [],
  },
  loading:       false,
  statsLoading:  false,
  updateLoading: false,
  error:         null,
  updateError:   null,
  updateSuccess: false,
};

const complaintSlice = createSlice({
  name: "complaints",
  initialState,
  reducers: {
    clearUpdateState(state) {
      state.updateLoading = false;
      state.updateError   = null;
      state.updateSuccess = false;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAssignedComplaints.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(fetchAssignedComplaints.fulfilled, (state, action) => {
        state.loading  = false;
        state.assigned = action.payload;
      })
      .addCase(fetchAssignedComplaints.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      })

      .addCase(fetchAllComplaints.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(fetchAllComplaints.fulfilled, (state, action) => {
        state.loading = false;
        state.all     = action.payload;
      })
      .addCase(fetchAllComplaints.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      })

      .addCase(fetchMyComplaints.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(fetchMyComplaints.fulfilled, (state, action) => {
        state.loading = false;
        state.mine    = action.payload;
      })
      .addCase(fetchMyComplaints.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      })

      .addCase(updateComplaintStatus.pending, (state) => {
        state.updateLoading = true;
        state.updateError   = null;
        state.updateSuccess = false;
      })
      .addCase(updateComplaintStatus.fulfilled, (state, action) => {
        state.updateLoading = false;
        state.updateSuccess = true;
        const updated = action.payload;
        const updateInList = (list) =>
          list.map((c) => (c._id === updated._id ? updated : c));
        state.assigned = updateInList(state.assigned);
        state.all      = updateInList(state.all);
        state.mine     = updateInList(state.mine);
      })
      .addCase(updateComplaintStatus.rejected, (state, action) => {
        state.updateLoading = false;
        state.updateError   = action.payload;
      })

      .addCase(fetchStaffStats.pending, (state) => {
        state.statsLoading = true;
      })
      .addCase(fetchStaffStats.fulfilled, (state, action) => {
        state.statsLoading = false;
        state.stats        = action.payload;
      })
      .addCase(fetchStaffStats.rejected, (state, action) => {
        state.statsLoading = false;
        state.error        = action.payload;
      });
  },
});

export const { clearUpdateState, clearError } = complaintSlice.actions;
export default complaintSlice.reducer;