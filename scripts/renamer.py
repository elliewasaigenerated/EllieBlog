import os
from PIL import Image

import tkinter as tk
from PIL import Image, ImageTk

image_label = None
action_button = None
root = None
user_input = None

imgs = os.scandir(os.getcwd() + "/img")

def on_button_click():
    """Reads the content of the entry field and prints it to the console."""
    user_input = entry_field.get()
    print(f"User entered: {user_input}")

def add(path):
    # --- Add the image (using Pillow) ---
    # 1. Open the image file
    # Make sure you have an image file named 'example_image.png' in the same directory
    try:
        image = Image.open(path)
        # Resize the image if needed (optional)
        image = image.resize((200, 200), Image.Resampling.LANCZOS) 
        photo = ImageTk.PhotoImage(image)
    except FileNotFoundError:
        print(f"Error: '{path}.png' not found. Please add an image file.")
        # Create a blank image if file not found to prevent error
        photo = tk.PhotoImage() 

    # 2. Create a Label widget to display the image
    image_label = tk.Label(root, image=photo)
    image_label.pack(pady=10) # Add padding for better layout

    # 3. Keep a reference to the image object to prevent it from being garbage collected
    # This is a crucial step in Tkinter
    image_label.image = photo 

    return image

def looper():
    im = imgs[0]

    image = add(im.path)

    root.wait_variable(action_button)

    pth = im.path
    pth.replace(im.name, "")

    if user_input == "":
        root.after(10, looper)
        return

    image.save(f"{pth}IMG_{user_input}.jpg")
    imgs = imgs[1:] + imgs[:1]

    root.after(10, looper)

def sched():
    root.after(10, looper)

# --- Set up the main window ---
root = tk.Tk()
root.title("Image, Field, and Button Example")
root.geometry("300x400") # Set the window size

# --- Add the image (using Pillow) ---
# 1. Open the image file
# Make sure you have an image file named 'example_image.png' in the same directory
try:
    image = Image.open("example_image.png")
    # Resize the image if needed (optional)
    image = image.resize((200, 200), Image.Resampling.LANCZOS) 
    photo = ImageTk.PhotoImage(image)
except FileNotFoundError:
    print("Error: 'example_image.png' not found. Please add an image file.")
    # Create a blank image if file not found to prevent error
    photo = tk.PhotoImage() 

# 2. Create a Label widget to display the image
image_label = tk.Label(root, image=photo)
image_label.pack(pady=10) # Add padding for better layout

# 3. Keep a reference to the image object to prevent it from being garbage collected
# This is a crucial step in Tkinter
image_label.image = photo 

# --- Add the entry field ---
entry_field = tk.Entry(root, width=25)
entry_field.pack(pady=10)

# --- Add the button ---
action_button = tk.Button(root, text="Click Me", command=on_button_click)
action_button.pack(pady=10)

# --- Run the Tkinter event loop ---
root.mainloop()
new_dir = os.getcwd() + "/img"

# names = []
# for file in os.scandir(os.getcwd() + "/img"):
#     i = int(file.name[4:file.name.index('.')])
#     print(i)
#     if i <= 16 or i > 100:
#         continue
#     n = file.name
#     n = f"{n[:4]}{str(i + 1 if i < 25 else i + 2)}{n[file.name.index('.'):]}"
#     os.rename(os.getcwd() + f"/img/{file.name}", os.getcwd() + f"/img/{n}")
# os.rename(os.getcwd() + f"/img/IMG_161.JPG", os.getcwd() + f"/img/IMG_17.jpg")
# os.rename(os.getcwd() + f"/img/IMG_251.JPG", os.getcwd() + f"/img/IMG_25.jpg")