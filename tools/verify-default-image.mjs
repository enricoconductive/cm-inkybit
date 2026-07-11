import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(resolve(root, "fixtures/ibit-v1/all-white.ts"), "utf8");
const match = source.match(/hex`([0-9a-f]+)`/i);

assert.ok(match, "all-white.ts must contain one hex tagged literal");
const bytes = Buffer.from(match[1], "hex");
assert.equal(bytes.length, 7510, "default image must be exactly 7,510 bytes");
assert.equal(bytes.subarray(0, 4).toString("ascii"), "IBIT");
assert.equal(bytes[4], 1, "format version");
assert.equal(bytes[5], 1, "encoding");
assert.equal(bytes.readUInt16LE(6), 250, "width");
assert.equal(bytes.readUInt16LE(8), 120, "height");
assert.ok(bytes.subarray(10).every(byte => byte === 0), "all pixels must be White");

console.log("verified IBIT v1 all-White literal (7,510 bytes)");
