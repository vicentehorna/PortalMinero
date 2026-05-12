-- Tabla para registros de documentos PDF escaneados desde carpeta del servidor (Portal Minería).
-- Ejecutar en la base de datos configurada en SQL_DATABASE.

IF OBJECT_ID(N'dbo.DocumentosMineria', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DocumentosMineria (
        Id             INT IDENTITY(1, 1) NOT NULL,
        Tipo           NVARCHAR(50)      NOT NULL,
        Periodo        NVARCHAR(20)      NOT NULL,
        DNI            NVARCHAR(20)      NOT NULL,
        NombreEmpleado NVARCHAR(400)     NOT NULL,
        NombreArchivo  NVARCHAR(500)     NOT NULL,
        FechaRegistro  DATETIME2(0)      NOT NULL CONSTRAINT DF_DocumentosMineria_FechaRegistro DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_DocumentosMineria PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_DocumentosMineria_NombreArchivo UNIQUE (NombreArchivo)
    );

    CREATE NONCLUSTERED INDEX IX_DocumentosMineria_Periodo_DNI
        ON dbo.DocumentosMineria (Periodo, DNI);
END
GO
