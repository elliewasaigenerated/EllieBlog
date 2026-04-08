with open("ospec.txt", 'r') as f:
    lines = f.read().split('\n')
    for line in lines:
        line = line.replace("\"","\\\"")
        print(f'"{line}"')