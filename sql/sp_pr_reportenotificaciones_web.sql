/*
    Reporte web: documentos del personal (DocumentosBoletas).
    Filtros opcionales: periodo, empleado, tipo documento, DNI y nombre (LIKE parcial).
*/
ALTER PROCEDURE [dbo].[sp_pr_reportenotificaciones_web]
(
    @cia      VARCHAR(20),
    @period   VARCHAR(20),
    @tipodoc  VARCHAR(20),
    @person   VARCHAR(20),
    @dni      VARCHAR(20),
    @nombre   VARCHAR(200)
)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        sp.Person,
        sp.Name,
        db.tipodocumento,
        db.periodo,
        db.fechasincronizacion,
        db.fechadescarga,
        db.drivefileid,
        db.nombrearchivooriginal,
        db.id
    FROM dbo.DocumentosBoletas AS db
    INNER JOIN dbo.SY_Person AS sp
        ON db.dni = sp.Person
    INNER JOIN dbo.PR_Employee AS e
        ON e.Company = @cia
       AND e.Person = sp.Person
    WHERE db.company = @cia
      AND (@period = '0' OR LEFT(db.periodo, 6) = LEFT(@period, 6))
      AND (@person = '0' OR db.dni = @person)
      AND (@tipodoc = '0' OR db.tipodocumento = @tipodoc)
      AND (@dni = '' OR sp.Person LIKE '%' + @dni + '%')
      AND (@nombre = '' OR sp.Name LIKE '%' + @nombre + '%')
    ORDER BY
        sp.Name,
        db.tipodocumento,
        db.periodo;
END
GO
