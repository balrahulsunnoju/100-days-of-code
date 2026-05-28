# import turtle
# from turtle import Turtle,Screen
#
# import pandas
#
# screen = Screen()
# screen.title("U.S State Guessing Game")
# image = ("blank_states_img.gif")
# screen.addshape(image)
# turtle.shape(image)
#
# data = pandas.read_csv("50_states.csv")
# all_states = data.state.to_list()
# guessed_states = []
#
# while len(guessed_states) < 50:
#     answer_state = screen.textinput(title=f"{len(guessed_states)}/50",
#                                     prompt="What's another state's name?")
#
#     if answer_state is None:
#         break
#
#     answer_state = answer_state.title()
#     if answer_state == "Exit":
#         missing_states = [state for state in all_states if state not in guessed_states]
#
#         new_data = pandas.DataFrame(missing_states)
#         new_data.to_csv("Missing_states.csv")
#         break
#
#
#
#     if answer_state in all_states and answer_state not in guessed_states:
#         guessed_states.append(answer_state)
#         t = Turtle()
#         t.hideturtle()
#         t.penup()
#         state_data = data[data.state == answer_state]
#         t.goto(state_data.x.item(),state_data.y.item())
#         t.write(state_data.state.item())
#
#
# screen.exitonclick()
#
# # numbers = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55]
# # squared_numbers = [num**2 for num in numbers]
# # print(squared_numbers)
# # list_of_strings = ['9', '0', '32', '8', '2', '8', '64', '29', '42', '99']
# # numbers = [int(num) for num in list_of_strings]
# # result =[num for num in numbers if num%2 == 0 ]
# # print(result)
#
student_dict = {
    "student": ["Angela","James","Lily"],
    "score": [56,76,98]
}

# for (key,value) in student_dict.items():
#     print(value)

import pandas

student_dataframe = pandas.DataFrame(student_dict)
print(student_dataframe)

# for (key,value) in student_dataframe.items():
#     print(value)

for (index,row) in student_dataframe.iterrows():
    if row.student == "Angela":
        print(row.score)