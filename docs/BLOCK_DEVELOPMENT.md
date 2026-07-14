# Developing Inky:Bit MakeCode blocks

This is the contributor guide for adding or changing blocks in this extension.
It describes the current `feature/inkybit-image-editor-v1` architecture. The
main [README](../README.md) remains the end-user API reference, while
[IMAGE_EDITOR_RELEASE.md](IMAGE_EDITOR_RELEASE.md) describes the release gate
for the custom image field.

## Mental model

This repository is a MakeCode extension, not a complete MakeCode target. A
block can have up to three layers:

1. **Block and TypeScript API** in `inkybit.ts`. `//%` metadata defines the
   Blockly surface. The exported function is also the JavaScript/TypeScript
   API used by projects.
2. **Native hardware implementation** in `display.cpp` or `font.cpp` when the
   operation needs direct micro:bit/CODAL access. A small TypeScript function
   with `//% shim=inkybit::name` binds the public TypeScript layer to C++.
3. **Target-owned editor UI** in the sibling `pxt-microbit` repository when a
   parameter needs a custom visual editor. The extension declares the shadow
   block and selector; the target registers and implements that selector.

Most new drawing blocks need only layer 1 and should compose existing private
native primitives such as `_setPixel`. Hardware operations, new buffer formats,
or performance-critical work may also need layer 2. Layer 3 is exceptional: an
ordinary GitHub extension cannot itself register a target-level Blockly field.

## Repository map

| Path | Responsibility |
| --- | --- |
| `inkybit.ts` | Public enums/functions, block metadata, TypeScript drawing logic, and private shim declarations |
| `display.cpp` | Display buffers, pixel mapping, refresh, initialization, and native full-screen image loading |
| `ibit_decoder.h` | Pure, independently testable IBIT v1 validation and conversion into the display bitplanes |
| `font.cpp` | Native access to the micro:bit system font |
| `pxt.json` | Extension manifest: every compiled source/asset must appear in `files`; test entry points go in `testFiles` |
| `test.ts` | Top-level compile/example program used by `pxt test` |
| `fixtures/ibit-v1/` | Canonical serialized image fixture and physical test instructions |
| `tools/` | Reproducible fixture, native-decoder, and pinned-target checks |
| `.github/workflows/makecode.yml` | CI commands that define the current automated gate |

The sibling `../pxt-microbit` checkout contains the target-owned image editor:

- `fieldeditors/inkyImageField.ts` owns the Blockly field value and lifecycle.
- `fieldeditors/inkyImageEditor.ts` contains the drawing UI.
- `fieldeditors/inkyImageEditorGeometry.ts` contains shared viewport/text
  geometry.
- `fieldeditors/extensions.ts` registers the `inkyimage` selector.
- `inkybit-toolchain.json` is the authoritative target/extension pin record.
- `DEVELOPMENT.md` and `UPSTREAM.md` explain target preview and upstreaming.

Changes to the extension and target must be reviewed and tested together when
they alter a selector name, serialized value, shadow block, field lifecycle, or
decompilation behavior.

## Display and state model

- The physical panel/driver is treated as 250x122 by the established drawing
  API (`width()` and `height()`). Most public coordinate metadata currently
  limits y to 0..119.
- The full-screen image editor deliberately has a **250x120 logical canvas**.
  The remaining two driver-only rows are outside the editor image. Preserve
  this distinction unless a format migration is designed and versioned.
- Drawing functions update two RAM bitplanes: black and red/accent. They do not
  refresh the e-ink panel.
- `show()` performs the physical refresh. A new drawing block should normally
  not call it implicitly; users compose drawing operations and refresh once.
- `clear()` resets both bitplanes to White. `inkybit.init()` runs once at module
  load, allocates the buffers, and clears them.
- `Color.White = 0`, `Color.Black = 1`, and `Color.Accent = 2`. In the IBIT
  format the accent plane is Red. Value `3` is reserved and invalid.
- `_pixelSize` scales calls through public `setPixel()`. Code that calls the
  native `_setPixel()` directly intentionally bypasses that scaling.

E-ink refreshes are slow and power-significant. Keep buffer mutation separate
from refresh and avoid introducing animation-style APIs that repeatedly call
`show()` without a deliberate product decision.

