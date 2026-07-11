import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const targetPackage = JSON.parse(readFileSync(
    resolve(root, "node_modules/pxt-microbit/package.json"),
    "utf8"
));
const corePackage = JSON.parse(readFileSync(
    resolve(root, "node_modules/pxt-core/package.json"),
    "utf8"
));

assert.equal(targetPackage.version, "9.1.1", "unexpected pxt-microbit version");
assert.equal(corePackage.version, "13.0.1", "unexpected pxt-core version");

writeFileSync(
    resolve(root, "node_modules/pxtcli.json"),
    JSON.stringify({ targetdir: "pxt-microbit" }, null, 2) + "\n"
);

console.log("configured pinned local PXT target microbit 9.1.1 / core 13.0.1");
