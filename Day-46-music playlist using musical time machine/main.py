from logging import exception

import requests
from bs4 import BeautifulSoup
from ytmusicapi import YTMusic

date = input("Which year do you want to travel to? Type the date in this format YYYY-MM-DD: ")
URL = f"https://appbrewery.github.io/bakeboard-hot-100/{date}/"

response = requests.get(url=URL)

soup = BeautifulSoup(response.text, "html.parser")
song_names = [tag.getText().strip() for tag in soup.select("h3.chart-entry__title")]
print(song_names)


yt = YTMusic("browser.json")

PLAYLIST_NAME = f"{date} Billboard 100"

playlist_id = None
playlists = yt.get_library_playlists()

for p in playlists:
    if p["title"] == PLAYLIST_NAME:
        playlist_id = p["playlistId"]
        break

if playlist_id:
    print("This playlist already exists")

else:
    playlist_id = yt.create_playlist(
        PLAYLIST_NAME,
        f"Playlist with the hottest songs from {date}",
        privacy_status = "PRIVATE"
    )
    print("Playlist created")

for song in song_names:
    try:
        search_results = yt.search(song,filter="songs",limit =1)
        yt.add_playlist_items(playlist_id,[search_results[0]["videoId"]])
        print(f"Added: {song}")

    except exception as e:
        print(f"skipped: {song} | Reason : {e}")


