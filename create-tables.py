#!/usr/bin/env python3
import requests
import json
import os
from pathlib import Path

# Leer credenciales
env_file = Path('.env.local')
config = {}
with open(env_file, 'r') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            config[key] = value

SUPABASE_URL = config.get('VITE_SUPABASE_URL')
SERVICE_KEY = config.get('VITE_SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SERVICE_KEY:
    print("❌ Faltan credenciales en .env.local")
    print("Necesitas agregar VITE_SUPABASE_SERVICE_ROLE_KEY")
    exit(1)

# Leer el archivo SQL
sql_file = Path('supabase-schema.sql')
with open(sql_file, 'r') as f:
    sql_content = f.read()

print("🚀 Creando tablas en Supabase...")
print(f"URL: {SUPABASE_URL}")

# Ejecutar via API REST
response = requests.post(
    f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
    headers={
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json"
    },
    json={"query": sql_content}
)

print(f"Response: {response.status_code}")
print(response.text)
