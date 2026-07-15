// ============================================
// Wasserzähler — manuelle Ablesung per Telegram
//
// Befehl:  /zaehler <Haupt> <Kalt> <Warm> <WM> <Pool>   (m³, alle am selben Tag)
//   Beispiel: /zaehler 241.151 784.743 455.608 0.180 0.310
//   (Komma oder Punkt egal. 3 Werte gehen weiter — WM/Pool bleiben dann stehen.)
// Erinnerung am 1. und 15. jeden Monats um 09:00 (≈ alle 2 Wochen).
//
// Aufteilung:
//   Familie 1.OG (Verena, Stefan, Kinder = 5 Pers.): Kalt + Warm + Waschmaschine
//   Pool/Werkstatt: eigener Topf (Poolbefüllung, Gartenschlauch, Werkstatt)
//   EG (Eltern): Haupt − Familie − Pool   (Rest, kein Pro-Kopf)
//
// Läuft eigenständig (eigenes Telegram-Abo, wie deploy_listener).
// Stand: 15.07.2026
// ============================================

var FAMILIE_PERSONEN  = 5;
var DELTA_T_K         = 38;      // Annahme für WW-Energie: WW ~50°C − Kalt ~12°C
var WAERMEKAP_WH_L_K  = 1.163;   // Wh pro Liter und Kelvin

// Baseline 31.01.2026 aus den historischen Ablesungen (Haupt = früherer
// "Kaltwasser"-Hauptzähler). Wird einmalig geseedet, damit die erste /zaehler-
// Ablesung (07.07.) direkt das ganze Halbjahr 2026 verrechnet.
var SEED_TS    = 1769817600000;  // 31.01.2026 00:00 UTC
var SEED_HAUPT = 156.602;
var SEED_KALT  = 756.693;
var SEED_WARM  = 441.918;

// Waschmaschine + Pool/Werkstatt: zwei neue Unterzähler, eingebaut 15.07.2026.
// Werksstände beim Einbau — Baseline wird einmalig mit "jetzt" geseedet, damit
// die WM/Pool-Rate über ihr eigenes (kürzeres) Fenster gerechnet wird.
var SEED_WM_START   = 0.1775;
var SEED_POOL_START = 0.292;

createState('wasser.haupt',        0,  { name: 'Wasser Hauptzähler',        type: 'number', unit: 'm³', role: 'value', read: true, write: false });
createState('wasser.kalt_familie', 0,  { name: 'Wasser Kalt Familie 1.OG',  type: 'number', unit: 'm³', role: 'value', read: true, write: false });
createState('wasser.warm_familie', 0,  { name: 'Wasser Warm Familie 1.OG',  type: 'number', unit: 'm³', role: 'value', read: true, write: false });
createState('wasser.wm',           0,  { name: 'Wasser Waschmaschine',      type: 'number', unit: 'm³', role: 'value', read: true, write: false });
createState('wasser.pool',         0,  { name: 'Wasser Pool/Werkstatt',     type: 'number', unit: 'm³', role: 'value', read: true, write: false });
createState('wasser.ts',           0,  { name: 'Wasser letzte Ablesung ms', type: 'number', role: 'value', read: true, write: false });
createState('wasser.ts_wmpool',    0,  { name: 'WM/Pool letzte Ablesung ms', type: 'number', role: 'value', read: true, write: false });
createState('wasser.datum',        '', { name: 'Wasser letzte Ablesung',    type: 'string', role: 'text', read: true, write: false });
createState('wasser.familie_lpt',  0,  { name: 'Familie L/Tag',             type: 'number', unit: 'L/Tag',   role: 'value', read: true, write: false });
createState('wasser.warm_lpt',     0,  { name: 'Warmwasser L/Tag',          type: 'number', unit: 'L/Tag',   role: 'value', read: true, write: false });
createState('wasser.wm_lpt',       0,  { name: 'Waschmaschine L/Tag',       type: 'number', unit: 'L/Tag',   role: 'value', read: true, write: false });
createState('wasser.pool_lpt',     0,  { name: 'Pool/Werkstatt L/Tag',      type: 'number', unit: 'L/Tag',   role: 'value', read: true, write: false });
createState('wasser.eg_lpt',       0,  { name: 'EG L/Tag',                  type: 'number', unit: 'L/Tag',   role: 'value', read: true, write: false });
createState('wasser.ww_kwh_tag',   0,  { name: 'WW-Energie Familie kWh/Tag',type: 'number', unit: 'kWh/Tag', role: 'value', read: true, write: false });
createState('wasser.seed_done',    false, { name: 'Wasser Baseline geseedet',   type: 'boolean', role: 'indicator', read: true, write: true });
createState('wasser.wmpool_seed_done', false, { name: 'WM/Pool Baseline geseedet', type: 'boolean', role: 'indicator', read: true, write: true });

