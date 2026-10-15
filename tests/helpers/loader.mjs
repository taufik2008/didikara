// tests/helpers/loader.mjs
import { register } from "node:module";
import { pathToFileURL } from "node:url";

export function resolve(specifier, context, nextResolve) {
  if (specifier === "next/server") {
    return nextResolve("next/server.js", context);
  }
  if (specifier.startsWith("@/")) {
    const rel = specifier.slice(2);
    const resolvedUrl = new URL(`../../src/${rel}.js`, import.meta.url).href;
    return { url: resolvedUrl, format: "module", shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
