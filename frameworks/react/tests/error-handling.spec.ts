import test, { expect } from "@playwright/test";
import type { PreviewEvent } from "@previewjs/iframe";
import { startPreview } from "@previewjs/testing";
import path from "path";
import pluginFactory from "../src";

test.describe.configure({ mode: "parallel" });

for (const reactVersion of [16, 17, 18]) {
  test.describe(`v${reactVersion}`, () => {
    test.describe("react/error handling", () => {
      let preview: Awaited<ReturnType<typeof startPreview>>;

      test.beforeEach(async ({ page }) => {
        preview = await startPreview(
          [pluginFactory],
          page,
          path.join(__dirname, "../../../test-apps/react" + reactVersion)
        );
      });
      test.afterEach(async () => {
        await preview?.stop();
        preview = null!;
      });

      test("handles syntax errors gracefully", async () => {
        await preview.show("src/App.tsx:App");
        await preview.iframe.waitForSelector(".App");
        await preview.fileManager.update("src/App.tsx", {
          replace: /<p>/g,
          with: "<p",
        });
        const events: PreviewEvent[] = [];
        preview.listen((e) => events.push(e));
        await preview.iframe.waitForExpectedIframeRefresh();
        expect(events.filter((e) => e.kind === "log-message")).toEqual([
          {
            kind: "log-message",
            level: "error",
            message: expect.stringContaining(
              "App.tsx: Unexpected token (24:15)"
            ),
            timestamp: expect.anything(),
          },
          {
            kind: "log-message",
            level: "error",
            message:
              "Failed to reload /src/App.tsx. This could be due to syntax errors or importing non-existent modules.",
            timestamp: expect.anything(),
          },
        ]);
        // The component should still be shown.
        await preview.iframe.waitForSelector(".App");
      });
    });
  });
}
