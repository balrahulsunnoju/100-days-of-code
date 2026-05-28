import datetime as dt
import smtplib

import random

now = dt.datetime.now()
current_day = now.weekday()
print(current_day)
# email = "rahulsunnoju5@gmail.com"
# password = "jgpq xqav ylmy skdh"
#
# with open("quotes.txt","r") as file:
#     quotes = file.read().splitlines()
#     random_quote = random.choice(quotes)
# if current_day == 2:
#     with smtplib.SMTP("smtp.gmail.com",port=587) as connection:
#         connection.starttls()
#         connection.login(user=email,password=password)
#         connection.sendmail(from_addr=email,
#                             to_addrs="rahulsunnoju@yahoo.com",
#                             msg=f"Subject:Wednesday Motivation\n\n{random_quote}")

