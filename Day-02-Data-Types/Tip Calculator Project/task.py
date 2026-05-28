
print("welcome to the tip calculator")
bill = float(input("What was your total bill?"))
tip = int(input("How much tip would you like to give? 10,12, or 15?"))
people = int(input("How many people to split the bill?"))
bill_with_tip = tip/100*bill+bill
bill_per_person = bill_with_tip/people
print(bill_per_person)