import test from "@playwright/test";
import { AppController, prepareTestDir } from "@previewjs/testing";
import getPort from "get-port";
import path from "path";
import pluginFactory from "../src";

test.describe.configure({ mode: "parallel" });

test.describe("react/refreshing", () => {
  let appController: AppController;

  test.afterEach(async () => {
    await appController.stop();
  });

  for (const version of [16, 17, 18]) {
    test.describe(`v${version}`, () => {
      test("renders top-level component", async ({ page }) => {
        const rootDirPath = await prepareTestDir(
          path.join(__dirname, "../../../test-apps/react" + version)
        );
        const port = await getPort();
        appController = new AppController(
          [pluginFactory],
          page,
          rootDirPath,
          port
        );
        const { fileManager } = await appController.start();
        await appController.show("src/App.tsx:App");
        const iframe = await appController.getIframe();
        await iframe.waitForSelector(".App-logo");
        await fileManager.update("src/App.tsx", {
          kind: "edit",
          search: "App-logo",
          replace: "App-blah",
        });
        await iframe.waitForSelector(".App-blah");
      });
    });
  }
});
