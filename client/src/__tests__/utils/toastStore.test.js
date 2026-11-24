import { describe, it, expect, beforeEach } from "vitest";
import toast, {
  createToastRecord,
  enqueueToast,
  removeToastById,
  DEFAULT_DURATIONS,
  MAX_VISIBLE_TOASTS,
} from "../../utils/toastStore";

describe("toastStore pure helpers and pub/sub", () => {
  beforeEach(() => {
    toast.clear();
  });

  it("creates normalized toast records with semantic defaults", () => {
    const record = createToastRecord("Complaint submitted!", "success");
    expect(record.type).toBe("success");
    expect(record.title).toBe("Success");
    expect(record.message).toBe("Complaint submitted!");
    expect(record.duration).toBe(DEFAULT_DURATIONS.success);
  });

  it("falls back to info for unknown types and supports options object", () => {
    const record = createToastRecord("Settings saved", {
      type: "unknown",
      title: "Preferences",
      duration: 2500,
    });
    expect(record.type).toBe("info");
    expect(record.title).toBe("Preferences");
    expect(record.duration).toBe(2500);
  });

  it("stacks newest toasts first and caps visible count at maxVisible", () => {
    let list = [];
    for (let i = 1; i <= MAX_VISIBLE_TOASTS + 2; i += 1) {
      const rec = createToastRecord(`Message ${i}`, "info", { createdAt: 1000 + i * 2000 });
      list = enqueueToast(list, rec, MAX_VISIBLE_TOASTS);
    }
    expect(list).toHaveLength(MAX_VISIBLE_TOASTS);
    expect(list[0].message).toBe(`Message ${MAX_VISIBLE_TOASTS + 2}`);
  });

  it("deduplicates rapid identical toasts within the dedupe window", () => {
    const first = createToastRecord("Duplicate error", "error", { createdAt: 1000 });
    const second = createToastRecord("Duplicate error", "error", { createdAt: 1500 });
    let list = enqueueToast([], first);
    list = enqueueToast(list, second);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(second.id);
  });

  it("removes a toast by id and notifies subscribers on show/dismiss/clear", () => {
    let notifications = 0;
    const unsub = toast.subscribe(() => {
      notifications += 1;
    });

    const id1 = toast.success("Saved settings");
    const id2 = toast.error("Failed to save");
    expect(toast.getSnapshot()).toHaveLength(2);

    toast.dismiss(id1);
    expect(toast.getSnapshot()).toHaveLength(1);
    expect(toast.getSnapshot()[0].id).toBe(id2);

    const remaining = removeToastById(toast.getSnapshot(), id2);
    expect(remaining).toHaveLength(0);

    toast.clear();
    expect(toast.getSnapshot()).toHaveLength(0);
    expect(notifications).toBe(4);
    unsub();
  });

  it("handles toast.promise for resolved and rejected async operations", async () => {
    const result = await toast.promise(Promise.resolve("CMP-2026-0009"), {
      loading: "Submitting complaint...",
      success: (id) => `Submitted ${id}`,
    });

    expect(result).toBe("CMP-2026-0009");
    expect(toast.getSnapshot()[0].type).toBe("success");
    expect(toast.getSnapshot()[0].message).toBe("Submitted CMP-2026-0009");

    await expect(
      toast.promise(Promise.reject(new Error("Network error")), {
        loading: "Saving...",
        error: (err) => `Save failed: ${err.message}`,
      })
    ).rejects.toThrow("Network error");

    expect(toast.getSnapshot()[0].type).toBe("error");
    expect(toast.getSnapshot()[0].message).toBe("Save failed: Network error");
  });
});
