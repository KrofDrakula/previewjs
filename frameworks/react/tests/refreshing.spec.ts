import test from "@playwright/test";
import { startPreview } from "@previewjs/testing";
import path from "path";
import pluginFactory from "../src";

test.describe.configure({ mode: "parallel" });

test.describe("react/refreshing", () => {
  let preview: Awaited<ReturnType<typeof startPreview>>;

  for (const version of [16, 17, 18]) {
    test.beforeEach(async ({ page }) => {
      preview = await startPreview(
        [pluginFactory],
        page,
        path.join(__dirname, "../../../test-apps/react" + version)
      );
    });
    test.afterEach(() => preview?.stop());

    test.describe(`v${version}`, () => {
      test("renders top-level component", async () => {
        await preview.show("src/App.tsx:App");
        const iframe = await preview.iframe.get();
        await iframe.waitForSelector(".App-logo");
      });

      test("renders top-level component after file system change", async () => {
        await preview.show("src/App.tsx:App");
        const iframe = await preview.iframe.get();
        await iframe.waitForSelector(".App-logo");
        await preview.fileManager.update("src/App.tsx", {
          kind: "edit",
          search: `className="App"`,
          replace: `className="App-modified"`,
        });
        await iframe.waitForSelector(".App-modified");
      });
    });
  }
});
