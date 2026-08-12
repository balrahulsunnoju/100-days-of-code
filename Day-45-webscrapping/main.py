from idlelib.iomenu import encoding

import requests
from bs4 import BeautifulSoup
from requests_cache import utf8_encoder

URL = "https://web.archive.org/web/20200518073855/https://www.empireonline.com/movies/features/best-movies-2/"

# Write your code below this line 👇

response = requests.get(URL)
html = response.text

soup = BeautifulSoup(html,"html.parser")
all_movies_list = soup.find_all(name = "h3", class_ = "title")
movie_title = [movie.getText() for movie in all_movies_list]
movies = movie_title[::-1]

#create movie text file
with open("movie.txt",mode="w",encoding="utf-8")as file:
    for movie in movies:
        file.write(f"{movie}\n")
    print("successfully created 100 movies")
