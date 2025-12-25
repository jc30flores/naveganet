import os
from dotenv import load_dotenv
import psycopg2


def main():
    load_dotenv(dotenv_path=os.path.join('backend', '.env'), override=True)
    dbname = os.getenv('DB_NAME', 'coloso')
    user   = os.getenv('DB_USER', 'jarvis')
    pwd    = os.getenv('DB_PASSWORD', 'diez2030')
    host   = os.getenv('DB_HOST', 'localhost')
    port   = os.getenv('DB_PORT', '5432')

    print(f"[init-db] Conectando a {dbname} como {user}@{host}:{port} ...")
    conn = psycopg2.connect(dbname=dbname, user=user, password=pwd, host=host, port=port)
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute("SELECT version();")
    print("[init-db] PostgreSQL:", cur.fetchone()[0])

    schema_path = os.path.join('sql', 'colosso_schema.sql')
    with open(schema_path, 'r', encoding='utf-8') as f:
        sql = f.read()

    print("[init-db] Ejecutando esquema ...")
    cur.execute(sql)
    print("[init-db] ✅ Esquema ejecutado con éxito (idempotente).")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
