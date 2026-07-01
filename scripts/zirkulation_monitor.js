// ============================================
// Zirkulation Monitor — Schwerkraftbremsen-Diagnose
// Warmwasser-Abkühlung im pumpenlosen Fenster (Zirkulation aus 22–05 Uhr)
// Snapshot 22:10  →  Vergleich 04:50
//
// Ziel: erkennen ob eine defekte Schwerkraftbremse / Rückschlagklappe
// nachts eine Thermosiphon-Schleife durch die Zirkulationsleitung treibt.
// Signatur: WW kühlt trotz stehender Pumpe deutlich schneller als reiner
// Dämmverlust (~0,2–0,4 °C/h). > 0,8 °C/h ist verdächtig.
// Stand: 01.07.2026
// ============================================

var WW_OBEN  = 'javascript.0.eta.warmwasser.oben';
var WW_UNTEN = 'javascript.0.eta.warmwasser.unten';

// Fenster = pumpenlose Zeit (Zirkulation aus 22:00–05:00), mit Puffer an den Rändern
var START_STUNDE = 22, START_MIN = 10;   // 22:10
var END_STUNDE   = 4,  END_MIN   = 50;   // 04:50
var FENSTER_H    = ((24 - START_STUNDE) + END_STUNDE) + (END_MIN - START_MIN) / 60;  // 6,67 h

// Bewertungsschwellen für die Abkühlrate oben (°C/h)
var SCHWELLE_ERHOEHT    = 0.5;   // darüber: leicht erhöht
var SCHWELLE_VERDAECHTIG = 0.8;  // darüber: Schwerkraftbremse prüfen

createState('zirkulation.monitor.start_oben',  0,  { name: 'WW oben Snapshot 22:10',  type: 'number', unit: '°C', role: 'value.temperature', read: true, write: false });
createState('zirkulation.monitor.start_unten', 0,  { name: 'WW unten Snapshot 22:10', type: 'number', unit: '°C', role: 'value.temperature', read: true, write: false });
createState('zirkulation.monitor.end_oben',    0,  { name: 'WW oben Snapshot 04:50',  type: 'number', unit: '°C', role: 'value.temperature', read: true, write: false });
createState('zirkulation.monitor.end_unten',   0,  { name: 'WW unten Snapshot 04:50', type: 'number', unit: '°C', role: 'value.temperature', read: true, write: false });
createState('zirkulation.monitor.delta_nacht', 0,  { name: 'WW-Abfall oben (Nacht)',  type: 'number', unit: '°C', role: 'value', read: true, write: false });
createState('zirkulation.monitor.rate_nacht',  0,  { name: 'WW-Abkühlrate oben',      type: 'number', unit: '°C/h', role: 'value', read: true, write: false });
createState('zirkulation.monitor.bewertung',   '', { name: 'Bewertung Schwerkraftbremse', type: 'string', role: 'text', read: true, write: false });
createState('zirkulation.monitor.datum',       '', { name: 'Datum letzte Messung',    type: 'string', role: 'text', read: true, write: false });

function lese(id) {
    var s = getState(id);
    if (!s || s.val === null || s.val === undefined || isNaN(s.val)) return null;
    return s.val;
}

// 22:10 — Snapshot nachdem die Zirkulation aus ist
schedule('10 22 * * *', function() {
    var oben  = lese(WW_OBEN);
    var unten = lese(WW_UNTEN);
    if (oben === null) {
        log('Zirkulation Monitor: WW oben nicht lesbar um 22:10', 'warn');
        return;
    }
    setState('javascript.0.zirkulation.monitor.start_oben',  { val: oben,               ack: true });
    setState('javascript.0.zirkulation.monitor.start_unten', { val: unten !== null ? unten : 0, ack: true });
    log('Zirkulation Monitor: Snapshot 22:10 = ' + oben + '°C oben / ' + unten + '°C unten');
});

