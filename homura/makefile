CC = em++
STD = -std=c++2a
CFLAGS = $(STD)

ifeq ($(debug), 1)
	CFLAGS += -gdwarf-4 -Wall -mpopcnt -mbmi2 -m64
else
	CFLAGS += -s INVOKE_RUN=0 -g -gdwarf-4 -fdebug-prefix-map=/mnt/c/users/evcmo/homuradev/Homura/src=. -O0 --profiling-funcs --memoryprofiler -pthread -s PTHREAD_POOL_SIZE=4 -s ASYNCIFY -s ALLOW_MEMORY_GROWTH=1 -s EXPORTED_FUNCTIONS=ccall,cwrap,_evaluate_by_search,_new_game,_init,_destroy,UTF8ToString -pipe -Wall -flto -DNDEBUG
endif

O = main.o analyzer.o ChaosMagic.o MoveMake.o Zobrist.o Backtrack.o Rollout.o

cc0: $(O)
	$(CC) $(CFLAGS) -o cc0.js $(O)

main.o: main.cpp Rollout.h Fen.h analyzer.h
	$(CC) $(CFLAGS) -c main.cpp

ChaosMagic.o: ChaosMagic.cpp ChaosMagic.h
	$(CC) $(CFLAGS) -c ChaosMagic.cpp

MoveMake.o: MoveMake.cpp MoveMake.h Zobrist.h ChaosMagic.h
	$(CC) $(CFLAGS) -c MoveMake.cpp

Zobrist.o: Zobrist.cpp Zobrist.h
	$(CC) $(CFLAGS) -c Zobrist.cpp

Backtrack.o: Backtrack.cpp Backtrack.h 
	$(CC) $(CFLAGS) -c Backtrack.cpp

Rollout.o: Rollout.cpp Rollout.h Backtrack.h
	$(CC) $(CFLAGS) -c Rollout.cpp

analyzer.o: analyzer.cpp analyzer.h
	$(CC) $(CFLAGS) -c analyzer.cpp

clean:
	rm *.o *.js, *.wasm