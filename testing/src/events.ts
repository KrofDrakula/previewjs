import { expect } from "@playwright/test";
import type { PreviewEvent } from "@previewjs/iframe";

export function createPreviewEventListener() {
  let events: PreviewEvent[] = [];
  return [
    (event: PreviewEvent) => {
      events.push(event);
    },
    {
      clear() {
        events = [];
      },
      get() {
        return [...events];
      },
      expectLoggedMessages(messages: string[], level = "error") {
        expect(events.filter((e) => e.kind === "log-message")).toEqual(
          messages.map((message) => ({
            kind: "log-message",
            level,
            message: expect.stringContaining(message),
            timestamp: expect.anything(),
          }))
        );
      },
    },
  ] as const;
}