## Adding an ordinary TypeScript block

Start here unless direct hardware access is required.

```typescript
/**
 * Draw a horizontal line.
 * @param y vertical position (0-119)
 * @param color colour to use
 */
//% blockId=inkybit_draw_horizontal_line
//% block="draw horizontal line at y $y with color $color"
//% y.min=0 y.max=119 y.defl=0
//% weight=70
export function drawHorizontalLine(
    y: number,
    color: Color = Color.Black
): void {
    drawLine(0, y, 249, y, color)
}
```

Checklist:

1. Put the function in the `inkybit` namespace in `inkybit.ts`.
2. Give it a globally unique, stable `blockId` prefixed with `inkybit_`.
   Block IDs are serialized into user projects; never rename or reuse one
   casually. Preserve existing IDs even if their historical names are odd.
3. Keep the names in the `block` string identical to the function parameters.
   Prefer the current `$parameter` syntax in new blocks. Existing `%parameter|`
   strings are legacy but remain valid and should not be churned unnecessarily.
4. Give TypeScript parameters real defaults as well as editor constraints where
   useful. Metadata such as `.min`, `.max`, and `.defl` shapes the editor; it is
   not runtime validation. Validate in code when invalid JavaScript input could
   corrupt state or cross a native boundary.
5. Use exported enums for finite choices. Add `//% block="label"` and, where
   needed, `ariaLabel` to enum members.
6. Use `//% advanced` for specialist APIs and `weight`/`blockGap` only to make
   the toolbox order intentional. Higher weights appear earlier.
7. Add a representative call to `test.ts`. Tests should exercise boundary and
   composition behavior, not just confirm that the symbol compiles.
8. Update the JavaScript reference in `README.md` for a public user-facing API.

Functions without `//% block` remain TypeScript APIs but are not shown as
blocks. Keep internal helpers unexported where possible.

## Adding a native-backed block

Use native code only for hardware access or when TypeScript cannot safely or
efficiently implement the operation. Follow the existing wrapper pattern:

```typescript
// Public block/API
//% blockId=inkybit_example
//% block="example $value"
export function example(value: number): void {
    _example(value)
}

// Private binding
//% shim=inkybit::example
function _example(value: number): void {
    return
}
```

```cpp
namespace inkybit {
    //%
    void example(int value) {
        // Native implementation
    }
}
```

The shim names and parameter types must agree across both languages. Keep the
public block metadata on the TypeScript API and keep the shim wrapper private;
this gives callers one stable API and allows TypeScript composition around the
native primitive.

At native boundaries:

- Reject null `Buffer` values and uninitialized destinations before
  dereferencing them.
- Validate the complete input before mutating display state. `ibit_decoder.h`
  follows this rule so malformed images leave both bitplanes unchanged.
- Keep pure parsing/geometry logic outside hardware-heavy C++ where it can be
  compiled by a host harness.
- Respect the current CODAL-only target declaration in `pxt.json`
  (`disablesVariants: ["mbdal"]`).
- Add any new `.cpp`, `.h`, `.ts`, or asset file to `pxt.json`; being present in
  the repository does not make a file part of the extension build.

`shims.d.ts` is a checked-in generated/API surface in PXT projects. Do not hand
invent declarations there to hide a mismatch between the TypeScript wrapper
and C++ implementation.

## Built-in and custom field editors

