from textwrap import indent
from tkinter import *
from tkinter import messagebox
from random import choice, randint, shuffle, sample
import pyperclip
import json


# ---------------------------- PASSWORD GENERATOR ------------------------------- #
def generate_password():
    letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
    numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
    symbols = ['!', '#', '$', '%', '&', '(', ')', '*', '+']

    password_letters = [choice(letters) for _ in range(randint(8,10))]
    password_numbers = [choice(numbers) for _ in range(randint(2,4))]
    password_symbols = [choice(symbols) for _ in range(randint(2,4))]

    password_list = password_letters + password_numbers + password_symbols
    shuffle(password_list)

    password = "".join(password_list)
    pass_entry.delete(0,END)
    pass_entry.insert(0,password)
    pyperclip.copy(password)


#__________________Find password_________________________
def find_password():
    web = website_entry.get()

    try:
        with open("data.json","r") as data_file:
            data = json.load(data_file)
    except FileNotFoundError:
        messagebox.showinfo(title="Error",message="No data file found")
    else:

        if web in data:
            email = data[web]["email"]
            password = data[web]["password"]
            messagebox.showinfo(title=web, message=f"Email:{email}\nPassword:{password}")

        else:
            messagebox.showinfo(title="Not Found", message=f"{web} info doesnt exist")


# ---------------------------- SAVE PASSWORD ------------------------------- #
def save():
    website = website_entry.get()
    email = email_entry.get()
    password = pass_entry.get()
    new_data = {
        website:{
            "email":email,
            "password":password
        }
    }

    if len(website) == 0 or len(email) == 0 or len(password) == 0:
        messagebox.showinfo(title="Error",message="You have left some fields empty")
    else:
        try:
            with open("data.json","r") as data_file:
                data = json.load(data_file)

        except FileNotFoundError:
            with open("data.json", "w") as data_file:
                json.dump(new_data, data_file, indent=4)
        else:
            data.update(new_data)
            with open("data.json","w") as data_file:
                json.dump(data,data_file,indent=4)

        finally:
            website_entry.delete(0,END)
            pass_entry.delete(0,END)


# ---------------------------- UI SETUP ------------------------------- #

window = Tk()
window.title("Password Manager")
window.config(padx=20,pady=20)
canvas = Canvas(width=200,height=200)
pass_img = PhotoImage(file="logo.png")
canvas.create_image(100,100,image=pass_img)
canvas.grid(column=1,row=0)

website_text = Label(text="Website:")
website_text.grid(column=0,row=1)

website_entry = Entry(width=36,highlightthickness=0)
website_entry.grid(column=1,row=1,columnspan=1)
website_entry.focus()

search_button = Button(text="Search",width=15,highlightthickness=0,command=find_password)
search_button.grid(column=2,row=1,columnspan=1)

email_username_text = Label(text="Email/Username:")
email_username_text.grid(column=0,row=2)

email_entry = Entry(width =56,highlightthickness=0)
email_entry.grid(column=1,row=2,columnspan=2)
email_entry.insert(0,"someone@gmail.com")

pass_text = Label(text="Password:")
pass_text.grid(column=0,row=3)

pass_entry = Entry(width = 36,highlightthickness=0)
pass_entry.grid(column=1,row=3)

gen_pass_button = Button(text="Generate Password",highlightthickness=0,command=generate_password)
gen_pass_button.grid(column=2,row=3,columnspan=2)

add_button = Button(text="add",width=15,highlightthickness=0,command=save)
add_button.grid(column=1,row=4,columnspan=2)


window.mainloop()
