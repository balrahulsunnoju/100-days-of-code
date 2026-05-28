import time
from turtle import Screen
from player import Player,FINISH_LINE_Y
from car_manager import CarManager
from scoreboard import Scoreboard

screen = Screen()
screen.setup(width=800,height=600)
screen.title("Turtle Crossing")
screen.tracer(0)
car_manager = CarManager()
player = Player()
scoreboard = Scoreboard()


screen.listen()
screen.onkey(player.go_up,"Up")
game_is_on = True
while game_is_on:
    screen.update()
    time.sleep(0.1)
    car_manager.create_car()
    car_manager.move_car()

    #detect collide with car
    for car in car_manager.all_cars:
        if player.distance(car) < 20:
            scoreboard.game_over()
            game_is_on = False

    #detect next level
    if player.ycor() > FINISH_LINE_Y:
        scoreboard.increase_level()
        player.reset_position()
        car_manager.start_move += car_manager.move_speed



screen.exitonclick()