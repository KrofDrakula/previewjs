import vue2Plugin from "@previewjs/plugin-vue2";
import { describe, it } from "vitest";

describe("vue2/jsx", () => {
  it("renders JSX component", async (ctx) => {
    const { appDir, controller } = await ctx.setupTest("vue2", [vue2Plugin]);
    await appDir.update("src/Button.jsx", {
      kind: "replace",
      text: `
export const Button = ({props}) => {
  return <button>
    {props.label || "a button"}
  </button>
}
        `,
    });
    await controller.show("src/Button.jsx:Button");
    const previewIframe = await controller.previewIframe();
    await previewIframe.waitForSelector(
      "xpath=//button[contains(., 'a button')]"
    );
  });

  it("renders JSX component with previews", async (ctx) => {
    const { appDir, controller } = await ctx.setupTest("vue2", [vue2Plugin]);
    await appDir.update("src/Button.jsx", {
      kind: "replace",
      text: `
export const Button = ({ props }) => {
  return <button>
    {props.label || "a button"}
  </button>
}

Button.previews = {
  default: {
    label: "Hello, World!"
  }
}
        `,
    });
    await controller.show("src/Button.jsx:Button");
    const previewIframe = await controller.previewIframe();
    await previewIframe.waitForSelector(
      "xpath=//button[contains(., 'Hello, World!')]"
    );
  });
});
