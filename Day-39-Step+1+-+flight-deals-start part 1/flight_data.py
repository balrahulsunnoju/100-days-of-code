class FlightData:

    def __init__(self, price, origin_airport, destination_airport, out_date, return_date):
        self.price = price
        self.origin_airport = origin_airport
        self.destination_airport = destination_airport
        self.out_date = out_date
        self.return_date = return_date


def find_cheapest_flight(data, return_date):
    if data is None or (not data.get("best_flights") and not data.get("other_flights")):
        print("--- No price available for flight. ---")
        return FlightData("N/A", "N/A", "N/A", "N/A", "N/A")

    # Combine both flights best and other
    all_flights = data.get("best_flights", []) + data.get("other_flights", [])

    # Data from first flight
    first_flight = all_flights[0]
    lowest_price = first_flight["price"]
    origin = first_flight["flights"][0]["departure_airport"]["id"]
    destination = first_flight["flights"][-1]["arrival_airport"]["id"]
    out_date = first_flight["flights"][0]["departure_airport"]["time"].split(" ")[0]

    cheapest_flight = FlightData(lowest_price, origin, destination, out_date, return_date)

    for flight in all_flights:
        try:
            price = flight["price"]
        except KeyError:
            print("--No price available for flight")
            continue  # Skip this flight if it doesn't have a price

        if price < lowest_price:
            lowest_price = price
            origin = flight["flights"][0]["departure_airport"]["id"]
            destination = flight["flights"][-1]["arrival_airport"]["id"]
            out_date = flight["flights"][0]["departure_airport"]["time"].split(" ")[0]

            # Update the attributes on our tracking object
            cheapest_flight.price = lowest_price
            cheapest_flight.origin_airport = origin
            cheapest_flight.destination_airport = destination
            cheapest_flight.out_date = out_date

    #  FIXED INDENTATION: Shifing this out of the loop ensures ALL flights are checked!
    return cheapest_flight