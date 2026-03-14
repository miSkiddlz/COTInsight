import requests, zipfile, io, os

# Stelle sicher, dass data/ existiert
os.makedirs("data", exist_ok=True)

# URL zum COT ZIP (Beispiel für Futures)
url = "https://www.cftc.gov/files/dea/history/fut_disagg_txt_2024.zip"

r = requests.get(url)
z = zipfile.ZipFile(io.BytesIO(r.content))
# Entpacke direkt in data/
z.extractall("data/")

print("COT Daten heruntergeladen und in 'data/' entpackt.")
