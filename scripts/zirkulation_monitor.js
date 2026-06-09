// ============================================
// Zirkulation Monitor Script
// Nacht-Temperaturabfall Warmwasser tracken
// 01:00 Uhr Snapshot → 05:40 Uhr Vergleich
// Stand: 09.06.2026
// ============================================

var WW_STATE = 'javascript.0.eta.warmwasser.oben';

createState('zirkulation.monitor.temp_01uhr',   0,  { name: 'WW-Temp Snapshot 01:00', type: 'number', unit: '°C', role: 'value.temperature', read: true, write: false });
createState('zirkulation.monitor.temp_0540',    0,  { name: 'WW-Temp Snapshot 05:40', type: 'number', unit: '°C', role: 'value.temperature', read: true, write: false });
createState('zirkulation.monitor.delta_nacht',  0,  { name: 'WW-Abfall Nacht (01:00→05:40)', type: 'number', unit: '°C', role: 'value', read: true, write: false });
createState('zirkulation.monitor.datum',        '', { name: 'Datum letzte Messung', type: 'string', role: 'text', read: true, write: false });

// 01:00 Uhr: Snapshot nach Ende der Abendaktivitäten
schedule('0 1 * * *', function() {
    var state = getState(WW_STATE);
    if (!state || isNaN(state.val) || state.val === 0) {
        log('Zirkulation Monitor: WW-State nicht lesbar um 01:00', 'warn');
        return;
    }
    setState('javascript.0.zirkulation.monitor.temp_01uhr', { val: state.val, ack: true });
    log('Zirkulation Monitor: Snapshot 01:00 = ' + state.val + '°C');
});

// 05:40 Uhr: Vergleich + Delta berechnen
schedule('40 5 * * *', function() {
    var state0540 = getState(WW_STATE);
    var state0100 = getState('javascript.0.zirkulation.monitor.temp_01uhr');

    if (!state0540 || isNaN(state0540.val) || state0540.val === 0) {
        log('Zirkulation Monitor: WW-State nicht lesbar um 05:40', 'warn');
        return;
    }
    if (!state0100 || state0100.val === 0) {
        log('Zirkulation Monitor: Kein 01:00-Snapshot vorhanden (Script heute Nacht neu gestartet?)', 'warn');
        return;
    }

    var temp0100 = state0100.val;
    var temp0540 = state0540.val;
    var delta    = Math.round((temp0100 - temp0540) * 10) / 10;
    var datum    = new Date().toLocaleDateString('de-DE');

    setState('javascript.0.zirkulation.monitor.temp_0540',   { val: temp0540, ack: true });
    setState('javascript.0.zirkulation.monitor.delta_nacht', { val: delta,    ack: true });
    setState('javascript.0.zirkulation.monitor.datum',       { val: datum,    ack: true });

    log('Zirkulation Monitor ' + datum + ': 01:00=' + temp0100 + '°C → 05:40=' + temp0540 + '°C → Abfall=' + delta + '°C');
});

log('Zirkulation Monitor Script gestartet (Snapshots 01:00 + 05:40)');
