from datetime import datetime, timedelta
from pprint import pprint
import requests_cache

from data_manager import DataManager
from flight_data import find_cheapest_flight
from flight_search import FlightSearch
from notification_manager import NotificationManager

# ==================== Conserve requests and preserve your free plan ====================
requests_cache.install_cache(
    "flight_cache",
    urls_expire_after={
        "*.sheety.co*": requests_cache.DO_NOT_CACHE,
        "*": 3600,
    }
)

# ==================== Setup ====================
data_manager = DataManager()
sheet_data = data_manager.get_destination_data()

# ==================== Retrieve your customer emails ====================
customer_data = data_manager.get_customer_emails()
# Verify the name of your email column in your sheet. Yours may be different from mine
customer_email_list = [row["whatIsYourEmail?"] for row in customer_data]

flight_search = FlightSearch()
# Create an instance of the NotificationManager
notification_manager = NotificationManager()

# ==================== Set the Dates and Origin Airport ====================
tomorrow = datetime.now() + timedelta(days=1)
six_month_from_today = datetime.now() + timedelta(days=(6 * 30))
ORIGIN_CITY_IATA = "LHR"  # London Heathrow

# ==================== Find Cheap Flights ====================
for destination in sheet_data:
    pprint(f"Getting flights for {destination['city']}...")

    # 1. First, look for a direct flight
    flights = flight_search.check_flights(
        ORIGIN_CITY_IATA,
        destination["iataCode"],
        from_time=tomorrow,
        to_time=six_month_from_today
    )
    cheapest_flight = find_cheapest_flight(flights, return_date=six_month_from_today.strftime("%Y-%m-%d"))
    pprint(f"{destination['city']}: GBP {cheapest_flight.price}")

    # 2. Smart Fallback: If direct is "N/A", search for indirect flights instead
    if cheapest_flight.price == "N/A":
        print(f"No direct flight to {destination['city']}. Looking for indirect flights...")
        stopover_flights = flight_search.check_flights(
            ORIGIN_CITY_IATA,
            destination["iataCode"],
            from_time=tomorrow,
            to_time=six_month_from_today,
            is_direct=False
        )
        cheapest_flight = find_cheapest_flight(stopover_flights, return_date=six_month_from_today.strftime("%Y-%m-%d"))
        print(f"Cheapest indirect flight price is: GBP {cheapest_flight.price}")

    # 3. Guard Clause: If BOTH searches returned "N/A", completely skip this city
    if cheapest_flight.price == "N/A":
        print(f"No flight options available at all for {destination['city']}. Skipping alert.\n")
        continue

    # 4. Budget & Deal Check: Only notify if the found price is CHEAPER than your spreadsheet target
    if cheapest_flight.price < destination["lowestPrice"]:
        print(f"🔥 Deal found for {destination['city']}! Sending club alerts...")

        # Format the notification message
        alert_message = (
            f"Low price alert! Only GBP {cheapest_flight.price} to fly "
            f"from {cheapest_flight.origin_airport} to {cheapest_flight.destination_airport}, "
            f"on {cheapest_flight.out_date} until {cheapest_flight.return_date}."
        )

        # Send WhatsApp alert (or SMS/Twilio backend)
        notification_manager.send_whatsapp(message_body=alert_message)

        # Broadcast emails to your registered Flight Club subscriber list
        notification_manager.send_emails(email_list=customer_email_list, email_body=alert_message)

        # Update the lowest price row in your sheet with the new deal benchmark
        data_manager.update_lowest_price(row_id=destination["id"], new_price=cheapest_flight.price)

    else:
        print(f"Flight found for {destination['city']} (GBP {cheapest_flight.price}), "
              f"but it is not lower than your target budget (GBP {destination['lowestPrice']}).\n")