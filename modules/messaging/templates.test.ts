import { describe, expect, it } from "vitest";

import { renderTemplate } from "./templates";

describe("message templates", () => {
  it("renders variables in subject and body", () => {
    const out = renderTemplate("Hello {{customerName}}, order {{orderNumber}}", {
      customerName: "Sara",
      orderNumber: "AKS-2026-00001",
    });
    expect(out).toBe("Hello Sara, order AKS-2026-00001");
  });

  it("renders courier AWB vars for dispatch copy", () => {
    const out = renderTemplate(
      "Courier: {{courierName}}\nTracking / AWB: {{trackingNumber}}",
      {
        courierName: "TCS",
        trackingNumber: "123456789012",
      },
    );
    expect(out).toContain("TCS");
    expect(out).toContain("123456789012");
  });
});
