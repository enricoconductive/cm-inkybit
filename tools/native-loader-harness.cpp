#include <algorithm>
#include <fstream>
#include <iostream>
#include <iterator>
#include <vector>
#include "../ibit_decoder.h"

int main(int argc, char **argv) {
    if (argc != 4) return 2;
    std::ifstream input(argv[1], std::ios::binary);
    std::vector<uint8_t> encoded((std::istreambuf_iterator<char>(input)), {});
    std::vector<uint8_t> black(inkybit_ibit::DRIVER_BUFFER_LENGTH, 0x55);
    std::vector<uint8_t> red(inkybit_ibit::DRIVER_BUFFER_LENGTH, 0xaa);

    const std::vector<uint8_t> nullBeforeBlack = black;
    const std::vector<uint8_t> nullBeforeRed = red;
    if (inkybit_ibit::decode(nullptr, 0, black.data(), red.data())) return 6;
    if (black != nullBeforeBlack || red != nullBeforeRed) return 7;

    if (!inkybit_ibit::decode(encoded.data(), encoded.size(), black.data(), red.data())) return 3;
    std::ofstream(argv[2], std::ios::binary).write(
        reinterpret_cast<const char *>(black.data()), black.size());
    std::ofstream(argv[3], std::ios::binary).write(
        reinterpret_cast<const char *>(red.data()), red.size());

    encoded[10] |= 0xc0;
    const std::vector<uint8_t> beforeBlack = black;
    const std::vector<uint8_t> beforeRed = red;
    if (inkybit_ibit::decode(encoded.data(), encoded.size(), black.data(), red.data())) return 4;
    if (black != beforeBlack || red != beforeRed) return 5;
    return 0;
}
