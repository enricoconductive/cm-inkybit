# Physical Ticket 05 fixture

This is an explicit user-action gate. No physical result is recorded until a
micro:bit V2 and Inky:Bit have been observed by a person.

## Generate and flash

1. From this repository, run `node tools/generate-hardware-fixture.mjs > /tmp/inkybit-ticket-05.ts`.
2. Open the pinned self-hosted MakeCode preview documented by `cm-microbit-platform`.
3. Create a new project, add the Inky:Bit extension at the extension revision
   recorded in that target's `inkybit-toolchain.json`, switch to JavaScript,
   and replace `main.ts` with `/tmp/inkybit-ticket-05.ts`.
4. Compile for micro:bit V2. Flash the downloaded program to a micro:bit V2
   connected to an Inky:Bit. Do not insert another `display your changes`
   block: the fixture deliberately refreshes once, after every buffer edit.

## Required observations

Record pass/fail plus a photograph for each item:

- The top half has vertical Black, White, and Red bands, left to right.
- The lower section is a mixed Black/Red checker pattern; no fourth colour or
  dropped cells appear.
- The asymmetric marks put a small Red L at the logical top-left and a Black
  pixel at the logical bottom-right. The top edge is Black and bottom edge Red.
- The alternating one-pixel line is visible across the centre without a
  one-row or one-column shift.
- A White rectangle containing Black `ORDER` text overlays the Black band.
  This proves `draw image`, later drawing blocks, and one final display refresh
  respect buffer order.
- No stale pixels remain in the two controller-only rows outside the logical
  250x120 editor area.

If any orientation, colour, edge, or order check fails, preserve the photo and
the generated TypeScript, report the hardware/firmware revision, and do not
mark Ticket 05 physical verification complete.
