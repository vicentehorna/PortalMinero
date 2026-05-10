/**
 * Persistencia autónoma por reporte (localStorage).
 * IDs: cboCompania, cboTipoPlanilla, cboProceso, cboPeriodo; opcional cboTrabajador (solo Promedio).
 */
(function (global) {
    const STORAGE_KEY_RESUMEN_TOTAL = 'filtros_resumen_total';
    const STORAGE_KEY_PROMEDIO_LIQ = 'filtros_promedio_liq';
    const STORAGE_KEY_PLANILLA_VERTICAL = 'filtros_planilla_vertical';
    const STORAGE_KEY_VACACIONES_DETALLE = 'filtros_vacaciones_detalle';
    const STORAGE_KEY_DESCANSOS_MEDICOS_DETALLE = 'filtros_descansos_medicos_detalle';
    const STORAGE_KEY_PROCESAR_PLANILLA = 'filtros_procesar_planilla';

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

    function valHidden(id) {
        const el = document.getElementById(id);
        return el && el.value != null ? String(el.value).trim() : '';
    }

    function crearPersistenciaProcesarPlanilla() {
        function guardar() {
            try {
                const seleccionPersonas = [];
                document.querySelectorAll('.check-trabajador:checked').forEach((c) => {
                    seleccionPersonas.push(String(c.value).trim());
                });
                const estado = {
                    cia: val('cboCompania'),
                    payroll: val('cboTipoPlanilla'),
                    proceso: val('cboProcesoCalculo'),
                    cesados: val('cboCesados'),
                    repunit: val('cboUnidad'),
                    periodo: valHidden('hidPeriodoCalculo'),
                    seleccionPersonas: seleccionPersonas,
                    timestamp: Date.now()
                };
                localStorage.setItem(STORAGE_KEY_PROCESAR_PLANILLA, JSON.stringify(estado));
            } catch (e) {
                console.warn('filtros procesar planilla: no se pudo guardar', e);
            }
        }

        function leer() {
            try {
                const raw = localStorage.getItem(STORAGE_KEY_PROCESAR_PLANILLA);
                if (!raw) return null;
                const o = JSON.parse(raw);
                if (!o || typeof o !== 'object') return null;
                return o;
            } catch (e) {
                return null;
            }
        }

        function registrarGuardadoEnCambio() {
            ['cboCompania', 'cboTipoPlanilla', 'cboProcesoCalculo', 'cboCesados', 'cboUnidad'].forEach((id) => {
                const el = document.getElementById(id);
                if (el) el.addEventListener('change', guardar);
            });
            const chkAll = document.getElementById('checkAll');
            if (chkAll) chkAll.addEventListener('change', guardar);
            const tbody = document.getElementById('tbodyTrabajadores');
            if (tbody) {
                tbody.addEventListener('change', function (e) {
                    const t = e.target;
                    if (t && t.classList && t.classList.contains('check-trabajador')) guardar();
                });
            }
        }

        return {
            STORAGE_KEY: STORAGE_KEY_PROCESAR_PLANILLA,
            guardar,
            leer,
            registrarGuardadoEnCambio
        };
    }

    function crearPersistenciaVacacionesDetalle() {
        function guardar() {
            try {
                const estado = {
                    cia: val('cboCompania'),
                    payroll: val('cboTipoPlanilla'),
                    periodo: val('cboPeriodo'),
                    person: val('cboTrabajador'),
                    timestamp: Date.now()
                };
                localStorage.setItem(STORAGE_KEY_VACACIONES_DETALLE, JSON.stringify(estado));
            } catch (e) {
                console.warn('filtros vacaciones detalle: no se pudo guardar', e);
            }
        }

        function leer() {
            try {
                const raw = localStorage.getItem(STORAGE_KEY_VACACIONES_DETALLE);
                if (!raw) return null;
                const o = JSON.parse(raw);
                if (!o || typeof o !== 'object') return null;
                return o;
            } catch (e) {
                return null;
            }
        }

        async function aplicarRestauracionCascada(opts) {
            if (!opts || typeof opts.poblarSelect !== 'function') return false;

            const { poblarSelect, poblarPeriodoVacaciones } = opts;
            const filtros = leer();
            if (!filtros || !filtros.cia) return false;

            const cboCia = document.getElementById('cboCompania');
            const cboPt = document.getElementById('cboTipoPlanilla');
            const cboPer = document.getElementById('cboPeriodo');
            if (!cboCia || !cboPt || !cboPer) return false;

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

            if (typeof poblarPeriodoVacaciones === 'function') {
                await poblarPeriodoVacaciones(cia, payroll, cboPer);
            } else {
                await poblarSelect(
                    `/api/selectores/periodos-asig?cia=${encodeURIComponent(cia)}&payrolltype=${encodeURIComponent(payroll)}`,
                    cboPer
                );
            }

            const periodo = filtros.periodo != null ? String(filtros.periodo).trim() : '';
            if (periodo && optionExists(cboPer, periodo)) {
                cboPer.value = periodo;
            } else if (optionExists(cboPer, '0')) {
                cboPer.value = '0';
            }

            const cboTra = document.getElementById('cboTrabajador');
            if (cboTra) {
                await poblarSelect(`/api/selectores/trabajadores?cia=${encodeURIComponent(cia)}`, cboTra);
                const person = filtros.person != null ? String(filtros.person).trim() : '';
                if (person && optionExists(cboTra, person)) {
                    cboTra.value = person;
                }
            }

            guardar();
            return true;
        }

        function registrarGuardadoEnCambio() {
            ['cboCompania', 'cboTipoPlanilla', 'cboPeriodo', 'cboTrabajador'].forEach((id) => {
                const el = document.getElementById(id);
                if (el) el.addEventListener('change', guardar);
            });
        }

        return {
            STORAGE_KEY: STORAGE_KEY_VACACIONES_DETALLE,
            guardar,
            leer,
            aplicarRestauracionCascada,
            registrarGuardadoEnCambio
        };
    }

    function crearPersistenciaDescansosMedicosDetalle() {
        function guardar() {
            try {
                const estado = {
                    cia: val('cboCompania'),
                    payroll: val('cboTipoPlanilla'),
                    periodo: val('cboPeriodo'),
                    person: val('cboTrabajador'),
                    medicalresttype: val('cboTipoDescanso'),
                    timestamp: Date.now()
                };
                localStorage.setItem(STORAGE_KEY_DESCANSOS_MEDICOS_DETALLE, JSON.stringify(estado));
            } catch (e) {
                console.warn('filtros descansos médicos detalle: no se pudo guardar', e);
            }
        }

        function leer() {
            try {
                const raw = localStorage.getItem(STORAGE_KEY_DESCANSOS_MEDICOS_DETALLE);
                if (!raw) return null;
                const o = JSON.parse(raw);
                if (!o || typeof o !== 'object') return null;
                return o;
            } catch (e) {
                return null;
            }
        }

        async function aplicarRestauracionCascada(opts) {
            if (!opts || typeof opts.poblarSelect !== 'function') return false;

            const { poblarSelect, poblarPeriodoVacaciones, poblarTiposDescansoMedico } = opts;
            const filtros = leer();
            if (!filtros || !filtros.cia) return false;

            const cboCia = document.getElementById('cboCompania');
            const cboPt = document.getElementById('cboTipoPlanilla');
            const cboPer = document.getElementById('cboPeriodo');
            if (!cboCia || !cboPt || !cboPer) return false;

            const cia = String(filtros.cia).trim();
            if (!optionExists(cboCia, cia)) return false;
            cboCia.value = cia;

            const cboTipoDm = document.getElementById('cboTipoDescanso');
            if (cboTipoDm && typeof poblarTiposDescansoMedico === 'function') {
                await poblarTiposDescansoMedico(cia, cboTipoDm);
                const mrt = filtros.medicalresttype != null ? String(filtros.medicalresttype).trim() : '';
                if (mrt && optionExists(cboTipoDm, mrt)) {
                    cboTipoDm.value = mrt;
                } else if (optionExists(cboTipoDm, '0')) {
                    cboTipoDm.value = '0';
                }
            }

            await poblarSelect(`/api/selectores/planillas?cia=${encodeURIComponent(cia)}`, cboPt);

            const payroll = filtros.payroll != null ? String(filtros.payroll).trim() : '';
            if (!payroll || !optionExists(cboPt, payroll)) {
                guardar();
                return true;
            }
            cboPt.value = payroll;

            if (typeof poblarPeriodoVacaciones === 'function') {
                await poblarPeriodoVacaciones(cia, payroll, cboPer);
            } else {
                await poblarSelect(
                    `/api/selectores/periodos-asig?cia=${encodeURIComponent(cia)}&payrolltype=${encodeURIComponent(payroll)}`,
                    cboPer
                );
            }

            const periodo = filtros.periodo != null ? String(filtros.periodo).trim() : '';
            if (periodo && optionExists(cboPer, periodo)) {
                cboPer.value = periodo;
            } else if (optionExists(cboPer, '0')) {
                cboPer.value = '0';
            }

            const cboTra = document.getElementById('cboTrabajador');
            if (cboTra) {
                await poblarSelect(`/api/selectores/trabajadores?cia=${encodeURIComponent(cia)}`, cboTra);
                const person = filtros.person != null ? String(filtros.person).trim() : '';
                if (person && optionExists(cboTra, person)) {
                    cboTra.value = person;
                }
            }

            guardar();
            return true;
        }

        function registrarGuardadoEnCambio() {
            ['cboCompania', 'cboTipoPlanilla', 'cboPeriodo', 'cboTrabajador', 'cboTipoDescanso'].forEach((id) => {
                const el = document.getElementById(id);
                if (el) el.addEventListener('change', guardar);
            });
        }

        return {
            STORAGE_KEY: STORAGE_KEY_DESCANSOS_MEDICOS_DETALLE,
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
        STORAGE_KEY_VACACIONES_DETALLE,
        STORAGE_KEY_DESCANSOS_MEDICOS_DETALLE,
        STORAGE_KEY_PROCESAR_PLANILLA,
        /** Misma lógica que optionExists interno (valor y option.value con trim). */
        optionExistsTrim: optionExists,
        resumenTotal: function () {
            return crearPersistenciaReporte(STORAGE_KEY_RESUMEN_TOTAL, false);
        },
        promedioLiquidaciones: function () {
            return crearPersistenciaReporte(STORAGE_KEY_PROMEDIO_LIQ, true);
        },
        planillaVertical: function () {
            return crearPersistenciaReporte(STORAGE_KEY_PLANILLA_VERTICAL, true);
        },
        vacacionesDetalle: function () {
            return crearPersistenciaVacacionesDetalle();
        },
        descansosMedicosDetalle: function () {
            return crearPersistenciaDescansosMedicosDetalle();
        },
        procesarPlanilla: function () {
            return crearPersistenciaProcesarPlanilla();
        }
    };
})(typeof window !== 'undefined' ? window : this);
