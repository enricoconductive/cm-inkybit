const WIDTH = 250;
const HEIGHT = 120;
const pixels = new Uint8Array(WIDTH * HEIGHT);

for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
        let colour = x < 83 ? 1 : x < 166 ? 0 : 2;
        if (y >= 80 && ((x >> 3) + (y >> 3)) % 2 === 0) {
            colour = colour === 1 ? 2 : 1;
        }
        pixels[y * WIDTH + x] = colour;
    }
}

// Asymmetric orientation marks plus a one-pixel alternating centre line.
pixels[0] = 2;
pixels[1] = 2;
pixels[WIDTH] = 2;
pixels[WIDTH * HEIGHT - 1] = 1;
for (let x = 0; x < WIDTH; x++) pixels[60 * WIDTH + x] = x % 2 ? 1 : 2;

const bytes = new Uint8Array(7510);
bytes.set([0x49, 0x42, 0x49, 0x54, 1, 1, 250, 0, 120, 0]);
for (let i = 0; i < pixels.length; i++) {
    bytes[10 + (i >> 2)] |= pixels[i] << (6 - 2 * (i & 3));
}
const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");

process.stdout.write(`// Ticket 05 physical micro:bit V2 + Inky:Bit fixture.\n`);
process.stdout.write(`// There must be exactly one physical refresh, at the end.\n`);
process.stdout.write(`inkybit.drawFullScreenImage(hex\`${hex}\`)\n`);
process.stdout.write(`inkybit.drawRectangle(8, 8, 66, 22, inkybit.Color.White, true)\n`);
process.stdout.write(`inkybit.drawText("ORDER", 12, 12, inkybit.Color.Black, inkybit.TextSize.Regular)\n`);
process.stdout.write(`inkybit.drawLine(0, 0, 249, 0, inkybit.Color.Black)\n`);
process.stdout.write(`inkybit.drawLine(0, 119, 249, 119, inkybit.Color.Accent)\n`);
process.stdout.write(`inkybit.show()\n`);
