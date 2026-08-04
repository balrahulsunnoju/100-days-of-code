import requests
from bs4 import BeautifulSoup
from requests_cache import utf8_encoder

URL = "https://web.archive.org/web/20200518073855/https://www.empireonline.com/movies/features/best-movies-2/"

# Write your code below this line 👇

response = requests.get(URL)
website_html = response.text

soup = BeautifulSoup(website_html,"html.parser")
all_movies_list = soup.find_all(name="h3",class_="title")
movies_titles = [movie.getText() for movie in all_movies_list]
movies = movies_titles[::-1]

with open("movies.txt",mode="w",encoding="utf-8") as file:
    for movie in movies:
        file.write(f"{movie}\n")