import requests
from twilio.rest import Client
import os

OWN_ENDPOINT = "https://api.openweathermap.org/data/2.5/forecast"

MY_LAT = "33.748997"
MY_LONG = "-84.387985"

api_key = os.environ.get("OWM_API_KEY")
account_sid = os.environ.get("ACCOUNT_SID")
auth_token = os.environ.get("AUTH_TOKEN")

weather_parameters = {
    "lat": MY_LAT,
    "lon": MY_LONG,
    "appid": api_key,
    "cnt": 4,
}

response = requests.get(OWN_ENDPOINT, params=weather_parameters)
response.raise_for_status()

weather_data = response.json()

will_rain = True   # ✅ FIX

for hour_data in weather_data["list"]:
    condition_code = hour_data["weather"][0]["id"]
    if condition_code < 700:
        will_rain = True
        break

if will_rain:
    client = Client(account_sid, auth_token)

    message = client.messages.create(
        body="Bring an umbrella☔.",
        from_="whatsapp:+14155238886",
        to="whatsapp:+19375031529",
    )

    print(message.status)
else:
    print("No rain. No message sent.")
print("OWM:", api_key)
print("SID:", account_sid)
print("TOKEN:", auth_token)

