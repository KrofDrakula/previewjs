import { expect, waitFor } from "@previewjs/e2e-test-runner";
import vue3Plugin from "@previewjs/plugin-vue3";
import { describe, it } from "vitest";

describe("vue3/refreshing", () => {
  it("renders top-level component", async (ctx) => {
    const { controller } = await ctx.setupTest("vue3", [vue3Plugin]);
    await controller.show("src/App.vue:App");
    const previewIframe = await controller.previewIframe();
    await previewIframe.waitForSelector(".logo");
  });

  it("renders top-level component after file system change", async (ctx) => {
    const { appDir, controller } = await ctx.setupTest("vue3", [vue3Plugin]);
    await controller.show("src/App.vue:App");
    const previewIframe = await controller.previewIframe();
    await previewIframe.waitForSelector(".logo");
    await appDir.update("src/App.vue", {
      kind: "edit",
      search: `class="logo"`,
      replace: `class="logo-modified"`,
    });
    await previewIframe.waitForSelector(".logo-modified");
  });

  it("renders top-level component after in-memory change", async (ctx) => {
    const { appDir, controller } = await ctx.setupTest("vue3", [vue3Plugin]);
    await controller.show("src/App.vue:App");
    const previewIframe = await controller.previewIframe();
    await previewIframe.waitForSelector(".logo");
    await appDir.update(
      "src/App.vue",
      {
        kind: "edit",
        search: `class="logo"`,
        replace: `class="logo-modified"`,
      },
      {
        inMemoryOnly: true,
      }
    );
    await previewIframe.waitForSelector(".logo-modified");
  });

  it("renders updated dependency after file system change", async (ctx) => {
    const { appDir, controller } = await ctx.setupTest("vue3", [vue3Plugin]);
    await controller.show("src/App.vue:App");
    const previewIframe = await controller.previewIframe();
    await previewIframe.waitForSelector(".hello");
    await appDir.update("src/components/HelloWorld.vue", {
      kind: "edit",
      search: `class="hello"`,
      replace: `class="hello-modified"`,
    });
    await previewIframe.waitForSelector(".hello-modified");
  });

  it("renders updated dependency after in-memory change", async (ctx) => {
    const { appDir, controller } = await ctx.setupTest("vue3", [vue3Plugin]);
    await controller.show("src/App.vue:App");
    const previewIframe = await controller.previewIframe();
    await previewIframe.waitForSelector(".hello");
    await appDir.update(
      "src/components/HelloWorld.vue",
      {
        kind: "edit",
        search: `class="hello"`,
        replace: `class="hello-modified"`,
      },
      {
        inMemoryOnly: true,
      }
    );
    await previewIframe.waitForSelector(".hello-modified");
  });

  it("renders updated CSS after file system change", async (ctx) => {
    const { appDir, controller } = await ctx.setupTest("vue3", [vue3Plugin]);
    await controller.show("src/App.vue:App");
    const previewIframe = await controller.previewIframe();
    expect(await getHelloWorldWidth()).toEqual(400);
    await appDir.update("src/components/HelloWorld.vue", {
      kind: "edit",
      search: `width: 400px`,
      replace: `width: 200px`,
    });
    await waitFor(async () => (await getHelloWorldWidth()) === 200);

    async function getHelloWorldWidth() {
      return (
        await (await previewIframe.waitForSelector(".hello"))?.boundingBox()
      )?.width;
    }
  });

  it("renders updated CSS after in-memory change", async (ctx) => {
    const { appDir, controller } = await ctx.setupTest("vue3", [vue3Plugin]);
    await controller.show("src/App.vue:App");
    const previewIframe = await controller.previewIframe();
    expect(await getHelloWorldWidth()).toEqual(400);
    await appDir.update(
      "src/components/HelloWorld.vue",
      {
        kind: "edit",
        search: `width: 400px`,
        replace: `width: 200px`,
      },
      {
        inMemoryOnly: true,
      }
    );
    await waitFor(async () => (await getHelloWorldWidth()) === 200);

    async function getHelloWorldWidth() {
      return (
        await (await previewIframe.waitForSelector(".hello"))?.boundingBox()
      )?.width;
    }
  });

  it("switches to another component back and forth smoothly", async (ctx) => {
    const { controller } = await ctx.setupTest("vue3", [vue3Plugin]);
    await controller.show("src/App.vue:App");
    const previewIframe = await controller.previewIframe();
    await previewIframe.waitForSelector(".logo");
    await controller.show("src/Other.vue:Other");
    await previewIframe.waitForSelector(".other");
    await controller.show("src/App.vue:App");
    await previewIframe.waitForSelector(".logo");
  });
});
