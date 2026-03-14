# Liste aller eindeutigen Assets für Dropdown
@app.get("/assets")
def get_assets():
    csv_path = "data/cot_data.csv"
    df = pd.read_csv(csv_path)
    assets = sorted(df['Market'].dropna().unique())
    return assets

# Liste aller eindeutigen Trader-Typen für Dropdown
@app.get("/traders")
def get_traders():
    csv_path = "data/cot_data.csv"
    df = pd.read_csv(csv_path)
    traders = sorted(df['Trader_Type'].dropna().unique())
    return traders

# Daten für ausgewähltes Asset + Trader-Typ
@app.get("/data")
def get_cot_data(asset: str = None, trader: str = None):
    csv_path = "data/cot_data.csv"
    df = pd.read_csv(csv_path)
    
    if asset:
        df = df[df['Market'].str.contains(asset, case=False, na=False)]
    if trader:
        df = df[df['Trader_Type'].str.contains(trader, case=False, na=False)]

    return JSONResponse(df.to_dict(orient="records"))
