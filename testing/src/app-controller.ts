/// <reference types="@previewjs/iframe/preview/window" />

import { RPCs } from "@previewjs/api";
import {
  createChromelessWorkspace,
  getPreviewIframe,
  render,
} from "@previewjs/chromeless";
import type {
  FrameworkPluginFactory,
  Preview,
  Workspace,
} from "@previewjs/core";
import type { PreviewEvent } from "@previewjs/iframe";
import { generateInvocation } from "@previewjs/properties";
import fs from "fs-extra";
import path from "path";
import type playwright from "playwright";
import { prepareFileManager } from "./file-manager";

export class AppController {
  private preview: Preview | null = null;
  private workspace: Workspace | null = null;

  constructor(
    private readonly frameworkPluginFactories: FrameworkPluginFactory[],
    private readonly page: playwright.Page,
    private readonly rootDirPath: string,
    private readonly port: number
  ) {}

  async start() {
    const { reader, fileManager } = await prepareFileManager(
      this.rootDirPath,
      () => this.onBeforeFileUpdated()
    );
    const workspace = await createChromelessWorkspace({
      rootDirPath: this.rootDirPath,
      reader,
      frameworkPluginFactories: this.frameworkPluginFactories,
    });
    this.workspace = workspace;
    this.preview = await workspace.preview.start(async () => this.port);
    await this.page.goto(this.preview.url());
    return { fileManager };
  }

  async stop() {
    await this.preview?.stop();
    this.preview = null;
    await this.workspace?.dispose();
    this.workspace = null;
  }

  async waitForIdle() {
    await this.page.waitForLoadState("networkidle");
    try {
      await (await getPreviewIframe(this.page)).waitForLoadState("networkidle");
    } catch (e) {
      // It's OK for the iframe to be replace by another one, in which case wait again.
      await (await getPreviewIframe(this.page)).waitForLoadState("networkidle");
    }
  }

  private async onBeforeFileUpdated() {
    try {
      const iframe = await this.page.$("iframe");
      if (!iframe) {
        // No iframe yet, so no need to expect anything to change.
        return;
      }
    } catch (e) {
      // Ignore, most likely due to whole-page refresh.
      return;
    }
    const frame = await getPreviewIframe(this.page);
    await frame.$eval("body", () => {
      return window.__expectFutureRefresh__();
    });
  }

  async waitForExpectedIframeRefresh() {
    const frame = await getPreviewIframe(this.page);
    try {
      await frame.$eval("body", async () => {
        // It's possible that __waitForExpectedRefresh__ isn't ready yet.
        let waitStart = Date.now();
        while (
          !window.__waitForExpectedRefresh__ &&
          Date.now() - waitStart < 5000
        ) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        return window.__waitForExpectedRefresh__();
      });
    } catch (e: any) {
      if (
        e.message.includes(
          "Execution context was destroyed, most likely because of a navigation"
        )
      ) {
        await this.waitForExpectedIframeRefresh();
      } else {
        throw e;
      }
    }
  }

  async show(componentId: string, listener?: (event: PreviewEvent) => void) {
    if (!this.preview || !this.workspace) {
      throw new Error(`Preview server is not started.`);
    }
    const filePath = componentId.split(":")[0]!;
    const { components } = await this.workspace.localRpc(
      RPCs.DetectComponents,
      {
        filePaths: [filePath],
      }
    );
    const detectedComponents = components[filePath] || [];
    const matchingDetectedComponent = detectedComponents.find(
      (c) => componentId === `${filePath}:${c.name}`
    );
    if (!matchingDetectedComponent) {
      throw new Error(
        `Component may be previewable but was not detected by framework plugin: ${componentId}`
      );
    }
    const component = {
      componentName: matchingDetectedComponent.name,
      filePath,
    };
    const computePropsResponse = await this.workspace.localRpc(
      RPCs.ComputeProps,
      component
    );
    const customVariantPropsSource = generateInvocation(
      computePropsResponse.types.props,
      [],
      computePropsResponse.types.all
    );
    await render(
      this.page,
      {
        ...component,
        customVariantPropsSource,
      },
      listener
    );
  }

  async getIframe() {
    return await getPreviewIframe(this.page);
  }

  async takeScreenshot(preview: playwright.Frame, destinationPath: string) {
    preview.addStyleTag({
      content: `
*,
*::after,
*::before {
  transition-delay: 0s !important;
  transition-duration: 0s !important;
  animation-delay: -0.0001s !important;
  animation-duration: 0s !important;
  animation-play-state: paused !important;
  caret-color: transparent !important;
  color-adjust: exact !important;
}
`,
    });
    // Ensure all images are loaded.
    // Source: https://stackoverflow.com/a/49233383
    await preview.evaluate(async () => {
      const selectors = Array.from(document.querySelectorAll("img"));
      await Promise.all(
        selectors.map((img) => {
          if (img.complete) {
            return;
          }
          return new Promise<unknown>((resolve) => {
            const observer = new IntersectionObserver((entries) => {
              if (entries[0]?.isIntersecting) {
                img.addEventListener("load", resolve);
                // If an image fails to load, ignore it.
                img.addEventListener("error", resolve);
              } else {
                resolve(null);
              }
              observer.unobserve(img);
            });
            observer.observe(img);
          });
        })
      );
    });
    const destinationDirPath = path.dirname(destinationPath);
    await fs.mkdirp(destinationDirPath);
    await this.waitForIdle();
    await this.page.screenshot({
      path: destinationPath,
    });
  }
}
