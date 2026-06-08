/*
    Último periodo activo (Status A/G) para documentos del personal.
    Sin tipo de planilla en pantalla: considera planillas OBREROS y EMPLEADOS.
*/
CREATE OR ALTER PROCEDURE [dbo].[sp_pr_selectorperiodoactivo_planilla_web]
    @cia VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1
        LTRIM(RTRIM(pc.PRPeriod)) AS prperiod
    FROM dbo.PR_ProcessControl AS pc WITH (NOLOCK)
    INNER JOIN dbo.PR_PayRollType AS pt WITH (NOLOCK)
        ON pt.PayRollType = pc.PayRollType
    WHERE pc.Company = @cia
      AND pc.Status IN ('A', 'G')
      AND UPPER(LTRIM(RTRIM(pt.ShortName))) IN ('OBREROS', 'EMPLEADOS')
    ORDER BY pc.PRPeriod DESC;
END
GO
