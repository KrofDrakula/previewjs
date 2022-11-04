import type { PreviewEvent } from "@previewjs/iframe";
import type { Page } from "playwright";
import type { Component } from "../client/src";

export async function render(
  page: Page,
  component: Component,
  listener: (event: PreviewEvent) => void = () => {
    // Do nothing by default.
  }
) {
  await page.exposeFunction("onIframeEvent", listener);
  await page.evaluate((component) => {
    window.renderComponent(component);
  }, component);
}