function safe(id, fb) {
    try { var s = getState(id); if (s && s.val !== null && s.val !== undefined) return s.val; } catch(e) {}
    return fb;
}

// Baselines GENAU EINMAL setzen (per *_seed_done-Flags, nicht per ts).
// setTimeout, damit createState oben sicher durch ist.
setTimeout(function() {
    if (safe('javascript.0.wasser.seed_done', false) !== true) {
        setState('javascript.0.wasser.haupt',        { val: SEED_HAUPT,   ack: true });
        setState('javascript.0.wasser.kalt_familie', { val: SEED_KALT,    ack: true });
        setState('javascript.0.wasser.warm_familie', { val: SEED_WARM,    ack: true });
        setState('javascript.0.wasser.ts',           { val: SEED_TS,      ack: true });
        setState('javascript.0.wasser.datum',        { val: '31.1.2026',  ack: true });
        setState('javascript.0.wasser.seed_done',    { val: true,         ack: true });
        log('Wasserzähler: Baseline 31.01.2026 einmalig geseedet (Haupt ' + SEED_HAUPT + ' / Kalt ' + SEED_KALT + ' / Warm ' + SEED_WARM + ')');
    }
    // WM/Pool separat: Baseline = Werksstand beim Einbau, ts = jetzt.
    if (safe('javascript.0.wasser.wmpool_seed_done', false) !== true) {
        setState('javascript.0.wasser.wm',            { val: SEED_WM_START,   ack: true });
        setState('javascript.0.wasser.pool',          { val: SEED_POOL_START, ack: true });
        setState('javascript.0.wasser.ts_wmpool',     { val: Date.now(),      ack: true });
        setState('javascript.0.wasser.wmpool_seed_done', { val: true,         ack: true });
        log('Wasserzähler: WM/Pool-Baseline geseedet (WM ' + SEED_WM_START + ' / Pool ' + SEED_POOL_START + ')');
    }
}, 3000);

