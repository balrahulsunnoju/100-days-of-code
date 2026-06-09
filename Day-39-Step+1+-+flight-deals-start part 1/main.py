#This file will need to use the DataManager,FlightSearch, FlightData, NotificationManager classes to achieve the program requirements.
from datetime import datetime, timedelta
from pprint import pprint

import requests_cache

from notification_manager import NotificationManager
from data_manager import DataManager
from flight_data import find_cheapest_flight
from flight_search import FlightSearch

requests_cache.install_cache(
    "flights_cache",
    url_expire_after = {
        "*.sheety.co*":requests_cache.DO_NOT_CACHE,
        "*":3600
    }
)

data_manager = DataManager()
sheet_data = data_manager.get_destination()
notification_manager = NotificationManager()  # Fixed: Object instance initialized here

tomorrow = datetime.now() + timedelta(days=1)
six_month_from_today = datetime.now() + timedelta(days=6*30)

flight_search = FlightSearch()
for destination in sheet_data:
    flights = flight_search.check_flights(
        origin_city_code= "LHR",
        destination_city_code= destination["iataCode"],
        from_time=tomorrow,
        to_time=six_month_from_today
    )
    cheapest_flight = find_cheapest_flight(
        flights,
        return_date=six_month_from_today.strftime("%Y-%m-%d")
    )
    print(f"{destination['city']} : GBP {cheapest_flight.price}")

    #price evaluation
    if cheapest_flight.price != "N/A" and cheapest_flight.price < destination["lowestPrice"]:
        print(f" Lower price flight found to {destination['city']}!")

        data_manager.update_lowest_price(destination["id"],cheapest_flight.price)

        notification_manager.send_whatsapp(
            message_body=f"Low price alert! Only GBP {cheapest_flight.price} to fly "
                         f"from {cheapest_flight.origin_airport} to {cheapest_flight.destination_airport}, "
                         f"on {cheapest_flight.out_date} until {cheapest_flight.return_date}."
        )



