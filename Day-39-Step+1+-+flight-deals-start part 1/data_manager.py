import os

import requests
from dotenv import load_dotenv
from requests.auth import HTTPBasicAuth

load_dotenv()
SHEETY_ENDPOINT  = "https://api.sheety.co/1aaf2607cb9aeab4339fadf4ade768b4/copyOfFlightDeals11/prices"
class DataManager:
    #This class is responsible for talking to the Google Sheet.
    def __init__(self):
        self.user = os.environ["SHEETY_USERNAME"]
        self.password = os.environ["SHEETY_PASSWORD"]
        self.authorization = HTTPBasicAuth(self.user,self.password)
        self.destination_data = {}

    def get_destination(self):
        response = requests.get(url =SHEETY_ENDPOINT,auth=self.authorization)
        data = response.json()
        self.destination_data = data["prices"]
        return self.destination_data

    def update_lowest_price(self, row_id, new_price):
        new_data = {
            "price": {
                "lowestPrice": new_price
            }
        }
        requests.put(
            url=f"{SHEETY_ENDPOINT}/{row_id}",
            json=new_data,
            auth=self.authorization
        )