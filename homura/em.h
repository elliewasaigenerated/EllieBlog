#include <emscripten/emscripten.h>
#include <string>

extern "C" {
    void new_game();
    int32_t evaluate_by_search(const char* fen);
    const char* best_move();
    void init();
    void destroy();
}