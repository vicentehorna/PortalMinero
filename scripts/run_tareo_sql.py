"""Ejecuta sql/tareo_diario_tables.sql y opcionalmente siembra códigos por compañía."""
import os
import re
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

load_dotenv(ROOT / '.env')

from database import DatabaseConfig, TAREO_CODIGOS_DEFAULT  # noqa: E402
import pyodbc  # noqa: E402


def seed_company_codes(cur, company):
    cia = str(company or '').strip()
    if not cia:
        return 0
    inserted = 0
    for codigo, descripcion, orden in TAREO_CODIGOS_DEFAULT:
        cur.execute(
            """
            IF NOT EXISTS (SELECT 1 FROM Tareo_Codigo WHERE Company = ? AND Codigo = ?)
            INSERT INTO Tareo_Codigo (Company, Codigo, Descripcion, Orden, Activo)
            VALUES (?, ?, ?, ?, 1)
            """,
            (cia, codigo, cia, codigo, descripcion, orden),
        )
        inserted += cur.rowcount
    return inserted


def main():
    target_db = (sys.argv[1] if len(sys.argv) > 1 else os.getenv('SQL_DATABASE', 'hm_safari')).strip()
    seed_company = (sys.argv[2] if len(sys.argv) > 2 else '').strip()

    sql_path = ROOT / 'sql' / 'tareo_diario_tables.sql'
    raw = sql_path.read_text(encoding='utf-8')
    raw = raw.replace(
        "-- IF NOT EXISTS (SELECT 1 FROM SY_UserProfile WHERE UserID = N'vhorna' AND Profile = N'TAREO')\n"
        "--     INSERT INTO SY_UserProfile (UserID, Profile) VALUES (N'vhorna', N'TAREO');",
        "IF NOT EXISTS (SELECT 1 FROM SY_UserProfile WHERE UserID = N'vhorna' AND Profile = N'TAREO')\n"
        "    INSERT INTO SY_UserProfile (UserID, Profile) VALUES (N'vhorna', N'TAREO');",
    )

    batches = [
        b.strip()
        for b in re.split(r'^\s*GO\s*$', raw, flags=re.I | re.M)
        if b.strip()
    ]

    cs = DatabaseConfig.get_connection_string()
    cs = re.sub(r'DATABASE=[^;]*;', f'DATABASE={target_db};', cs)

    conn = pyodbc.connect(cs, autocommit=True)
    cur = conn.cursor()
    for i, batch in enumerate(batches, 1):
        print(f'Ejecutando lote {i}/{len(batches)}...')
        cur.execute(batch)

    if not seed_company:
        cur.execute(
            """
            SELECT TOP 1 c.Company
            FROM SY_User u
            INNER JOIN SY_Person p ON p.UserID = u.UserID
            INNER JOIN SY_Company c ON p.Company = c.Company
            WHERE u.UserID = N'vhorna'
            """
        )
        row = cur.fetchone()
        seed_company = str(row[0]).strip() if row and row[0] else ''

    if seed_company:
        n = seed_company_codes(cur, seed_company)
        print(f'Codigos para compania {seed_company}: +{n} insertados')

    cur.execute('SELECT COUNT(*) FROM Tareo_Codigo')
    print('Tareo_Codigo filas:', cur.fetchone()[0])
    cur.execute('SELECT COUNT(*) FROM Tareo_Diario')
    print('Tareo_Diario filas:', cur.fetchone()[0])
    cur.execute(
        "SELECT 1 FROM SY_UserProfile WHERE UserID = N'vhorna' AND Profile = N'TAREO'"
    )
    print('Perfil TAREO vhorna:', 'OK' if cur.fetchone() else 'NO')
    cur.close()
    conn.close()
    print(f'Script tareo ejecutado en {target_db}.')


if __name__ == '__main__':
    import os
    main()
