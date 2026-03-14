import requests, zipfile, io, os

# Ordner sicherstellen
os.makedirs("data", exist_ok=True)

# Aktuellstes COT ZIP (Beispiel: Futures Disaggregated)
url = "https://www.cftc.gov/files/dea/history/fut_disagg_txt_2024.zip"

r = requests.get(url)
z = zipfile.ZipFile(io.BytesIO(r.content))
z.extractall("data/")

txt_files = [f for f in os.listdir("data") if f.endswith(".txt")]
if not txt_files:
    raise FileNotFoundError("Keine TXT-Datei im ZIP gefunden!")

print(f"Gefundene COT Datei: {txt_files[0]}")
