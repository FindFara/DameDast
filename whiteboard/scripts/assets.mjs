import { cp, mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
const output = path.resolve("../src/Poolo.Web/wwwroot/whiteboard");
await cp(
  "node_modules/@excalidraw/excalidraw/dist/prod/fonts",
  path.join(output, "fonts"),
  { recursive: true },
);
await mkdir(path.join(output, "licenses"), { recursive: true });
await cp(
  "Excalidraw-LICENSE.txt",
  path.join(output, "licenses/Excalidraw-LICENSE.txt"),
);
async function walk(dir) {
  const out = [];
  for (const f of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    out.push(...(f.isDirectory() ? await walk(p) : [p]));
  }
  return out;
}
for (const file of ["model.mjs", "storage.mjs", "sync.mjs"])
  await cp(path.join("src", file), path.join(output, file));
const files = (await walk(output)).map(
  (p) => "/whiteboard/" + path.relative(output, p).replaceAll(path.sep, "/"),
);
await writeFile(
  path.join(output, "asset-manifest.json"),
  JSON.stringify(files),
);
console.log(`Prepared ${files.length} self-hosted whiteboard assets.`);
