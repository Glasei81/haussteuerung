// ============================================
// Wasserzähler — manuelle Ablesung per Telegram
//
// Befehl:  /zaehler <Haupt> <Kalt> <Warm>   (m³, alle am selben Tag ablesen)
//   Beispiel: /zaehler 241.151 784.743 455.608   (Komma oder Punkt egal)
// Erinnerung am 1. und 15. jeden Monats um 09:00 (≈ alle 2 Wochen).
//
// Aufteilung:
//   Familie 1.OG (Verena, Stefan, Kinder = 5 Pers.): Kalt + Warm Unterzähler
//   EG (Eltern + Pool etc.): Haupt − Familie  (kein Pro-Kopf, Pool inklusive)
//
// Läuft eigenständig (eigenes Telegram-Abo, wie deploy_listener).
// Stand: 07.07.2026
// ============================================

var FAMILIE_PERSONEN  = 5;
var DELTA_T_K         = 38;      // Annahme für WW-Energie: WW ~50°C − Kalt ~12°C
var WAERMEKAP_WH_L_K  = 1.163;   // Wh pro Liter und Kelvin

createState('wasser.haupt',        0,  { name: 'Wasser Hauptzähler',        type: 'number', unit: 'm³', role: 'value', read: true, write: false });
createState('wasser.kalt_familie', 0,  { name: 'Wasser Kalt Familie 1.OG',  type: 'number', unit: 'm³', role: 'value', read: true, write: false });
createState('wasser.warm_familie', 0,  { name: 'Wasser Warm Familie 1.OG',  type: 'number', unit: 'm³', role: 'value', read: true, write: false });
createState('wasser.ts',           0,  { name: 'Wasser letzte Ablesung ms', type: 'number', role: 'value', read: true, write: false });
createState('wasser.datum',        '', { name: 'Wasser letzte Ablesung',    type: 'string', role: 'text', read: true, write: false });
createState('wasser.familie_lpt',  0,  { name: 'Familie L/Tag',             type: 'number', unit: 'L/Tag',   role: 'value', read: true, write: false });
createState('wasser.warm_lpt',     0,  { name: 'Warmwasser L/Tag',          type: 'number', unit: 'L/Tag',   role: 'value', read: true, write: false });
createState('wasser.eg_lpt',       0,  { name: 'EG L/Tag',                  type: 'number', unit: 'L/Tag',   role: 'value', read: true, write: false });
createState('wasser.ww_kwh_tag',   0,  { name: 'WW-Energie Familie kWh/Tag',type: 'number', unit: 'kWh/Tag', role: 'value', read: true, write: false });

function safe(id, fb) {
    try { var s = getState(id); if (s && s.val !== null && s.val !== undefined) return s.val; } catch(e) {}
    return fb;
}

