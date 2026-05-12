from tkinter import *



window = Tk()
window.title("Mile to Km Converter")
window.minsize(height=200,width=400)
window.config(padx=20,pady=20)

def convert():
    miless = float(miles_input.get())
    km = miless * 1.609
    km_result.config(text=km)
#label
my_label = Label(text="is equal to", font="Ariel")
my_label.grid(column = 0,row = 1)
my_label.config(padx=10,pady=10)

#milesinput

miles_input = Entry(width = 15)
miles_input.grid(column = 1, row = 0)

#miles text
miles = Label(text="Miles",font="Ariel")
miles.grid(column = 2, row =0)
miles.config(padx=10,pady=10)

#result
km_result = Label(text="0")
km_result.grid(column=1, row=1)

#kmtext
Km = Label(text="Km",font="Ariel")
Km.grid(column = 2, row =1)
Km.config(padx=10,pady=10)

#button
button = Button(text="Calculate", command=convert)
button.grid(column=1, row=2)


window.mainloop()