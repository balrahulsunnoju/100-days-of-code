import turtle as t
import random



tim = t.Turtle()
screen = t.Screen()
t.colormode(255)
tim.shape("turtle")

tim.pensize(3)



def random_color():
    r = random.randint(0, 255)
    g = random.randint(0, 255)
    b = random.randint(0, 255)
    color = (r, g, b)
    return color


#
#
tim.speed("fastest")

def draw_spirograph(size):
    for _ in range( int(360 / size)):
        tim.color(random_color())
        tim.circle(100)
        tim.setheading(tim.heading() + size)
draw_spirograph(5)
screen.exitonclick()


