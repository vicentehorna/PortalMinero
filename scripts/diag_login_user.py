"""Diagnóstico de login para un usuario en hm_safari."""
import os
import re
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
load_dotenv(ROOT / '.env')

from database import DatabaseConfig, User  # noqa: E402
import pyodbc  # noqa: E402


def q(cur, sql, params=()):
    cur.execute(sql, params)
    cols = [c[0] for c in cur.description] if cur.description else []
    rows = cur.fetchall()
    return cols, rows


def main():
    userid = (sys.argv[1] if len(sys.argv) > 1 else 'vhorna').strip()
    password = (sys.argv[2] if len(sys.argv) > 2 else 'vhorna').strip()
    db = (sys.argv[3] if len(sys.argv) > 3 else 'hm_safari').strip()

    cs = DatabaseConfig.get_connection_string()
    cs = re.sub(r'DATABASE=[^;]*;', f'DATABASE={db};', cs)
    conn = pyodbc.connect(cs, autocommit=True)
    cur = conn.cursor()

    print(f'=== Diagnóstico login: {userid} en {db} ===')

    cols, rows = q(cur, 'SELECT UserID, PasswordWeb FROM SY_User WHERE UserID = ?', (userid,))
    if not rows:
        print('SY_User: NO EXISTE')
        cur.close(); conn.close()
        return
    print(f'SY_User: OK, PasswordWeb len={len(str(rows[0][1] or ""))}')

    cols, rows = q(
        cur,
        'SELECT Profile FROM SY_UserProfile WHERE UserID = ? ORDER BY Profile',
        (userid,),
    )
    profiles = [str(r[0]) for r in rows]
    print('Perfiles:', profiles or '(ninguno)')

    cols, rows = q(cur, 'SELECT UserID, Name, Company, Person FROM SY_Person WHERE UserID = ?', (userid,))
    if rows:
        print(f'SY_Person: Name={rows[0][1]}, Company={rows[0][2]}, Person={rows[0][3]}')
    else:
        print('SY_Person: NO EXISTE')

    cols, rows = q(
        cur,
        """
        SELECT E.Company, E.Person, E.Status
        FROM SY_Person p
        INNER JOIN PR_Employee E ON p.Person = E.Person
        WHERE p.UserID = ?
        """,
        (userid,),
    )
    if rows:
        for r in rows:
            print(f'PR_Employee: Company={r[0]}, Person={r[1]}, Status={r[2]}')
    else:
        print('PR_Employee: sin filas para este usuario')

    cols, rows = q(
        cur,
        """
        SELECT 1
        FROM SY_User u
        INNER JOIN SY_Person p ON p.UserID = u.UserID
        INNER JOIN SY_Company c ON (p.Company = c.Company)
        INNER JOIN SY_UserProfile up ON up.UserID = u.UserID
        INNER JOIN PR_mapping2 M ON (c.Company = M.company)
        WHERE u.UserID = ? AND u.PasswordWeb = ?
        """,
        (userid, password),
    )
    print('Login SQL GENERAL:', 'OK' if rows else 'FALLA')

    cols, rows = q(
        cur,
        """
        SELECT 1
        FROM SY_User u
        INNER JOIN SY_Person p ON p.UserID = u.UserID
        INNER JOIN PR_Employee E ON (p.Person = E.Person AND E.Status = 'N')
        INNER JOIN SY_Company c ON (E.Company = c.Company)
        INNER JOIN SY_UserProfile up ON up.UserID = u.UserID
        INNER JOIN PR_mapping2 M ON (c.Company = M.company)
        WHERE u.UserID = ? AND u.PasswordWeb = ?
        """,
        (userid, password),
    )
    print('Login SQL EMPLEADO (Status=N):', 'OK' if rows else 'FALLA')

    print('validate_user():', 'OK' if User.validate_user(userid, password) else 'FALLA')
    u = User.validate_user(userid, password)
    if u:
        print(f'Usuario validado: company={u.company}, person={u.person}')

    cur.close()
    conn.close()


if __name__ == '__main__':
    main()
