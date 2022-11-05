import test, { expect } from "@playwright/test";
import type { PreviewEvent } from "@previewjs/iframe";
import { startPreview } from "@previewjs/testing";
import path from "path";
import pluginFactory from "../src";

test.describe.configure({ mode: "parallel" });

for (const reactVersion of [16, 17, 18]) {
  test.describe(`v${reactVersion}`, () => {
    test.describe("react/console", () => {
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

      test("intercepts logs", async () => {
        await preview.show("src/App.tsx:App");
        await preview.iframe.waitForSelector(".App");
        const events: PreviewEvent[] = [];
        preview.listen((e) => events.push(e));
        await preview.fileManager.update(
          "src/App.tsx",
          `function App() {
            console.log("Render 1");
            return (
              <div id="update-1">
                Hello, World!
              </div>
            );
          }`
        );
        await preview.iframe.waitForSelector("#update-1");
        expect(events).toContainEqual({
          kind: "log-message",
          level: "log",
          timestamp: expect.anything(),
          message: "Render 1",
        });
        await preview.fileManager.update(
          "src/App.tsx",
          `function App() {
            console.log("Render 2");
            return (
              <div id="update-2">
                Hello, World!
              </div>
            );
          }`
        );
        await preview.iframe.waitForSelector("#update-2");
        expect(events).toContainEqual({
          kind: "log-message",
          level: "log",
          timestamp: expect.anything(),
          message: "Render 2",
        });
      });
    });
  });
}
