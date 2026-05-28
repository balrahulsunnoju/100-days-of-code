##################### Extra Hard Starting Project ######################
import pandas
import datetime as dt
import random
import smtplib


data = pandas.read_csv("birthdays.csv")

email = "rahulsunnoju5@gmail.com"
password = "jgpq xqav ylmy skdh"


today = dt.datetime.now()
today_day = today.day
today_month = today.month



for index,row in data.iterrows():


    if today_day == row["day"] and today_month == row["month"]:
        letter_num = random.randint(1,3)

        with open(f"letter_templates/letter_{letter_num}.txt") as file:
            f1 = file.read()

        final_letter = f1.replace("[NAME]",row["name"])

        with smtplib.SMTP("smtp.gmail.com", port=587) as connection:
            connection.starttls()
            connection.login(user=email,password=password)
            connection.sendmail(from_addr=email,
                                to_addrs=row["email"],
                                msg=f"Subject:Birthday Wishes\n\n{final_letter}")

# 1. Update the birthdays.csv
# 2. Check if today matches a birthday in the birthdays.csv


# 3. If step 2 is true, pick a random letter from letter templates and replace the [NAME] with the person's actual name from birthdays.csv

# 4. Send the letter generated in step 3 to that person's email address.




