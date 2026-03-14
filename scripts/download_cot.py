import requests, zipfile, io

url = "https://www.cftc.gov/files/dea/history/fut_disagg_txt_2024.zip"
r = requests.get(url)
z = zipfile.ZipFile(io.BytesIO(r.content))
z.extractall("data/")
print("COT Daten heruntergeladen und entpackt.")
