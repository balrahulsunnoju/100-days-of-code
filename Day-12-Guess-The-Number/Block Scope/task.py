game_level = 10
enemies = ["Skeleton", "Zombie", "Alien"]

def create_enemy():
    new_enemy = ""
    if game_level < 15:
        new_enemy = enemies[0]
    print(new_enemy)

print(create_enemy())