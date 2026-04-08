import os

for file in os.scandir(os.getcwd() + "/img"):
    i = int(file.name[4:file.name.index('.')])
    path = file.path.replace(file.name, "")
    os.rename(file.path, path + f"IMG_{i:03}.jpg")