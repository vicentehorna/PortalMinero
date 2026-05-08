FROM python:3.11-slim

# 1. Instalar dependencias de sistema necesarias para WeasyPrint y SQL Server
RUN apt-get update && apt-get install -y \
    # Librerías para WeasyPrint (equivalente al "GTK3" en Linux)
    libpango-1.0-0 \
    libharfbuzz0b \
    libpangoft2-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libffi-dev \
    shared-mime-info \
    # Librerías para SQL Server (ODBC)
    curl \
    gnupg \
    unixodbc-dev \
    && curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add - \
    && curl https://packages.microsoft.com/config/debian/11/prod.list > /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y msodbcsql17 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 3. Copiar e instalar requerimientos de Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. Copiar el resto del proyecto
COPY . .

# 5. Comando para ejecutar la app
CMD ["gunicorn", "--bind", "0.0.0.0:10000", "app:app"]