function ablesung(hauptNeu, kaltNeu, warmNeu) {
    var jetzt = Date.now();
    var datum = new Date().toLocaleDateString('de-DE');
    var tsAlt = safe('javascript.0.wasser.ts', 0);

    if (tsAlt > 0) {
        var tage     = Math.max(1, Math.round((jetzt - tsAlt) / 86400000));
        var hauptAlt = safe('javascript.0.wasser.haupt', 0);
        var kaltAlt  = safe('javascript.0.wasser.kalt_familie', 0);
        var warmAlt  = safe('javascript.0.wasser.warm_familie', 0);

        var dKalt  = Math.round((kaltNeu  - kaltAlt)  * 1000) / 1000;
        var dWarm  = Math.round((warmNeu  - warmAlt)  * 1000) / 1000;
        var dHaupt = Math.round((hauptNeu - hauptAlt) * 1000) / 1000;
        var dFam   = dKalt + dWarm;
        var dEg    = Math.round((dHaupt - dFam) * 1000) / 1000;

        var famLpt   = Math.round(dFam  * 1000 / tage);
        var warmLpt  = Math.round(dWarm * 1000 / tage);
        var egLpt    = Math.round(dEg   * 1000 / tage);
        var proPers  = Math.round(dFam  * 1000 / tage / FAMILIE_PERSONEN);
        var wwKwhTag = Math.round(dWarm * DELTA_T_K * WAERMEKAP_WH_L_K / tage * 10) / 10;  // m³ × 44,2 kWh/m³ / Tage

        setState('javascript.0.wasser.familie_lpt', { val: famLpt,   ack: true });
        setState('javascript.0.wasser.warm_lpt',    { val: warmLpt,  ack: true });
        setState('javascript.0.wasser.eg_lpt',      { val: egLpt,    ack: true });
        setState('javascript.0.wasser.ww_kwh_tag',  { val: wwKwhTag, ack: true });

        sendTo('telegram.0',
            '💧 Zählerablesung ' + datum + '\n' +
            '   seit letzter Ablesung: ' + tage + ' Tage\n\n' +
            '🏠 Familie 1. OG (' + FAMILIE_PERSONEN + ' Pers.)\n' +
            '  Kalt: ' + dKalt + ' m³ · Warm: ' + dWarm + ' m³\n' +
            '  Gesamt: ' + famLpt + ' L/Tag (' + proPers + ' L/Person)\n' +
            '  🔥 Warmwasser: ' + warmLpt + ' L/Tag ≈ ' + wwKwhTag + ' kWh/Tag\n\n' +
            '🏡 EG (Eltern + Pool etc.)\n' +
            '  Gesamt: ' + dEg + ' m³ → ' + egLpt + ' L/Tag\n\n' +
            '📌 Stände gespeichert:\n' +
            '  Haupt ' + hauptNeu + ' · Kalt ' + kaltNeu + ' · Warm ' + warmNeu + ' m³'
        );
    } else {
        sendTo('telegram.0',
            '💧 Startwerte gespeichert (' + datum + ')\n' +
            '  Haupt ' + hauptNeu + ' · Kalt ' + kaltNeu + ' · Warm ' + warmNeu + ' m³\n\n' +
            'Ab der nächsten Ablesung rechne ich den Verbrauch aus.'
        );
    }

    setState('javascript.0.wasser.haupt',        { val: hauptNeu, ack: true });
    setState('javascript.0.wasser.kalt_familie', { val: kaltNeu,  ack: true });
    setState('javascript.0.wasser.warm_familie', { val: warmNeu,  ack: true });
    setState('javascript.0.wasser.ts',           { val: jetzt,    ack: true });
    setState('javascript.0.wasser.datum',        { val: datum,    ack: true });
}

on({id: 'telegram.0.communicate.request', change: 'any'}, function(obj) {
    var msg = obj.state.val, cmd = '';
    try { cmd = JSON.parse(msg).message; } catch(e) { cmd = msg; }
    cmd = cmd.replace(/^\[.*?\]/, '').trim();

    if (cmd.indexOf('/zaehler') === 0) {
        // Zahlen extrahieren (Komma → Punkt als Dezimaltrenner)
        var zahlen = (cmd.replace(/,/g, '.').match(/\d+(\.\d+)?/g) || []).map(parseFloat);
        if (zahlen.length < 3) {
            sendTo('telegram.0', '❓ Bitte 3 Werte: /zaehler <Haupt> <Kalt> <Warm>\nBeispiel: /zaehler 241.151 784.743 455.608');
            return;
        }
        ablesung(zahlen[0], zahlen[1], zahlen[2]);
    }
});

// Erinnerung am 1. und 15. jeden Monats um 09:00 (≈ alle 2 Wochen)
schedule('0 9 1,15 * *', function() {
    sendTo('telegram.0', '📏 Zeit für die Wasser-Ablesung!\nBitte alle 3 Zähler ablesen und senden:\n/zaehler <Haupt> <Kalt> <Warm>  (m³)');
});

log('Wasserzähler Script gestartet — /zaehler zum Ablesen, Erinnerung 1. + 15.');
