import reactPlugin from "@previewjs/plugin-react";
import { describe, it } from "vitest";

describe("react/action logs", () => {
  for (const version of [16, 17, 18]) {
    it("shows action logs with fn() callback", async (ctx) => {
      const { appDir, controller } = await ctx.setupTest(`react${version}`, [
        reactPlugin,
      ]);
      await appDir.update("src/Button.tsx", {
        kind: "replace",
        text: `
function Button(props: { label: string; onClick(): void }) {
return (
  <button id="button" onClick={props.onClick}>
    {props.label}
  </button>
);
}
`,
      });
      await controller.show("src/Button.tsx:Button");
      await controller.props.editor.replaceText(`
  properties = {
    onClick: fn("onClick")
  };
  `);
      const previewIframe = await controller.previewIframe();
      await previewIframe.waitForSelector("#button");
      await previewIframe.click("#button");
      const actionLog = await controller.actionLog.get(
        "Function prop invoked: onClick"
      );
      await actionLog.waitUntilVisible();
      await actionLog.waitUntilGone();
    });

    it("shows action logs on autogenerated callback prop", async (ctx) => {
      const { appDir, controller } = await ctx.setupTest(`react${version}`, [
        reactPlugin,
      ]);
      await appDir.update("src/Button.tsx", {
        kind: "replace",
        text: `
function Button(props: { label: string; onClick(): void }) {
  return (
    <button id="button" onClick={props.onClick}>
      {props.label}
    </button>
  );
}
`,
      });
      await controller.show("src/Button.tsx:Button");
      const previewIframe = await controller.previewIframe();
      await previewIframe.waitForSelector("#button");
      await previewIframe.click("#button");
      const actionLog = await controller.actionLog.get(
        "Function prop invoked: onClick"
      );
      await actionLog.waitUntilVisible();
      await actionLog.waitUntilGone();
    });

    it("bundles multiple action logs", async (ctx) => {
      const { appDir, controller } = await ctx.setupTest(`react${version}`, [
        reactPlugin,
      ]);
      await appDir.update("src/Button.tsx", {
        kind: "replace",
        text: `
function Button(props: { label: string; a(): void; b(): void; }) {
  return (
    <>
      <button id="a" onClick={props.a}>
        {props.label}
      </button>
      <button id="b" onClick={props.b}>
        {props.label}
      </button>
    </>
  );
}
`,
      });
      await controller.show("src/Button.tsx:Button");
      await controller.props.editor.replaceText(`
      properties = {
        a: fn("a"),
        b: fn("b")
      };
      `);
      const previewIframe = await controller.previewIframe();
      await previewIframe.waitForSelector("#a");
      await previewIframe.click("#a");
      await previewIframe.click("#a");
      await previewIframe.click("#a");
      await previewIframe.click("#b");
      await previewIframe.click("#b");
      const actionLogA = await controller.actionLog.get(
        "Function prop invoked: a (x3)"
      );
      const actionLogB = await controller.actionLog.get(
        "Function prop invoked: b (x2)"
      );
      await actionLogA.waitUntilVisible();
      await actionLogB.waitUntilVisible();
      await actionLogA.waitUntilGone();
      await actionLogB.waitUntilGone();
    });

    it("shows action logs on link click", async (ctx) => {
      const { appDir, controller } = await ctx.setupTest(`react${version}`, [
        reactPlugin,
      ]);
      await appDir.update("src/Link.tsx", {
        kind: "replace",
        text: `
function Link() {
  return (
    <a id="link" href="https://www.google.com">
      Hello, World!
    </a>
  );
}
`,
      });
      await controller.show("src/Link.tsx:Link");
      const previewIframe = await controller.previewIframe();
      await previewIframe.waitForSelector("#link");
      await previewIframe.click("#link");
      const actionLog = await controller.actionLog.get(
        "Redirect prevented: https://www.google.com"
      );
      await actionLog.waitUntilVisible();
      await actionLog.waitUntilGone();
    });
  }
});
