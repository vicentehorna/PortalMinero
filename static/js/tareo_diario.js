(function () {
    'use strict';

    var root = document.getElementById('tareoApp');
    if (!root) return;

    var cia = (root.dataset.cia || '').trim();
    var fechaInput = document.getElementById('tareoFecha');
    var listaEl = document.getElementById('tareoLista');
    var resumenEl = document.getElementById('tareoResumen');
    var alertEl = document.getElementById('tareoAlert');
    var btnGuardar = document.getElementById('btnGuardarTareo');
    var limit = parseInt(root.dataset.limit || '10', 10) || 10;

    var codigos = [];
    var trabajadores = [];
    var seleccion = {};
    var cargadoServidor = {};
    var dirty = false;

    function fechaActual() {
        return (fechaInput && fechaInput.value) ? fechaInput.value.trim() : (root.dataset.fecha || '');
    }

    function showAlert(type, msg) {
        if (!alertEl) return;
        alertEl.className = 'alert alert-' + type + ' py-2 small';
        alertEl.textContent = msg;
        alertEl.classList.remove('d-none');
    }

    function hideAlert() {
        if (alertEl) alertEl.classList.add('d-none');
    }

    function actualizarResumen() {
        var total = trabajadores.length;
        var marcados = 0;
        trabajadores.forEach(function (t) {
            if (seleccion[t.person]) marcados += 1;
        });
        if (resumenEl) {
            resumenEl.textContent = marcados + ' de ' + total + ' trabajadores con código · ' + formatFechaHumana(fechaActual());
        }
        if (btnGuardar) {
            btnGuardar.disabled = total === 0 || !dirty;
        }
    }

    function formatFechaHumana(iso) {
        if (!iso) return '';
        var p = iso.split('-');
        if (p.length !== 3) return iso;
        return p[2] + '/' + p[1] + '/' + p[0];
    }

    function setCodigo(person, codigo) {
        seleccion[person] = codigo;
        dirty = true;
        renderLista();
        actualizarResumen();
        hideAlert();
    }

    function renderLista() {
        if (!listaEl) return;
        if (!trabajadores.length) {
            listaEl.innerHTML = '<p class="text-muted small">No hay trabajadores asignados para esta compañía.</p>';
            return;
        }

        var html = '';
        trabajadores.forEach(function (t, idx) {
            var cod = seleccion[t.person] || '';
            html += '<article class="tareo-card" data-person="' + escapeAttr(t.person) + '">';
            html += '<div class="tareo-card-header">';
            html += '<p class="tareo-card-nombre mb-0"><span class="text-muted me-1">' + (idx + 1) + '.</span>' + escapeHtml(t.nombre) + '</p>';
            html += '<span class="tareo-card-codigo' + (cod ? ' has-code' : '') + '" aria-label="Código actual">' + (cod || '—') + '</span>';
            html += '</div>';
            html += '<div class="tareo-codigos-grid" role="group" aria-label="Códigos para ' + escapeAttr(t.nombre) + '">';
            codigos.forEach(function (c) {
                var active = cod === c.codigo ? ' active' : '';
                html += '<button type="button" class="tareo-btn-codigo' + active + '" data-person="' + escapeAttr(t.person) + '" data-codigo="' + escapeAttr(c.codigo) + '" title="' + escapeAttr(c.descripcion) + '">' + escapeHtml(c.codigo) + '</button>';
            });
            html += '</div></article>';
        });
        listaEl.innerHTML = html;

        listaEl.querySelectorAll('.tareo-btn-codigo').forEach(function (btn) {
            btn.addEventListener('click', function () {
                setCodigo(btn.dataset.person, btn.dataset.codigo);
            });
        });
    }

    function escapeHtml(s) {
        return String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function escapeAttr(s) {
        return escapeHtml(s).replace(/'/g, '&#39;');
    }

    function fetchJson(url, options) {
        return fetch(url, options || {}).then(function (r) {
            return r.json().then(function (data) {
                if (!r.ok) {
                    var err = new Error((data && data.error) || 'Error de solicitud');
                    err.status = r.status;
                    throw err;
                }
                return data;
            });
        });
    }

    function cargarDia() {
        hideAlert();
        dirty = false;
        seleccion = {};
        cargadoServidor = {};
        if (resumenEl) resumenEl.textContent = 'Cargando…';
        if (listaEl) listaEl.innerHTML = '<p class="text-muted small">Cargando trabajadores…</p>';
        if (btnGuardar) btnGuardar.disabled = true;

        var fecha = fechaActual();
        var q = '?cia=' + encodeURIComponent(cia) + '&fecha=' + encodeURIComponent(fecha);

        Promise.all([
            fetchJson('/api/tareo/codigos?cia=' + encodeURIComponent(cia)),
            fetchJson('/api/tareo/trabajadores?cia=' + encodeURIComponent(cia) + '&limit=' + limit),
            fetchJson('/api/tareo/diario' + q)
        ]).then(function (results) {
            codigos = results[0] || [];
            trabajadores = results[1] || [];
            var reg = (results[2] && results[2].registros) || {};
            cargadoServidor = Object.assign({}, reg);
            seleccion = Object.assign({}, reg);
            dirty = false;
            renderLista();
            actualizarResumen();
        }).catch(function (err) {
            showAlert('danger', err.message || 'No se pudo cargar el tareo.');
            if (listaEl) listaEl.innerHTML = '';
            actualizarResumen();
        });
    }

    function guardar() {
        if (!dirty || !trabajadores.length) return;
        hideAlert();
        btnGuardar.disabled = true;
        btnGuardar.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Guardando…';

        var registros = trabajadores
            .filter(function (t) { return !!seleccion[t.person]; })
            .map(function (t) {
                return { person: t.person, codigo: seleccion[t.person] };
            });

        fetchJson('/api/tareo/diario', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cia: cia,
                fecha: fechaActual(),
                registros: registros
            })
        }).then(function (data) {
            dirty = false;
            cargadoServidor = Object.assign({}, seleccion);
            showAlert('success', data.mensaje || 'Tareo guardado.');
            actualizarResumen();
        }).catch(function (err) {
            showAlert('danger', err.message || 'No se pudo guardar.');
            actualizarResumen();
        }).finally(function () {
            btnGuardar.innerHTML = '<i class="bi bi-save me-1"></i> Guardar tareo del día';
            if (btnGuardar) btnGuardar.disabled = !dirty;
        });
    }

    if (fechaInput) {
        fechaInput.addEventListener('change', cargarDia);
    }
    if (btnGuardar) {
        btnGuardar.addEventListener('click', guardar);
    }

    if (!cia) {
        showAlert('warning', 'No se identificó la compañía del supervisor. Verifique su usuario.');
        return;
    }

    cargarDia();
})();
