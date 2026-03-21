FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

COPY . .

RUN python scripts/fetch_cot_api.py || echo "Fehler beim initialen Fetch, Container startet trotzdem"

EXPOSE 10000

CMD ["sh", "-c", "python scripts/fetch_cot_api.py && uvicorn app.main:app --host 0.0.0.0 --port 10000"]
