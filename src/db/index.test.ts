import test from "node:test";
import assert from "node:assert/strict";
import { isTransientIdleDisconnectError } from "./index";

test("detects expected Cloud SQL idle disconnect messages and codes", () => {
  assert.equal(
    isTransientIdleDisconnectError(new Error("Connection terminated unexpectedly")),
    true
  );
  assert.equal(
    isTransientIdleDisconnectError({ code: "57P01", message: "admin shutdown" }),
    true
  );
  assert.equal(
    isTransientIdleDisconnectError({ code: "ECONNRESET", message: "read ECONNRESET" }),
    true
  );
});

test("returns false for unrelated application or schema errors", () => {
  assert.equal(
    isTransientIdleDisconnectError(new Error("duplicate key value violates unique constraint")),
    false
  );
  assert.equal(isTransientIdleDisconnectError(null), false);
});
