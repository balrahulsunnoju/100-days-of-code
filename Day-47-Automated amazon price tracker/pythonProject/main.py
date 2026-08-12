import smtplib

import requests
from bs4 import BeautifulSoup
import os
from dotenv import load_dotenv
URl = "https://www.amazon.com/Tissot-Powermatic-Swiss-Automatic-T1374073304100/dp/B0F6DB94L1/ref=sr_1_36?crid=1HQ0FIJVA70ZV&dib=eyJ2IjoiMSJ9.ZxfSZfmLNwK1NX9Y-TdKXsZ_YYh-kXZ91buR7LtSaVSeyHfINO2QKDL_VulK1WMAY_SrHJ67sKxEpS-Bif0j_tK7n9iAD26ACSnrG9D7_rL4BmowkiTlpbubVRIy_NWqPRvx4ik1TexTU3qEFxn3Rru0QPyWBIPq2g01VFQUiZ_LBeMtdyIc8JsFfnpWPQgZ4TLoRZssYpVFfD-yV6nyGF-5auhB-7YyRggLShzT56OLh_k1I-Rq2f_C0relffF_zXQrhkt6Ygv7ECao4Yk-Lb1LtHJuvEGE3XDcy4lsSEA.PZ7D0Cn93TIwePtQWrGgl7HyyPCR91b7AaYyw1HSe1U&dib_tag=se&keywords=tissot+watch&qid=1786558583&sprefix=tissot+watch%2Caps%2C197&sr=8-36"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
}

load_dotenv()
My_Email = os.getenv("MY_EMAIL")
My_password = os.getenv("MY_PASSWORD")

response = requests.get(URl,headers=headers)

soup = BeautifulSoup(response.text,"html.parser")
price = soup.find(class_="a-price-whole").get_text()


#remove dollar sign
price_without_currency = price.split("$")[0]


#convert to floating point number
price_as_float = float(price_without_currency)
print(price_as_float)

#send an email

title = soup.find(id="productTitle").getText().strip()
print(title)

#set the price below of my your choice
Buy_price = 900.0

if price_as_float < Buy_price:
    message = f"{title} is on sale for{price}!"

    with smtplib.SMTP("smtp.gmail.com", port=587) as connection:
        connection.starttls()
        connection.login(user=My_Email,password=My_password)
        connection.sendmail(from_addr=My_Email,
                            to_addrs="rahulsunnoju2@gmail.com",
                            msg=f"Subject:Amazon Price Alert!\n\n{message}\n{URl}".encode("utf-8")
                            )