import type { Reader } from "@previewjs/vfs";
import fs from "fs-extra";
import path from "path";
import type * as vite from "vite";
import { transformWithEsbuild } from "vite";

const jsExtensions = new Set([".js", ".jsx", ".ts", ".tsx"]);

export function virtualPlugin(options: {
  reader: Reader;
  rootDirPath: string;
  moduleGraph: () => vite.ModuleGraph | null;
  esbuildOptions: vite.ESBuildOptions;
}): vite.Plugin {
  const { reader, rootDirPath } = options;
  return {
    name: "previewjs:virtual-fs",
    resolveId: async function (id, importer) {
      if (id.indexOf(`/node_modules/`) !== -1) {
        return null;
      }
      const extension = path.extname(id);
      let absoluteId;
      if (path.isAbsolute(id)) {
        absoluteId = id;
      } else {
        if (!importer || importer.indexOf(`/node_modules/`) !== -1) {
          return null;
        }
        if (extension && !jsExtensions.has(extension) && extension !== ".svg") {
          // Virtual files mess with CSS processors like postcss.
          return path.join(path.dirname(importer), id);
        }
        absoluteId = path.join(path.dirname(importer), id);
      }
      const resolved = await resolveAbsoluteModuleId(absoluteId);
      if (resolved) {
        const [absoluteFilePath] = resolved;
        if (await fs.pathExists(absoluteFilePath)) {
          // This file doesn't need to be virtual.
          return null;
        }
        if (!absoluteId.endsWith(extension)) {
          absoluteId += extension;
        }
        const resolvedId = absoluteFilePath.replace(/\\/g, "/");
        return resolvedId;
      }
      return null;
    },
    load: async function (id) {
      if (id.indexOf(`/node_modules/`) !== -1) {
        return null;
      }
      const resolved = await resolveAbsoluteModuleId(id);
      if (!resolved) {
        // This could be a file handled by another plugin, e.g. CSS modules.
        return null;
      }
      const [absoluteFilePath, entry] = resolved;
      if (entry.kind !== "file") {
        console.error(`Unable to read file from ${absoluteFilePath}`);
        return null;
      }
      const source = await entry.read();
      const fileExtension = path.extname(absoluteFilePath);
      if (!jsExtensions.has(fileExtension)) {
        return source;
      }
      const moduleExtension = path.extname(id);
      return {
        code:
          // We run an esbuild transform for .js or no extension
          // because it may include JSX. Otherwise, let plugins
          // decide whether to use esbuild or not.
          moduleExtension === "" || moduleExtension === ".js"
            ? (
                await transformWithEsbuild(source, absoluteFilePath, {
                  loader: "tsx",
                  format: "esm",
                  sourcefile: path.relative(rootDirPath, absoluteFilePath),
                  ...options.esbuildOptions,
                })
              ).code
            : source,
      };
    },
    handleHotUpdate: async function (context) {
      const moduleGraph = options.moduleGraph();
      if (!moduleGraph) {
        return;
      }
      const filePath = path.relative(rootDirPath, context.file);
      const absoluteFilePath = path.join(rootDirPath, filePath);
      const entry = await reader.read(absoluteFilePath);
      if (!entry || entry.kind !== "file") {
        return;
      }
      // Note: backslash handling is Windows-specific.
      const virtualModuleId = absoluteFilePath.replace(/\\/g, "/");
      const node = moduleGraph.getModuleById(virtualModuleId);
      return node && [node];
    },
  };

  async function resolveAbsoluteModuleId(id: string) {
    return (
      (await resolveBaseFilePath(id)) ||
      (await resolveBaseFilePath(path.join(rootDirPath, id)))
    );
  }

  async function resolveBaseFilePath(baseFilePath: string) {
    for (const suffix of [
      "",
      ...jsExtensions,
      ...[...jsExtensions].map((extension) => `${path.sep}index${extension}`),
    ]) {
      const absoluteFilePath = `${baseFilePath}${suffix}`;
      const entry = await reader.read(absoluteFilePath);
      if (entry?.kind === "file") {
        return [absoluteFilePath, entry] as const;
      }
    }
    return null;
  }
}
