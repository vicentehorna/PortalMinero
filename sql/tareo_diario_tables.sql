-- Tablas MVP tareo diario (Portal Minería).
-- Ejecutar en la base configurada en SQL_DATABASE.
-- Perfil de acceso: SY_UserProfile.Profile = 'TAREO' (ej. usuario vhorna).

IF OBJECT_ID(N'dbo.Tareo_Codigo', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Tareo_Codigo (
        Company     NVARCHAR(20)  NOT NULL,
        Codigo      NVARCHAR(10)  NOT NULL,
        Descripcion NVARCHAR(200) NOT NULL,
        Orden       INT           NOT NULL CONSTRAINT DF_Tareo_Codigo_Orden DEFAULT (0),
        Activo      BIT           NOT NULL CONSTRAINT DF_Tareo_Codigo_Activo DEFAULT (1),
        CONSTRAINT PK_Tareo_Codigo PRIMARY KEY CLUSTERED (Company, Codigo)
    );
END
GO

IF OBJECT_ID(N'dbo.Tareo_Diario', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Tareo_Diario (
        Id                 INT IDENTITY(1, 1) NOT NULL,
        Company            NVARCHAR(20)  NOT NULL,
        Person             NVARCHAR(20)  NOT NULL,
        Fecha              DATE          NOT NULL,
        Codigo             NVARCHAR(10)  NOT NULL,
        SupervisorUserID   NVARCHAR(50)  NOT NULL,
        FechaRegistro      DATETIME2(0)  NOT NULL CONSTRAINT DF_Tareo_Diario_FechaRegistro DEFAULT (SYSUTCDATETIME()),
        FechaModificacion  DATETIME2(0)  NULL,
        CONSTRAINT PK_Tareo_Diario PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_Tareo_Diario_Company_Person_Fecha UNIQUE (Company, Person, Fecha)
    );

    CREATE NONCLUSTERED INDEX IX_Tareo_Diario_Company_Fecha
        ON dbo.Tareo_Diario (Company, Fecha);
END
GO

-- Catálogo inicial (referencia HLM). Ajustar @cia a la compañía del supervisor.
DECLARE @cia NVARCHAR(20) = N'HLM';

MERGE dbo.Tareo_Codigo AS t
USING (VALUES
    (@cia, N'8',   N'Jornada laboral (8 h)', 1),
    (@cia, N'DL',  N'Descanso laborado',    2),
    (@cia, N'V',   N'Vacaciones',            3),
    (@cia, N'FR',  N'Feriado recuperable',   4),
    (@cia, N'DM',  N'Descanso médico',       5),
    (@cia, N'F',   N'Falta injustificada',   6),
    (@cia, N'PT',  N'Permiso con goce',      7),
    (@cia, N'LCG', N'Licencia sin goce',     8),
    (@cia, N'S',   N'Suspensión',            9)
) AS s (Company, Codigo, Descripcion, Orden)
ON t.Company = s.Company AND t.Codigo = s.Codigo
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Company, Codigo, Descripcion, Orden, Activo)
    VALUES (s.Company, s.Codigo, s.Descripcion, s.Orden, 1);
GO

-- Perfil TAREO de ejemplo (descomentar y ajustar UserID):
-- IF NOT EXISTS (SELECT 1 FROM SY_UserProfile WHERE UserID = N'vhorna' AND Profile = N'TAREO')
--     INSERT INTO SY_UserProfile (UserID, Profile) VALUES (N'vhorna', N'TAREO');
GO
