# Inky:Bit image editor release gate

The image-editor consumer on `feature/inkybit-image-editor-v1` deliberately stays
unreleased. Public `master` and the `v0.0.5` tag remain compatible with ordinary
MakeCode for micro:bit.

## Compatibility contract

- The serialized value is the versioned `IBIT` v1 byte format documented in
  `fixtures/ibit-v1/README.md`.
- `drawFullScreenImage` consumes that format without depending on editor code.
- The `inkyimage` selector is an explicit capability requirement. It must never
  be replaced with a text field or other silent fallback.
- The public extension may be compiled by the public target without the custom
  field only while the selector-using block remains off `master` and untagged.

## Required release order

1. Submit the target field capability and its focused tests for review.
2. Wait for that capability to be accepted and released in a public MakeCode
   for micro:bit target.
3. Update this extension's locked development toolchain to that released target
   and rerun `npm ci`, `npm run verify:default-image`,
   `npm run test:native-loader`, and `npm run test:extension`.
4. Perform the block edit, save, reopen, and compile browser journey against the
   released target.
5. Only then merge the selector consumer to `master`, tag, and publish it.

GitHub Pages on the target fork is development evidence, not a public target
release and not evidence of Microsoft or Pimoroni approval.
