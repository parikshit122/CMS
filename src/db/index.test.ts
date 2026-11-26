import test from "node:test";
import assert from "node:assert/strict";
import {
  isTransientIdleDisconnectError,
  buildPoolConfig,
  hasDatabaseConfig,
} from "./index";

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

test("buildPoolConfig uses DATABASE_URL with SSL for external Postgres and omits SSL for Render internal or sslmode=disable", () => {
  const hosted = buildPoolConfig({
    DATABASE_URL: "postgresql://user:pass@dpg-123.oregon-postgres.render.com/cms",
  });
  assert.equal(
    hosted.connectionString,
    "postgresql://user:pass@dpg-123.oregon-postgres.render.com/cms"
  );
  assert.deepEqual(hosted.ssl, { rejectUnauthorized: false });

  const renderInternal = buildPoolConfig({
    DATABASE_URL: "postgresql://user:pass@dpg-123456-a/cms",
  });
  assert.equal(renderInternal.ssl, undefined);

  const disabled = buildPoolConfig({
    DATABASE_URL: "postgresql://user:pass@db.internal/cms?sslmode=disable",
  });
  assert.equal(disabled.ssl, undefined);
});

test("buildPoolConfig preserves Cloud SQL SQL_HOST config and detects missing DB config", () => {
  const cloudSql = buildPoolConfig({
    SQL_HOST: "127.0.0.1",
    SQL_USER: "app",
    SQL_PASSWORD: "secret",
    SQL_DB_NAME: "cms",
  });
  assert.equal(cloudSql.host, "127.0.0.1");
  assert.equal(cloudSql.database, "cms");
  assert.equal(cloudSql.ssl, undefined);

  assert.equal(hasDatabaseConfig({}), false);
  assert.equal(hasDatabaseConfig({ DATABASE_URL: "postgres://a/b" }), true);
  assert.equal(hasDatabaseConfig({ SQL_HOST: "127.0.0.1" }), true);
});
