#ifndef PXT_INKYBIT_IBIT_DECODER_H
#define PXT_INKYBIT_IBIT_DECODER_H

#include <stddef.h>
#include <stdint.h>
#include <string.h>

namespace inkybit_ibit {

static const size_t ENCODED_LENGTH = 7510;
static const int LOGICAL_WIDTH = 250;
static const int LOGICAL_HEIGHT = 120;
static const int DRIVER_COLUMNS = 136;
static const int DRIVER_ROWS = 250;
static const int DRIVER_STRIDE = DRIVER_COLUMNS / 8;
static const int DRIVER_BUFFER_LENGTH = DRIVER_STRIDE * DRIVER_ROWS;
static const int DRIVER_Y_OFFSET = 6;

// Decode IBIT v1 directly into the two existing Inky:Bit driver bitplanes.
// Validation is completed before either destination is touched.
inline bool decode(const uint8_t *payload, size_t length,
                   uint8_t *black, uint8_t *red) {
    if (!payload || !black || !red || length != ENCODED_LENGTH) return false;
    if (payload[0] != 'I' || payload[1] != 'B' ||
        payload[2] != 'I' || payload[3] != 'T') return false;
    if (payload[4] != 1 || payload[5] != 1) return false;
    const uint16_t width = payload[6] | (payload[7] << 8);
    const uint16_t height = payload[8] | (payload[9] << 8);
    if (width != LOGICAL_WIDTH || height != LOGICAL_HEIGHT) return false;

    for (size_t i = 10; i < ENCODED_LENGTH; ++i) {
        if ((payload[i] & 0x03) == 0x03 ||
            (payload[i] & 0x0c) == 0x0c ||
            (payload[i] & 0x30) == 0x30 ||
            (payload[i] & 0xc0) == 0xc0) return false;
    }

    memset(black, 0xff, DRIVER_BUFFER_LENGTH);
    memset(red, 0x00, DRIVER_BUFFER_LENGTH);

    for (int y = 0; y < LOGICAL_HEIGHT; ++y) {
        for (int x = 0; x < LOGICAL_WIDTH; ++x) {
            const int pixelIndex = y * LOGICAL_WIDTH + x;
            const int byteOffset = 10 + (pixelIndex >> 2);
            const int bitShift = 6 - 2 * (pixelIndex & 3);
            const int colour = (payload[byteOffset] >> bitShift) & 0x03;

            const int driverY = DRIVER_COLUMNS - 1 - (y + DRIVER_Y_OFFSET);
            const int shift = 7 - (driverY & 7);
            const int offset = x * DRIVER_STRIDE + (driverY >> 3);
            const uint8_t mask = (uint8_t)(1 << shift);

            if (colour == 1) {
                black[offset] &= (uint8_t)~mask;
            } else if (colour == 2) {
                red[offset] |= mask;
            }
        }
    }
    return true;
}

} // namespace inkybit_ibit

#endif