For a built-in picker, attach its shadow/field metadata to a parameter using a
known selector. Existing icon metadata shows the older direct field pattern;
new code should follow the conventions of the pinned target and MakeCode's
[block definition documentation](https://makecode.com/defining-blocks).

A custom editor needs a hidden identity/shadow block plus target support. The
current image block is the reference implementation:

```typescript
//% blockId=inkybit_draw_full_screen_image
//% block="draw image $data"
//% data.shadow=inkyimage_picker
export function drawFullScreenImage(data: Buffer): void {
    _drawFullScreenImage(data)
}

//% blockId=inkyimage_picker block="$image"
//% image.fieldEditor="inkyimage"
//% image.fieldOptions.decompileLiterals=true
//% image.fieldOptions.onParentBlock="true"
//% shim=TD_ID
//% blockHidden=1
//% duplicateShadowOnDrag
export function inkyimage_picker(image: Buffer = inkybitAllWhiteV1): Buffer {
    return image
}
```

Important contracts:

- `data.shadow` names the hidden shadow block's `blockId`.
- `image.fieldEditor` names the selector registered by `pxt-microbit`.
- `TD_ID` makes the shadow function an identity operation rather than a runtime
  feature.
- `decompileLiterals` allows serialized literals to round-trip back into the
  field.
- Cancel must preserve the original source value; Done commits one valid value;
  disposal must remove listeners and overlays.
- Unknown, malformed, or future serialized values must remain source-preserving
  rather than being silently replaced by a default.

Do not merge or publish a block that requires a new selector until that selector
is available in the target used by consumers. A development fork/preview proves
integration, but it is not the same as release in public MakeCode. Follow
[IMAGE_EDITOR_RELEASE.md](IMAGE_EDITOR_RELEASE.md) for the current image editor.

## IBIT v1 contract

The custom image value is a MakeCode `hex` tagged-template `Buffer` literal.
Its exact 7,510-byte layout is:

| Offset | Size | Meaning |
| --- | ---: | --- |
| 0 | 4 | ASCII magic `IBIT` |
| 4 | 1 | Version `1` |
| 5 | 1 | Row-major packed 2bpp encoding `1` |
| 6 | 2 | Little-endian width `250` |
| 8 | 2 | Little-endian height `120` |
| 10 | 7,500 | Four pixels per byte, most-significant pair first |

Pixel values are White `0`, Black `1`, Red `2`; `3` is invalid. Changing any
header, packing, colour, orientation, or dimension rule requires a new format
version plus coordinated encoder, decoder, field, fixture, persistence, and
hardware tests. Never reinterpret an existing version in place.

## Local setup and verification

The locked development toolchain is intentional:

- Node `22.23.1`
- npm `11.18.0`
- `pxt-microbit` `9.1.1`
- `pxt-core` `13.0.1`

Use the pinned versions; `.npmrc` makes engine mismatches fail early.

```sh
npm ci
npm run verify:default-image
npm run test:native-loader
npm run test:extension
```

What these prove:

- `verify:default-image` checks the canonical IBIT header, size, dimensions,
  and all-White payload.
- `test:native-loader` compiles a host C++ harness and verifies exact black/red
  bitplanes, invalid-colour no-mutation, and the null-buffer guard.
- `test:extension` configures the pinned local target, installs PXT dependencies,
  and compiles `test.ts` with the extension.

For an ordinary TypeScript block, `test:extension` is the minimum automated
gate. Native changes also require `test:native-loader` or an equivalent focused
host test. IBIT changes require all three commands. A field-backed block also
requires the sibling target's focused editor, integration, persistence,
capacity, preview-pin, and browser-smoke checks described in its
`DEVELOPMENT.md`.

Physical display behavior is a separate gate. Generate the current fixture
with `npm run fixture:hardware` and follow
[`fixtures/ibit-v1/HARDWARE.md`](../fixtures/ibit-v1/HARDWARE.md). Never infer a
hardware pass from compilation or the browser preview.

## Review checklist

- The block has a stable unique ID, clear wording, accessible enum labels, sane
  defaults, and intentional toolbox placement.
- TypeScript, block metadata, and any C++ shim agree on names, types, and
  defaults.
- Coordinates and dimensions distinguish the 250x122 driver API from the
  250x120 IBIT editor canvas.
- Drawing mutates buffers without an unexpected e-ink refresh.
- Invalid programmatic input is handled at runtime, not merely constrained by
  editor metadata.
- New compiled files are listed in `pxt.json`.
- `test.ts`, focused tests, README/API documentation, and release notes are
  updated in proportion to the change.
- Custom selectors are implemented and tested in the paired target before the
  consuming extension block is released.
- Automated, browser-preview, public-target, and physical-hardware evidence are
  reported as distinct gates.

## Further reference

- [MakeCode: defining blocks](https://makecode.com/defining-blocks)
- [MakeCode: `pxt.json`](https://makecode.com/extensions/pxt-json)
- [MakeCode: GitHub extension authoring](https://makecode.com/extensions/github-authoring)
- [MakeCode: shim generation and native APIs](https://makecode.com/simshim)
