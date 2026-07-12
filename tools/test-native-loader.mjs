import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const temp = mkdtempSync(resolve(tmpdir(), "inkybit-native-"));
const WIDTH = 250;
const HEIGHT = 120;
const STRIDE = 17;

function encode(pixels) {
    const bytes = new Uint8Array(7510);
    bytes.set([0x49, 0x42, 0x49, 0x54, 1, 1, 250, 0, 120, 0]);
    for (let i = 0; i < pixels.length; i++) {
        bytes[10 + (i >> 2)] |= pixels[i] << (6 - 2 * (i & 3));
    }
    return bytes;
}

function makeEditorFixture() {
    const pixels = new Uint8Array(WIDTH * HEIGHT);
    for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
            let colour = x < 83 ? 1 : x < 166 ? 0 : 2;
            if (y >= 80 && ((x >> 3) + (y >> 3)) % 2 === 0) colour = colour === 1 ? 2 : 1;
            pixels[y * WIDTH + x] = colour;
        }
    }
    // Asymmetric corner/orientation markers and one-pixel edge lines.
    pixels[0] = 2;
    pixels[1] = 2;
    pixels[WIDTH] = 2;
    pixels[WIDTH * HEIGHT - 1] = 1;
    for (let x = 0; x < WIDTH; x++) pixels[60 * WIDTH + x] = x % 2 ? 1 : 2;
    return pixels;
}

function expectedPlanes(pixels) {
    const black = new Uint8Array(STRIDE * 250).fill(0xff);
    const red = new Uint8Array(STRIDE * 250);
    for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
            const driverY = 136 - 1 - (y + 6);
            const mask = 1 << (7 - (driverY & 7));
            const offset = x * STRIDE + (driverY >> 3);
            const colour = pixels[y * WIDTH + x];
            if (colour === 1) black[offset] &= ~mask;
            if (colour === 2) red[offset] |= mask;
        }
    }
    return { black, red };
}

try {
    const displaySource = readFileSync(resolve(root, "display.cpp"), "utf8");
    assert.match(
        displaySource,
        /void drawFullScreenImage\(Buffer data\)\s*\{\s*if \(!data \|\| !buf_b \|\| !buf_r\) return;/,
        "native Buffer wrapper must reject null input and uninitialised destinations before dereference"
    );
    const pixels = makeEditorFixture();
    const encoded = encode(pixels);
    const expected = expectedPlanes(pixels);
    const paths = {
        encoded: resolve(temp, "fixture.ibit"),
        black: resolve(temp, "black.bin"),
        red: resolve(temp, "red.bin"),
        harness: resolve(temp, "native-loader-test")
    };
    writeFileSync(paths.encoded, encoded);
    const compiler = process.env.CXX || "c++";
    let result = spawnSync(compiler, ["-std=c++11", "-Wall", "-Wextra", "-Werror",
        resolve(root, "tools/native-loader-harness.cpp"), "-o", paths.harness], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr || "native harness compilation failed");
    result = spawnSync(paths.harness, [paths.encoded, paths.black, paths.red], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr || "native harness failed");
    assert.deepEqual(readFileSync(paths.black), Buffer.from(expected.black), "black bitplane");
    assert.deepEqual(readFileSync(paths.red), Buffer.from(expected.red), "red bitplane");
    assert.deepEqual(encoded, encode(pixels), "editor state and hex source bytes");
    console.log("native loader: editor fixture is byte-exact through IBIT source and both 4,250-byte bitplanes");
    console.log("native loader: invalid reserved colour leaves both bitplanes unchanged");
    console.log("native loader: null Buffer path leaves both bitplanes unchanged before dereference");
} finally {
    rmSync(temp, { recursive: true, force: true });
}
