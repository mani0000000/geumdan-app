import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const URL = "http://localhost/api/admin/auth";

async function loadRoute() {
  return import("./route");
}

function request(method: string, body?: unknown, cookie?: string) {
  return new NextRequest(URL, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("admin auth route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("ADMIN_PASSWORD", "correct-password");
    vi.stubEnv("ADMIN_SESSION_SECRET", "test-session-secret-with-32-bytes");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects a wrong password", async () => {
    const { POST } = await loadRoute();
    const response = await POST(request("POST", { password: "wrong-password" }));
    expect(response.status).toBe(401);
  });

  it("issues and validates a signed session cookie", async () => {
    const { GET, POST } = await loadRoute();
    const login = await POST(request("POST", { password: "correct-password" }));
    expect(login.status).toBe(200);

    const cookie = login.headers.get("set-cookie")?.split(";", 1)[0];
    expect(cookie).toMatch(/^admin_session=v1\./);

    const session = await GET(request("GET", undefined, cookie));
    expect(session.status).toBe(200);
  });

  it("rejects requests without a session cookie", async () => {
    const { GET } = await loadRoute();
    const response = await GET(request("GET"));
    expect(response.status).toBe(401);
  });

  it("clears the session cookie on logout", async () => {
    const { DELETE } = await loadRoute();
    const response = await DELETE();
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