// hauptNeu/kaltNeu/warmNeu immer; wmNeu/poolNeu optional (null = unverändert)
function ablesung(hauptNeu, kaltNeu, warmNeu, wmNeu, poolNeu) {
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

        // Raten (L/Tag) sind das Primitiv — WM/Pool haben u.U. ein eigenes,
        // kürzeres Fenster (erst 15.07. eingebaut). Rate = Delta / eigene Tage.
        var kaltLpt = dKalt * 1000 / tage;
        var warmLpt = dWarm * 1000 / tage;

        // WM/Pool nur, wenn diesmal übergeben
        var wmAlt   = safe('javascript.0.wasser.wm', 0);
        var poolAlt = safe('javascript.0.wasser.pool', 0);
        var tsWm    = safe('javascript.0.wasser.ts_wmpool', 0);
        var tageWm  = tsWm > 0 ? Math.max(1, Math.round((jetzt - tsWm) / 86400000)) : tage;

        var dWM = 0, dPool = 0, wmLpt = 0, poolLpt = 0;
        if (wmNeu !== null && wmNeu !== undefined) {
            dWM     = Math.round((wmNeu   - wmAlt)   * 1000) / 1000;
            dPool   = Math.round((poolNeu - poolAlt) * 1000) / 1000;
            wmLpt   = dWM   * 1000 / tageWm;
            poolLpt = dPool * 1000 / tageWm;
        }

        var famLpt  = Math.round(kaltLpt + warmLpt + wmLpt);
        var poolLptR = Math.round(poolLpt);
        var egLpt   = Math.max(0, Math.round(dHaupt * 1000 / tage - famLpt - poolLptR));
        var proPers = Math.round(famLpt / FAMILIE_PERSONEN);
        var wwKwhTag = Math.round(dWarm * DELTA_T_K * WAERMEKAP_WH_L_K / tage * 10) / 10;  // m³ × 44,2 kWh/m³ / Tage

        setState('javascript.0.wasser.familie_lpt', { val: famLpt,        ack: true });
        setState('javascript.0.wasser.warm_lpt',    { val: Math.round(warmLpt), ack: true });
        setState('javascript.0.wasser.wm_lpt',      { val: Math.round(wmLpt),   ack: true });
        setState('javascript.0.wasser.pool_lpt',    { val: poolLptR,      ack: true });
        setState('javascript.0.wasser.eg_lpt',      { val: egLpt,         ack: true });
        setState('javascript.0.wasser.ww_kwh_tag',  { val: wwKwhTag,      ack: true });

        var msg =
            '💧 Zählerablesung ' + datum + '\n' +
            '   seit letzter Ablesung: ' + tage + ' Tage' +
            (wmNeu !== null && wmNeu !== undefined && tageWm !== tage ? ' (WM/Pool: ' + tageWm + ' T)' : '') + '\n\n' +
            '🏠 Familie 1. OG (' + FAMILIE_PERSONEN + ' Pers.)\n' +
            '  Kalt: ' + dKalt + ' m³ · Warm: ' + dWarm + ' m³' +
            (wmNeu !== null && wmNeu !== undefined ? ' · WM: ' + dWM + ' m³' : '') + '\n' +
            '  Gesamt: ' + famLpt + ' L/Tag (' + proPers + ' L/Person)\n' +
            '  🔥 Warmwasser: ' + Math.round(warmLpt) + ' L/Tag ≈ ' + wwKwhTag + ' kWh/Tag\n\n';

        if (wmNeu !== null && wmNeu !== undefined) {
            msg += '🏊 Pool/Werkstatt\n' +
                   '  ' + dPool + ' m³ → ' + poolLptR + ' L/Tag\n\n';
        }

        msg += '🏡 EG (Eltern)\n' +
               '  ' + egLpt + ' L/Tag  (Haupt − Familie − Pool)\n\n' +
               '📌 Stände gespeichert:\n' +
               '  Haupt ' + hauptNeu + ' · Kalt ' + kaltNeu + ' · Warm ' + warmNeu +
               (wmNeu !== null && wmNeu !== undefined ? '\n  WM ' + wmNeu + ' · Pool ' + poolNeu : '') + ' m³';

        sendTo('telegram.0', msg);
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
    if (wmNeu !== null && wmNeu !== undefined) {
        setState('javascript.0.wasser.wm',        { val: wmNeu,   ack: true });
        setState('javascript.0.wasser.pool',      { val: poolNeu, ack: true });
        setState('javascript.0.wasser.ts_wmpool', { val: jetzt,   ack: true });
    }
}

on({id: 'telegram.0.communicate.request', change: 'any'}, function(obj) {
    var msg = obj.state.val, cmd = '';
    try { cmd = JSON.parse(msg).message; } catch(e) { cmd = msg; }
    cmd = cmd.replace(/^\[.*?\]/, '').trim();

    if (cmd.indexOf('/zaehler') === 0) {
        // Zahlen extrahieren (Komma → Punkt als Dezimaltrenner)
        var zahlen = (cmd.replace(/,/g, '.').match(/\d+(\.\d+)?/g) || []).map(parseFloat);
        if (zahlen.length < 3) {
            sendTo('telegram.0', '❓ Bitte 5 Werte: /zaehler <Haupt> <Kalt> <Warm> <WM> <Pool>\nBeispiel: /zaehler 241.151 784.743 455.608 0.180 0.310\n(3 Werte gehen auch — WM/Pool bleiben dann stehen.)');
            return;
        }
        if (zahlen.length >= 5) {
            ablesung(zahlen[0], zahlen[1], zahlen[2], zahlen[3], zahlen[4]);
        } else {
            ablesung(zahlen[0], zahlen[1], zahlen[2], null, null);
        }
    }
});

// Erinnerung am 1. und 15. jeden Monats um 09:00 (≈ alle 2 Wochen)
schedule('0 9 1,15 * *', function() {
    sendTo('telegram.0', '📏 Zeit für die Wasser-Ablesung!\nBitte alle 5 Zähler ablesen und senden:\n/zaehler <Haupt> <Kalt> <Warm> <WM> <Pool>  (m³)');
});

log('Wasserzähler Script gestartet — /zaehler zum Ablesen, Erinnerung 1. + 15.');
