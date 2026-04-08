import os

print("const timelinePhotos = [")
names = []
for file in os.scandir(os.getcwd() + "/img"):
    names.append((int(file.name[4:file.name.index('.')]), file.name))
for i, (_,file) in enumerate(sorted(names, key=lambda x: x[0])):
    # print(_)
    print(f"{'{'} src: '../img/{file}', alt: 'pic {i}', caption: 'Photo {i}' {'}'},")
print("];")