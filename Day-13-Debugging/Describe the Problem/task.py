def my_function():
    for i in range(1, 20):
        if i == 20:
            print("You got it")


my_function()

# Describe the Problem - Write your answers as comments:
# 1. What is the for loop doing?
#The for loop is iterating through numbers starting from 1 up to 19
# 2. When is the function meant to print "You got it"?
#the function i smeant to print "you got it" when the value of i becomes 20
# 3. What are your assumptions about the value of i?
#the assumption is tat i will reach 20 during for loop but in reality i never equalls to 20 as we mentioned the range from 1 to 19 as 20 not included, so the condition is never true
