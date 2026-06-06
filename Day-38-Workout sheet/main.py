import os
from datetime import datetime

import requests
APP_ID = os.environ["APP_ID"]
API_KEY = os.environ["API_KEY"]

USERNAME = os.environ["USERNAME"]
PASSWORD = os.environ["PASSWORD"]

WEIGHT = 110
HEIGHT = 175
AGE = 25
GENDER = "male"
Nutri_url = "https://app.100daysofpython.dev/v1/nutrition/natural/exercise"

headers = {
    "x-app-id":APP_ID,
    "x-app-key":API_KEY,
}
sheety_url = os.environ["SHEETY_ENDPOINT"]
exercise_text = input("Tell me which exercises you did:")
parameters = {
        "query": exercise_text,
        "weight_kg": WEIGHT,
        "height_cm": HEIGHT,
        "age": AGE,
        "gender": GENDER,

}
response = requests.post(url = Nutri_url,json=parameters,headers=headers)
response.raise_for_status()
data = response.json()

today_date = datetime.now().strftime("%d/%m/%Y")
now_time = datetime.now().strftime("%X")

for exercise in data["exercises"]:
    sheet_inputs = {
        "workout":{
            "date":today_date,
            "time":now_time,
            "exercise": exercise["name"].title(),
            "duration": exercise["duration_min"],
            "calories": exercise["nf_calories"],
        }

    }
    sheet_response = requests.post(url=sheety_url,
                                   json=sheet_inputs,
                                   auth=(USERNAME,
                                            PASSWORD,
                                         )

        )

    print(sheet_response.text)