// 04:50 — Vergleich vor dem Zirkulations-Start (05:00), Auswertung
schedule('50 4 * * *', function() {
    var endOben  = lese(WW_OBEN);
    var endUnten = lese(WW_UNTEN);
    var startOben  = lese('javascript.0.zirkulation.monitor.start_oben');
    var startUnten = lese('javascript.0.zirkulation.monitor.start_unten');

    if (endOben === null) {
        log('Zirkulation Monitor: WW oben nicht lesbar um 04:50', 'warn');
        return;
    }
    if (startOben === null || startOben === 0) {
        log('Zirkulation Monitor: Kein 22:10-Snapshot (Script nachts neu gestartet?)', 'warn');
        return;
    }

    var deltaOben  = Math.round((startOben - endOben) * 10) / 10;
    var deltaUnten = (startUnten && endUnten !== null) ? Math.round((startUnten - endUnten) * 10) / 10 : null;
    var rate       = Math.round((deltaOben / FENSTER_H) * 100) / 100;
    var datum      = new Date().toLocaleDateString('de-DE');

    setState('javascript.0.zirkulation.monitor.end_oben',    { val: endOben,  ack: true });
    setState('javascript.0.zirkulation.monitor.end_unten',   { val: endUnten !== null ? endUnten : 0, ack: true });
    setState('javascript.0.zirkulation.monitor.delta_nacht', { val: deltaOben, ack: true });
    setState('javascript.0.zirkulation.monitor.rate_nacht',  { val: rate,      ack: true });
    setState('javascript.0.zirkulation.monitor.datum',       { val: datum,     ack: true });

    // Nachladung während der Nacht (Ladepumpe/Solar) verfälscht die Messung
    if (deltaOben < 0) {
        setState('javascript.0.zirkulation.monitor.bewertung', { val: 'Nachladung erkannt — keine Aussage', ack: true });
        log('Zirkulation Monitor ' + datum + ': WW stieg um ' + Math.abs(deltaOben) + '°C (Nachladung) — übersprungen');
        return;
    }

    var bewertung, verdacht = false;
    if (rate > SCHWELLE_VERDAECHTIG) {
        bewertung = 'VERDÄCHTIG — Schwerkraftbremse/Rückschlagklappe prüfen';
        verdacht = true;
    } else if (rate > SCHWELLE_ERHOEHT) {
        bewertung = 'leicht erhöht — beobachten';
    } else {
        bewertung = 'normal — Dämmverlust im Rahmen';
    }
    setState('javascript.0.zirkulation.monitor.bewertung', { val: bewertung, ack: true });

    log('Zirkulation Monitor ' + datum + ': ' + startOben + '→' + endOben + '°C oben (Δ' + deltaOben +
        '°C, ' + rate + '°C/h) — ' + bewertung);

    // Telegram nur wenn auffällig — kein tägliches Grundrauschen
    if (verdacht) {
        var unterZeile = (deltaUnten !== null)
            ? '\n🌡️ unten: ' + startUnten + '→' + endUnten + '°C (Δ' + deltaUnten + '°C)'
            : '';
        sendTo('telegram.0',
            '⚠️ Warmwasser-Nachtverlust auffällig\n\n' +
            '🌡️ oben: ' + startOben + '→' + endOben + '°C (Δ' + deltaOben + '°C)' + unterZeile + '\n' +
            '📉 Rate: ' + rate + ' °C/h über ' + Math.round(FENSTER_H * 10) / 10 + ' h (Zirkulation aus)\n\n' +
            'Normal wären ~0,2–0,4 °C/h reiner Dämmverlust.\n' +
            'So schneller Verlust deutet auf eine defekte Schwerkraftbremse / Rückschlagklappe hin ' +
            '(Thermosiphon durch die Zirkulationsleitung trotz stehender Pumpe).'
        );
    }
});

log('Zirkulation Monitor gestartet — Schwerkraftbremsen-Diagnose (Snapshots 22:10 + 04:50)');
