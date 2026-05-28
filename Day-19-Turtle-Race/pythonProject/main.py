
import random
from turtle import Turtle,Screen

screen = Screen()
screen.setup(width=500,height=400)
user_bet = screen.textinput(title="Make your bet", prompt="Which turtle will win the race.Enter the color?:")
colors =["red", "blue", "orange", "yellow", "purple", "pink"]
y_postions = [-70, -40, -10, 40, 70, 100]
all_turtles = []
is_game_on = False
for index in range(0,6):
    new_turtle = Turtle(shape="turtle")
    new_turtle.penup()
    new_turtle.color(colors[index])
    new_turtle.goto(x=-230, y=y_postions[index])
    all_turtles.append(new_turtle)

if user_bet:
    user_bet = user_bet.lower()
    is_game_on = True
while is_game_on:
    for turtles in all_turtles:
        rand_distance = random.randint(0, 10)
        turtles.forward(rand_distance)

        if turtles.xcor() > 230:
            is_game_on = False
            winning_color = turtles.pencolor()
            if winning_color == user_bet:

                print(f"You've won!.The {winning_color} turtle is the winner")
            else:
                print(f"You've lost.The {winning_color} turtle is the winner")



screen.exitonclick()