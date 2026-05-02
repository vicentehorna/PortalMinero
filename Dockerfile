FROM python:3.11-slim-bookworm

# Evitar diálogos interactivos
ENV DEBIAN_FRONTEND=noninteractive

# 1. Instalación de dependencias del sistema
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    wget \
    xfonts-75dpi \
    xfonts-base \
    libssl-dev \
    libxrender1 \
    libfontconfig1 \
    libx11-6 \
    libxcb1 \
    libxext6 \
    libxau6 \
    libxdmcp6 \
    && mkdir -p /etc/apt/keyrings \
    # 2. Instalar el Driver de SQL Server (msodbcsql17)
    && curl https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /etc/apt/keyrings/microsoft.gpg \
    && echo "deb [arch=amd64,arm64,armhf signed-by=/etc/apt/keyrings/microsoft.gpg] https://packages.microsoft.com/debian/12/prod bookworm main" > /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y msodbcsql17 \
    # 3. Instalar wkhtmltopdf (El paquete se llama wkhtmltox)
    # Nota: El archivo correcto es wkhtmltox_0.12.6.1-3.bookworm_amd64.deb
    && wget https://github.com/wkhtmltopdf/packaging/releases/download/0.12.6.1-3/wkhtmltox_0.12.6.1-3.bookworm_amd64.deb \
    && apt-get install -y ./wkhtmltox_0.12.6.1-3.bookworm_amd64.deb \
    # ESTA LÍNEA ES LA CLAVE:
    && ln -s /usr/local/bin/wkhtmltopdf /usr/bin/wkhtmltopdf \
    && rm wkhtmltox_0.12.6.1-3.bookworm_amd64.deb \
    # Limpieza
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .
RUN pip install --no-cache-dir -r requirements.txt

# Puerto para Render
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:10000"]