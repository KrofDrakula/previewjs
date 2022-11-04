import test from "@playwright/test";
import { startPreview } from "@previewjs/testing";
import path from "path";
import pluginFactory from "../src";

test.describe.configure({ mode: "parallel" });

test.describe("react/refreshing", () => {
  let preview: Awaited<ReturnType<typeof startPreview>> | null = null;

  test.afterEach(() => preview?.stop());

  for (const version of [16, 17, 18]) {
    test.describe(`v${version}`, () => {
      test("renders top-level component", async ({ page }) => {
        preview = await startPreview(
          [pluginFactory],
          page,
          path.join(__dirname, "../../../test-apps/react" + version)
        );
        await preview.show("src/App.tsx:App");
        const iframe = await preview.iframe.get();
        await iframe.waitForSelector(".App-logo");
      });
    });
  }
});
