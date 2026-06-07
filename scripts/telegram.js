// ============================================
// Telegram Script
// Alle Befehle: /status /klima /pellets_ein/aus/auto
// Liest ioBroker States — unabhängig von anderen Scripts
// ============================================

function safeState(id, fallback) {
    try {
        var obj = getState('javascript.0.' + id);
        if (obj && obj.val !== null && obj.val !== undefined) return obj.val;
    } catch(e) {}
    return fallback;
}

on({id: 'telegram.0.communicate.request', change: 'any'}, function(obj) {

    var msg = obj.state.val;
    var cmd = '';
    try { cmd = JSON.parse(msg).message; } catch(e) { cmd = msg; }
    cmd = cmd.replace(/^\[.*?\]/, '').trim();

    // --- Pellets Steuerung ---

    if (cmd === '/pellets_ein') {
        setState('javascript.0.eta.pellets.modus', {val: 'manuell_ein', ack: true});
        sendTo('telegram.0', '✅ Pellets manuell FREIGEGEBEN\nMit /pellets_auto zurück zur Automatik');

    } else if (cmd === '/pellets_aus') {
        setState('javascript.0.eta.pellets.modus', {val: 'manuell_aus', ack: true});
        sendTo('telegram.0', '🔒 Pellets manuell GESPERRT\nMit /pellets_auto zurück zur Automatik');

    } else if (cmd === '/pellets_auto') {
        setState('javascript.0.eta.pellets.modus', {val: 'auto', ack: true});
        sendTo('telegram.0', '🔄 Pellets zurück auf AUTOMATIK');

    // --- Status ---

    } else if (cmd === '/status') {

        var p2watt = safeState('solar.puffer2.watt', 0);

        sendTo('telegram.0',
            '📊 ETA Status\n' +
            '🔥 Pellets: ' + (safeState('eta.pellets.gesperrt', false) ? 'GESPERRT' : 'FREIGEGEBEN') + '\n' +
            '⚙️ Modus: ' + safeState('eta.pellets.modus', '-') + '\n\n' +
            '🌡️ Puffer 1 oben: ' + safeState('eta.puffer.oben', '?') + '°C\n' +
            '🌡️ Puffer 2: ' + safeState('eta.puffer2.oben', '?') + '°C / ' + safeState('eta.puffer2.unten', '?') + '°C (oben/unten)\n' +
            '🚿 Warmwasser: ' + safeState('eta.warmwasser.oben', '?') + '°C\n' +
            '🌡️ Außen: ' + safeState('eta.aussen.temperatur', '?') + '°C\n\n' +
            '☀️ PV: ' + safeState('solar.pv.watt', '?') + 'W\n' +
            '🔋 Batterie: ' + safeState('solar.batterie.soc', '?') + '%\n' +
            (p2watt > 0 ? '⚡ Heizstab P2: ' + p2watt + 'W\n' : '') +
            '\n📅 Morgen: ' + safeState('wetter.forecast.morgen.max', '?') + '°C | Regen ' +
            safeState('wetter.forecast.morgen.regen', '?') + '% | UV ' + safeState('wetter.forecast.morgen.uv', '?') + '\n' +
            '☀️ PV Prognose: ' + safeState('wetter.pv.prognose_morgen', '?') + '\n\n' +
            '🧠 Entscheidung:\n' + safeState('eta.pellets.letzte_entscheidung', '-')
        );

    // --- Klimastatistik ---

    } else if (cmd === '/klima') {

        var startMs = new Date('2026-05-21').getTime();
        var endMs   = Date.now();
        var tage    = Math.round((endMs - startMs) / 86400000);
        var res     = {};
        var offen   = 4;

        function sendKlima() {
            if (offen > 0) return;
            sendTo('telegram.0',
                '🌍 Klimastatistik Raubling\n' +
                '📅 Aufzeichnung: ' + tage + ' Tage (seit 21.05.2026)\n\n' +
                '🌡️ Ø Temperatur: ' + (res.temp      !== undefined ? res.temp.toFixed(1)      + '°C'   : '?') + '\n' +
                '💨 Ø Wind:        ' + (res.wind      !== undefined ? res.wind.toFixed(1)      + ' km/h' : '?') + '\n' +
                '🌧️ Niederschlag:  ' + (res.regen     !== undefined ? res.regen.toFixed(1)     + ' mm'   : '?') + '\n' +
                '⛈️ Starkregen-Tage (>10mm/h): ' + (res.starkregen !== undefined ? res.starkregen : '?')
            );
        }

        sendTo('influxdb.0', 'getHistory', {
            id: 'javascript.0.wetter.aktuell.temperatur',
            options: { start: startMs, end: endMs, aggregate: 'average', count: 1 }
        }, function(r) {
            if (r && r.result && r.result[0]) res.temp = r.result[0].val;
            offen--; sendKlima();
        });

        sendTo('influxdb.0', 'getHistory', {
            id: 'javascript.0.wetter.aktuell.wind',
            options: { start: startMs, end: endMs, aggregate: 'average', count: 1 }
        }, function(r) {
            if (r && r.result && r.result[0]) res.wind = r.result[0].val;
            offen--; sendKlima();
        });

        // regen_gesamt ist Tageskumulation → Tagesmax pro Tag summieren
        sendTo('influxdb.0', 'getHistory', {
            id: 'javascript.0.wetter.aktuell.regen_gesamt',
            options: { start: startMs, end: endMs, aggregate: 'max', step: 86400000 }
        }, function(r) {
            if (r && r.result) {
                var sum = 0;
                r.result.forEach(function(p) { if (p.val) sum += p.val; });
                res.regen = sum;
            }
            offen--; sendKlima();
        });

        // Starkregentage: Tage mit max regen_rate > 10 mm/h
        sendTo('influxdb.0', 'getHistory', {
            id: 'javascript.0.wetter.aktuell.regen_rate',
            options: { start: startMs, end: endMs, aggregate: 'max', step: 86400000 }
        }, function(r) {
            var count = 0;
            if (r && r.result) r.result.forEach(function(p) { if (p.val > 10) count++; });
            res.starkregen = count;
            offen--; sendKlima();
        });
    }
});

log('Telegram Script gestartet');
