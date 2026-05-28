import random
from tkinter import *

import pandas

BACKGROUND_COLOR = "#B1DDC6"

try:
    data = pandas.read_csv("data/words_to_learn.csv")
except FileNotFoundError:
    data = pandas.read_csv("data/french_words.csv")
to_learn = data.to_dict(orient="records")
current_card = {}

def next_card():
    global current_card,flip_timer
    window.after_cancel(flip_timer)
    current_card = random.choice(to_learn)
    canvas.itemconfig(title,text="French",fill = "black")
    canvas.itemconfig(word,text=current_card["French"],fill = "black")
    canvas.itemconfig(card_background,image=front_image)
    flip_timer = window.after(3000,func=flip_card)

def flip_card():
    canvas.itemconfig(title,text="English",fill="white")
    canvas.itemconfig(word,text=current_card["English"],fill="white")
    canvas.itemconfig(card_background,image=back_image)

def is_known():
    to_learn.remove(current_card)

    data = pandas.DataFrame(to_learn)
    data.to_csv("data/words_to_learn.csv",index = False)
    next_card()

window = Tk()
window.title("Flashy")
window.config(padx=50,pady=50,bg=BACKGROUND_COLOR)
flip_timer = window.after(3000, func=flip_card)

canvas = Canvas(width=800,height=600,bg=BACKGROUND_COLOR,highlightthickness=0)
front_image = PhotoImage(file="images/card_front.png")
back_image = PhotoImage(file="images/card_back.png")
card_background = canvas.create_image(400,256,image=front_image)
title = canvas.create_text(400,150,text="title",fill="black",font=("Ariel",24,"italic"))
word = canvas.create_text(400,250,text="word",fill ="black",font=("Ariel",60,"bold"))

canvas.grid(column=0,row=0,columnspan=2)

wrong_image = PhotoImage(file="images/wrong.png")
unknown_button = Button(image=wrong_image,highlightthickness=0,command=next_card)
unknown_button.grid(column=0,row=1)

right_image = PhotoImage(file="images/right.png")
known_button = Button(image=right_image,highlightthickness=0,command=is_known)
known_button.grid(column=1,row=1)


next_card()

window.mainloop()