import type * as express from "express";
import type { Workspace } from ".";
import type { RegisterRPC } from "./router";

export type SetupPreviewEnvironment = (options: {
  registerRPC: RegisterRPC;
  workspace: Workspace;
}) => Promise<{
  middlewares?: express.RequestHandler[];
}>;
