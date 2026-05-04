/**
 * Persistencia autónoma por reporte (localStorage).
 * IDs: cboCompania, cboTipoPlanilla, cboProceso, cboPeriodo; opcional cboTrabajador (solo Promedio).
 */
(function (global) {
    const STORAGE_KEY_RESUMEN_TOTAL = 'filtros_resumen_total';
    const STORAGE_KEY_PROMEDIO_LIQ = 'filtros_promedio_liq';
    const STORAGE_KEY_PLANILLA_VERTICAL = 'filtros_planilla_vertical';

    function val(id) {
        const el = document.getElementById(id);
        return el && el.value != null ? String(el.value).trim() : '';
    }

    function optionExists(select, value) {
        if (!select || value === '' || value == null) return false;
        const v = String(value).trim();
        return Array.prototype.some.call(select.options, (o) => String(o.value).trim() === v);
    }

    /**
     * @param {string} storageKey
     * @param {boolean} incluyeEmpleado
     */
    function crearPersistenciaReporte(storageKey, incluyeEmpleado) {
        function guardar() {
            try {
                const estado = {
                    cia: val('cboCompania'),
                    payroll: val('cboTipoPlanilla'),
                    proceso: val('cboProceso'),
                    periodo: val('cboPeriodo'),
                    timestamp: Date.now()
                };
                if (incluyeEmpleado) {
                    estado.person = val('cboTrabajador');
                }
                localStorage.setItem(storageKey, JSON.stringify(estado));
            } catch (e) {
                console.warn('filtros reporte: no se pudo guardar', e);
            }
        }

        function leer() {
            try {
                const raw = localStorage.getItem(storageKey);
                if (!raw) return null;
                const o = JSON.parse(raw);
                if (!o || typeof o !== 'object') return null;
                return o;
            } catch (e) {
                return null;
            }
        }

        /**
         * @param {{ poblarSelect: (url: string, el: HTMLElement) => Promise<void> }} opts
         */
        async function aplicarRestauracionCascada(opts) {
            if (!opts || typeof opts.poblarSelect !== 'function') return false;

            const { poblarSelect } = opts;
            const filtros = leer();
            if (!filtros || !filtros.cia) return false;

            const cboCia = document.getElementById('cboCompania');
            const cboPt = document.getElementById('cboTipoPlanilla');
            const cboProc = document.getElementById('cboProceso');
            const cboPer = document.getElementById('cboPeriodo');
            if (!cboCia || !cboPt || !cboProc || !cboPer) return false;

            const cia = String(filtros.cia).trim();
            if (!optionExists(cboCia, cia)) return false;
            cboCia.value = cia;

            await poblarSelect(`/api/selectores/planillas?cia=${encodeURIComponent(cia)}`, cboPt);

            const payroll = filtros.payroll != null ? String(filtros.payroll).trim() : '';
            if (!payroll || !optionExists(cboPt, payroll)) {
                guardar();
                return true;
            }
            cboPt.value = payroll;

            await poblarSelect(
                `/api/selectores/procesos?cia=${encodeURIComponent(cia)}&payrolltype=${encodeURIComponent(payroll)}`,
                cboProc
            );

            const proceso = filtros.proceso != null ? String(filtros.proceso).trim() : '';
            if (!proceso || !optionExists(cboProc, proceso)) {
                guardar();
                return true;
            }
            cboProc.value = proceso;

            await poblarSelect(
                `/api/selectores/periodos?cia=${encodeURIComponent(cia)}&payrolltype=${encodeURIComponent(payroll)}&processtype=${encodeURIComponent(proceso)}`,
                cboPer
            );

            const periodo = filtros.periodo != null ? String(filtros.periodo).trim() : '';
            if (periodo && optionExists(cboPer, periodo)) {
                cboPer.value = periodo;
            }

            if (incluyeEmpleado) {
                const cboTra = document.getElementById('cboTrabajador');
                if (cboTra) {
                    await poblarSelect(`/api/selectores/trabajadores?cia=${encodeURIComponent(cia)}`, cboTra);
                    const person = filtros.person != null ? String(filtros.person).trim() : '';
                    if (person && optionExists(cboTra, person)) {
                        cboTra.value = person;
                    }
                }
            }

            guardar();
            return true;
        }

        function registrarGuardadoEnCambio() {
            ['cboCompania', 'cboTipoPlanilla', 'cboProceso', 'cboPeriodo'].forEach((id) => {
                const el = document.getElementById(id);
                if (el) el.addEventListener('change', guardar);
            });
            if (incluyeEmpleado) {
                const t = document.getElementById('cboTrabajador');
                if (t) t.addEventListener('change', guardar);
            }
        }

        return {
            STORAGE_KEY: storageKey,
            guardar,
            leer,
            aplicarRestauracionCascada,
            registrarGuardadoEnCambio
        };
    }

    global.FiltrosPlanillasReportes = {
        STORAGE_KEY_RESUMEN_TOTAL,
        STORAGE_KEY_PROMEDIO_LIQ,
        STORAGE_KEY_PLANILLA_VERTICAL,
        resumenTotal: function () {
            return crearPersistenciaReporte(STORAGE_KEY_RESUMEN_TOTAL, false);
        },
        promedioLiquidaciones: function () {
            return crearPersistenciaReporte(STORAGE_KEY_PROMEDIO_LIQ, true);
        },
        planillaVertical: function () {
            return crearPersistenciaReporte(STORAGE_KEY_PLANILLA_VERTICAL, true);
        }
    };
})(typeof window !== 'undefined' ? window : this);
