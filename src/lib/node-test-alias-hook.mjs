import { existsSync } from "node:fs";
import { extname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { registerHooks } from "node:module";

function withJavaScriptExtension(target) {
  if (!extname(target) && existsSync(`${target}.js`)) return `${target}.js`;
  return target;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const target = withJavaScriptExtension(resolve(process.cwd(), "src", specifier.slice(2)));
      return nextResolve(pathToFileURL(target).href, context);
    }
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      const target = withJavaScriptExtension(fileURLToPath(new URL(specifier, context.parentURL)));
      if (target !== fileURLToPath(new URL(specifier, context.parentURL))) {
        return nextResolve(pathToFileURL(target).href, context);
      }
    }
    return nextResolve(specifier, context);
  },
});
