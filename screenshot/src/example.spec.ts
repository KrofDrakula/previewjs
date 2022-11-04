import { test } from "@playwright/test";
import { RPCs } from "@previewjs/api";
import { generateInvocation } from "@previewjs/properties";
import path from "path";
import { openPreview } from ".";
import type { Component } from "../client/src";
import { getPreviewIframe } from "./iframe";

test("example", async ({ page }) => {
  const { workspace, renderComponent } = await openPreview(
    page,
    "/Users/fwouts/dev/hungry"
  );
  const found = await workspace.localRpc(RPCs.DetectComponents, {});
  const components: Component[] = [];
  for (const [filePath, fileComponents] of Object.entries(found.components)) {
    for (const component of fileComponents) {
      const properties = await workspace.localRpc(RPCs.ComputeProps, {
        filePath,
        componentName: component.name,
      });
      const invocation = generateInvocation(
        properties.types.props,
        [],
        properties.types.all
      );
      components.push({
        filePath,
        componentName: component.name,
        customVariantPropsSource: invocation,
      });
      // We only need one component for testing here.
      break;
    }
    break;
  }
  await renderComponent(components[0]!);
  const iframe = await getPreviewIframe(page);
  await page.screenshot({
    path: path.join(__dirname, "screenshot.png"),
  });
  console.log("Screenshot!");
});
