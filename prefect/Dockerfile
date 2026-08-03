FROM python:3.11-slim

WORKDIR /app

# Instala as dependências
RUN pip install --no-cache-dir prefect requests psycopg2-binary pandas

COPY . .

CMD ["python", "main.py"]