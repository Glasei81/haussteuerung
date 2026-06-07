// ============================================
// Telegram Script
// Befehle: /status /forecast /klima /pellets_ein/aus/auto /hilfe
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
            '\n📅 Morgen: ' + (safeState('wetter.forecast.morgen.max', 0) || '?') + '°C | Regen ' +
            (safeState('wetter.forecast.morgen.regen', -1) >= 0 ? safeState('wetter.forecast.morgen.regen', 0) + '%' : '?') + ' | UV ' +
            (safeState('wetter.forecast.morgen.uv', 0) || '?') + '\n' +
            '☀️ PV Prognose: ' + (safeState('wetter.pv.prognose_morgen', '') || '?') + '\n\n' +
            '🧠 Entscheidung:\n' + safeState('eta.pellets.letzte_entscheidung', '-')
        );

    // --- Forecast ---

    } else if (cmd === '/forecast') {

        var fMorgenMax    = safeState('wetter.forecast.morgen.max',        0);
        var fMorgenMin    = safeState('wetter.forecast.morgen.min',        0);
        var fMorgenRegen  = safeState('wetter.forecast.morgen.regen',      0);
        var fMorgenUV     = safeState('wetter.forecast.morgen.uv',         0);
        var fMorgenText   = safeState('wetter.forecast.morgen.text',       '');
        var fUeberMax     = safeState('wetter.forecast.uebermorgen.max',   0);
        var fUeberRegen   = safeState('wetter.forecast.uebermorgen.regen', 0);
        var fUeberUV      = safeState('wetter.forecast.uebermorgen.uv',    0);
        var pvPrognose    = safeState('wetter.pv.prognose_morgen',         '');

        sendTo('telegram.0',
            '🌤️ Wettervorschau Raubling\n\n' +
            '📅 Morgen:\n' +
            '🌡️ ' + (fMorgenMax || '?') + '°C / ' + (fMorgenMin || '?') + '°C (max/min)\n' +
            '🌧️ Regen: ' + (fMorgenRegen || '?') + '%\n' +
            '🔆 UV: ' + (fMorgenUV || '?') + '\n' +
            (fMorgenText ? '📝 ' + fMorgenText + '\n' : '') +
            '\n📅 Übermorgen:\n' +
            '🌡️ ' + (fUeberMax || '?') + '°C | Regen: ' + (fUeberRegen || '?') + '% | UV: ' + (fUeberUV || '?') + '\n' +
            '\n☀️ PV Prognose morgen: ' + (pvPrognose || '?')
        );

    // --- Klimaanlage Status ---

    } else if (cmd === '/klima') {

        var klimaStateObj = null;
        try { klimaStateObj = getState('javascript.0.klima.schlafzimmer.aktiv'); } catch(e) {}

        if (!klimaStateObj || klimaStateObj.val === null || klimaStateObj.val === undefined) {
            sendTo('telegram.0', '❄️ Klimaanlage\nScript nicht aktiv.');
        } else {
            var klimaAktiv  = klimaStateObj.val;
            var klimaStart  = safeState('klima.schlafzimmer.start_zeit',  0);
            var klimaPause  = safeState('klima.schlafzimmer.pause_start', 0);
            var klimaGrund  = safeState('klima.schlafzimmer.grund',       '-');

            var zigbeeTemp = null;
            try {
                var zs = getState('zigbee.0.a4c1388f0b92eb71.temperature');
                if (zs && zs.val !== null && zs.val !== undefined) zigbeeTemp = zs.val;
            } catch(e) {}

            var jetzt = Date.now();
            var statusZeile = '';

            if (klimaAktiv) {
                var laufMin = Math.round((jetzt - klimaStart) / 60000);
                statusZeile = '✅ AKTIV — Laufzeit: ' + laufMin + ' Min';
            } else if (klimaPause > 0 && (jetzt - klimaPause) < 3600000) {
                var restMin = Math.round((3600000 - (jetzt - klimaPause)) / 60000);
                statusZeile = '⏸️ PAUSE — noch ' + restMin + ' Min';
            } else {
                statusZeile = '⭕ AUS';
            }

            sendTo('telegram.0',
                '❄️ Klimaanlage Schlafzimmer\n' +
                'Status: ' + statusZeile + '\n' +
                '🌡️ Raumtemperatur: ' + (zigbeeTemp !== null ? zigbeeTemp + '°C' : '?') + '\n' +
                '📝 Letzter Grund: ' + klimaGrund
            );
        }

    // --- Hilfe ---

    } else if (cmd === '/hilfe' || cmd === '/start') {

        sendTo('telegram.0',
            '📋 Verfügbare Befehle:\n\n' +
            '/status — Heizung & Energie Überblick\n' +
            '/forecast — Wettervorschau morgen & übermorgen\n' +
            '/klima — Klimaanlage Schlafzimmer\n' +
            '/pellets_ein — Pellets manuell freigeben\n' +
            '/pellets_aus — Pellets manuell sperren\n' +
            '/pellets_auto — Pellets zurück auf Automatik\n' +
            '/hilfe — Diese Übersicht'
        );
    }
});

log('Telegram Script gestartet');
