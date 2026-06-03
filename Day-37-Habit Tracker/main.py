from datetime import datetime
import os
today = datetime.now()
current_date = today.strftime("%Y%m%d")

import requests
USERNAME = "rahulsun"
Token = os.getenv("TOKEN")
pixela_endpoint = "https://pixe.la/v1/users"
GRAPH_ID ="graph11"

user_parameters = {
    "token":Token,
    "username":"rahulsun",
    "agreeTermsOfService":"yes",
    "notMinor":"yes"
}
graph_endpoint = f"{pixela_endpoint}/{USERNAME}/graphs"
graph_config = {
    "id":GRAPH_ID,
    "name":"Cycling graph",
    "unit":"km",
    "type":"float",
    "color":"shibafu",
}
headers = {
    "X-USER-TOKEN":Token
}

pixel_creation_endpoint = f"{pixela_endpoint}/{USERNAME}/graphs/{GRAPH_ID}"

pixel_data ={
    "date": current_date,
    "quantity":input("How many kilometers did you cycle today?:"),
}
response = requests.post(url=pixel_creation_endpoint,json=pixel_data,headers=headers)
print(response.text)

pixel_delete_endpoint = f"{pixela_endpoint}/{USERNAME}/graphs/{GRAPH_ID}/{current_date}"

pixel_delete = {
    "quantity":"4.20"

}
# response =requests.delete(url=pixel_delete_endpoint,json=pixel_delete,headers=headers)
# print(response.text)