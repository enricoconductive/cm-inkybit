# IBIT version 1 fixtures

`all-white.ts` is the canonical default source expression for the future full-screen image picker. It contains one MakeCode `hex` tagged Buffer literal with the exact 7,510-byte version-1 layout:

- `IBIT` magic
- version `1`
- row-major packed 2bpp encoding `1`
- 250x120 little-endian dimensions
- 7,500 zero payload bytes (White pixels)

Run `npm run verify:default-image` from the extension root to verify the literal without compiling any future block or native implementation.
