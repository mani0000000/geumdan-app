import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const URL = "http://localhost/api/cron/realestate";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("realestate cron authentication", () => {
  it("fails closed when CRON_SECRET is missing", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const response = await GET(new NextRequest(URL));
    expect(response.status).toBe(401);
  });

  it("rejects an invalid bearer token", async () => {
    vi.stubEnv("CRON_SECRET", "correct-secret");
    const response = await GET(new NextRequest(URL, {
      headers: { Authorization: "Bearer wrong-secret" },
    }));
    expect(response.status).toBe(401);
  });
});
