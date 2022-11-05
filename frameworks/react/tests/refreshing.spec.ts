import test, { expect } from "@playwright/test";
import { startPreview } from "@previewjs/testing";
import path from "path";
import pluginFactory from "../src";

test.describe.configure({ mode: "parallel" });

for (const reactVersion of [16, 17, 18]) {
  test.describe(`v${reactVersion}`, () => {
    test.describe("react/refreshing", () => {
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

      test("renders top-level component", async () => {
        await preview.show("src/App.tsx:App");
        await preview.iframe.waitForSelector(".App-logo");
      });

      test("switches to another component back and forth smoothly in different files", async () => {
        await preview.show("src/App.tsx:App");
        await preview.iframe.waitForSelector(".App");
        await preview.show("src/Other.tsx:Other");
        await preview.iframe.waitForSelector(".Other");
        await preview.show("src/App.tsx:App");
        await preview.iframe.waitForSelector(".App");
      });

      for (const inMemoryOnly of [false, true]) {
        test.describe(
          inMemoryOnly ? "in-memory file change" : "real file change",
          () => {
            test("updates top-level component after file change", async () => {
              await preview.show("src/App.tsx:App");
              await preview.iframe.waitForSelector(".App");
              await preview.fileManager.update(
                "src/App.tsx",
                {
                  replace: `className="App"`,
                  with: `className="App-modified"`,
                },
                {
                  inMemoryOnly,
                }
              );
              await preview.iframe.waitForSelector(".App-modified");
            });

            test("updates dependency after file change", async () => {
              await preview.show("src/App.tsx:App");
              await preview.iframe.waitForSelector(".Dependency");
              await preview.fileManager.update(
                "src/Dependency.tsx",
                {
                  replace: `className="Dependency"`,
                  with: `className="Dependency-modified"`,
                },
                {
                  inMemoryOnly,
                }
              );
              await preview.iframe.waitForSelector(".Dependency-modified");
            });

            test("updates CSS after file change", async () => {
              await preview.show("src/App.tsx:App");
              const dependencyComponent = await preview.iframe.waitForSelector(
                ".Dependency"
              );
              expect((await dependencyComponent?.boundingBox())?.width).toEqual(
                200
              );
              await preview.fileManager.update(
                "src/App.css",
                {
                  replace: `width: 200px`,
                  with: `width: 400px`,
                },
                {
                  inMemoryOnly,
                }
              );
              await preview.iframe.waitForExpectedIframeRefresh();
              expect((await dependencyComponent?.boundingBox())?.width).toEqual(
                400
              );
            });
          }
        );
      }
    });
  });
}
