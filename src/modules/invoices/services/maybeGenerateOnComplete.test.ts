import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/email", () => ({
  sendInvoiceEmail: vi.fn(),
}));

vi.mock("@/modules/invoices/services/generateInvoice", () => ({
  generateInvoice: vi.fn(),
}));

vi.mock("@/modules/invoices/queries/invoice", () => ({
  getInvoice: vi.fn(),
}));

import { generateInvoice } from "@/modules/invoices/services/generateInvoice";
import { maybeGenerateInvoiceOnComplete } from "./maybeGenerateOnComplete";
import { logger } from "@/lib/logger";

describe("maybeGenerateInvoiceOnComplete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("swallows CONFLICT so Complete still succeeds", async () => {
    vi.mocked(generateInvoice).mockRejectedValue(
      new AppError("CONFLICT", "An invoice already exists for this booking."),
    );

    await expect(
      maybeGenerateInvoiceOnComplete("bk-1", { id: "driver-1" }),
    ).resolves.toBeUndefined();

    expect(logger.info).toHaveBeenCalled();
  });

  it("logs other failures without throwing", async () => {
    vi.mocked(generateInvoice).mockRejectedValue(new Error("storage down"));

    await expect(
      maybeGenerateInvoiceOnComplete("bk-1", { id: "driver-1" }),
    ).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalled();
  });
});
