from twilio.rest import Client


import requests
import os

account_sid = os.getenv("TWILIO_SID")
auth_token = os.getenv("TWILIO_AUTH_TOKEN")
api_key = os.getenv("ALPHA_API_KEY")
api_key_news = os.getenv("NEWS_API_KEY")

STOCK = "TSLA"
COMPANY_NAME = "Tesla Inc"

## STEP 1: Use https://www.alphavantage.co
# When STOCK price increase/decreases by 5% between yesterday and the day before yesterday then print("Get News").


alpha_parameters = {
    "function":"TIME_SERIES_DAILY",
    "symbol":STOCK,
    "outputsize":"compact",
    "apikey":api_key,
    }

response = requests.get(url="https://www.alphavantage.co/query",params=alpha_parameters)
response.raise_for_status()
data = response.json()

if "Time Series (Daily)" not in data:
    print("Alpha Vantage Error:", data)
    exit()

time_series = data["Time Series (Daily)"]
dates = list(time_series.keys())
yesterday = dates[0]
day_before = dates[1]

y_close = float(time_series[yesterday]["4. close"])
day_before_close = float(time_series[day_before]["4. close"])

difference = y_close - day_before_close
percentage_change = (difference/day_before_close)* 100
print(percentage_change)

if abs(percentage_change) >= 5:

    url = "https://newsapi.org/v2/everything"
    news_parameters = {
        "q": COMPANY_NAME,
        "apiKey": api_key_news
    }

    response = requests.get(url, params=news_parameters)
    dataa = response.json()
    articles = dataa["articles"]
    top_articles = articles[:3]
    message_text = ""
    for article in top_articles:
        headline = article["title"]
        brief = article["description"]

        message_text += f"\nHeadline: {headline}\nBrief: {brief}\n"



        client = Client(account_sid, auth_token)

        message = client.messages.create(
            body=message_text,
            from_="whatsapp:+14155238886",
            to="whatsapp:+19375031529"
        )

    print(message.sid)
## STEP 2: Use https://newsapi.org
# Instead of printing ("Get News"), actually get the first 3 news pieces for the COMPANY_NAME. 

## STEP 3: Use https://www.twilio.com
# Send a seperate message with the percentage change and each article's title and description to your phone number. 


#Optional: Format the SMS message like this: 
"""
TSLA: 🔺2%
Headline: Were Hedge Funds Right About Piling Into Tesla Inc. (TSLA)?. 
Brief: We at Insider Monkey have gone over 821 13F filings that hedge funds and prominent investors are required to file by the SEC The 13F filings show the funds' and investors' portfolio positions as of March 31st, near the height of the coronavirus market crash.
or
"TSLA: 🔻5%
Headline: Were Hedge Funds Right About Piling Into Tesla Inc. (TSLA)?. 
Brief: We at Insider Monkey have gone over 821 13F filings that hedge funds and prominent investors are required to file by the SEC The 13F filings show the funds' and investors' portfolio positions as of March 31st, near the height of the coronavirus market crash.
"""


