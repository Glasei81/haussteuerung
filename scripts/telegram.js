// ============================================
// Telegram Script
// Befehle: /status /forecast /wetter /klima /pellets_ein/aus/auto /hilfe
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
        sendTo('telegram.0', '🔄 Pellets auf AUTOMATIK\nKein Eingriff mehr — du bekommst nur noch Empfehlungen.\nEine bestehende Sperre wird aufgehoben.');

    // --- Status ---

    } else if (cmd === '/status') {

        var p1oben     = safeState('eta.puffer.fuehler1',  safeState('eta.puffer.oben', 0));
        var p2oben     = safeState('eta.puffer2.oben',     0);
        var p2unten    = safeState('eta.puffer2.unten',    0);
        var deltaT     = (p1oben > 0 && p2oben > 0) ? Math.round(p2oben - p1oben) : null;
        var p2watt     = safeState('solar.puffer2.watt',   0);

        var rueckZeit  = safeState('eta.puffer2rueck.letzter_transfer', 0);
        var rueckGrund = safeState('eta.puffer2rueck.grund', '');
        var rueckZeile = '';
        if (rueckZeit > 0 && (Date.now() - rueckZeit) < 48 * 3600 * 1000) {
            var minAgo = Math.round((Date.now() - rueckZeit) / 60000);
            var zeitTxt = minAgo < 60 ? 'vor ' + minAgo + ' Min' : 'vor ' + Math.round(minAgo / 60) + ' h';
            rueckZeile = '🔄 Rückspeisung: ' + zeitTxt + ' (' + rueckGrund + ')\n';
        }

        sendTo('telegram.0',
            '📊 Haus Status\n\n' +
            '🌡️ P1 oben: ' + (p1oben || '?') + '°C\n' +
            '🌡️ P2: ' + (p2oben || '?') + '°C / ' + (p2unten || '?') + '°C (oben/unten)' +
                (deltaT !== null ? '  Δ' + (deltaT >= 0 ? '+' : '') + deltaT + '°C' : '') + '\n' +
            rueckZeile +
            '🚿 Warmwasser: ' + safeState('eta.warmwasser.oben', '?') + '°C\n' +
            '🌡️ Außen: ' + safeState('eta.aussen.temperatur', '?') + '°C\n\n' +
            '🔥 Pellets: ' + (safeState('eta.pellets.gesperrt', false) ? 'GESPERRT' : 'FREIGEGEBEN') +
                ' (' + safeState('eta.pellets.modus', '-') + ')\n' +
            '💡 Empfehlung: ' + (safeState('eta.pellets.empfehlung', '') || '-') + '\n\n' +
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
                '📝 Letzter Grund: ' + klimaGrund + '\n\n' +
                '/klima ein — einschalten\n' +
                '/klima aus — ausschalten'
            );
        }

    // --- Klimaanlage Ein ---

    } else if (cmd === '/klima ein') {

        var MIDEA_ID = '153931628437826';
        var pvW    = safeState('solar.pv.watt',        0);
        var netzW  = safeState('solar.netz.watt',      0);
        var batW   = safeState('solar.batterie.watt',  0);
        var batSoc = safeState('solar.batterie.soc',   0);

        var netzZeile = netzW > 0
            ? '🔌 Netzbezug: ' + Math.round(netzW) + 'W'
            : '➡️ Einspeisung: ' + Math.round(Math.abs(netzW)) + 'W';
        var batZeile = batW >= 0
            ? '🔋 Batterie lädt: ' + Math.round(batW) + 'W (' + batSoc + '%)'
            : '🔋 Batterie liefert: ' + Math.round(Math.abs(batW)) + 'W (' + batSoc + '%)';

        setState('midea.0.' + MIDEA_ID + '.operationalMode',   2);
        setState('midea.0.' + MIDEA_ID + '.targetTemperature', 22);
        setState('midea.0.' + MIDEA_ID + '.powerState',        true);
        setState('javascript.0.klima.schlafzimmer.aktiv',       { val: true,       ack: true });
        setState('javascript.0.klima.schlafzimmer.start_zeit',  { val: Date.now(), ack: true });
        setState('javascript.0.klima.schlafzimmer.pause_start', { val: 0,          ack: true });
        setState('javascript.0.klima.schlafzimmer.grund',       { val: 'Manuell EIN via Telegram', ack: true });

        sendTo('telegram.0',
            '❄️ Klimaanlage EIN (manuell)\n' +
            'Ziel: 22°C | Modus: Kühlen\n\n' +
            '☀️ PV: ' + Math.round(pvW) + 'W\n' +
            netzZeile + '\n' +
            batZeile
        );

    // --- Klimaanlage Aus ---

    } else if (cmd === '/klima aus') {

        var MIDEA_ID = '153931628437826';
        setState('midea.0.' + MIDEA_ID + '.powerState', false);
        setState('javascript.0.klima.schlafzimmer.aktiv', { val: false, ack: true });
        setState('javascript.0.klima.schlafzimmer.grund', { val: 'Manuell AUS via Telegram', ack: true });

        sendTo('telegram.0', '❄️ Klimaanlage AUS (manuell)');

    // --- Wetter Statistik (Heute / 7 Tage / Jahr aus InfluxDB) ---

    } else if (cmd === '/wetter') {

        var EIN_TAG        = 24 * 3600 * 1000;
        var jetzt          = Date.now();
        var siebenTageAgo  = jetzt - 7 * EIN_TAG;
        var startJahr      = new Date(new Date().getFullYear(), 0, 1).getTime();

        // Ersten echten Datenpunkt ermitteln
        sendTo('influxdb.0', 'getHistory', {
            id: 'javascript.0.wetter.aktuell.temperatur',
            options: { start: new Date(2020, 0, 1).getTime(), end: jetzt, count: 1, aggregate: 'none', addId: false }
        }, function(firstResult) {

            var seitTxt = '';
            if (firstResult.result && firstResult.result[0] && firstResult.result[0].ts) {
                var d = new Date(firstResult.result[0].ts);
                seitTxt = ' (seit ' + d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear() + ')';
            }

            // Regen: max pro Tag seit Jahresbeginn (regen_gesamt resettet täglich)
            sendTo('influxdb.0', 'getHistory', {
                id: 'javascript.0.wetter.aktuell.regen_gesamt',
                options: { start: startJahr, end: jetzt, aggregate: 'max', step: EIN_TAG, addId: false }
            }, function(regenResult) {

                var regen7 = 0, regenJahr = 0;
                (regenResult.result || []).forEach(function(p) {
                    if (p.val === null || p.val === undefined) return;
                    regenJahr += p.val;
                    if (p.ts >= siebenTageAgo) regen7 += p.val;
                });

                // Temperatur: Ø pro Tag seit Jahresbeginn
                sendTo('influxdb.0', 'getHistory', {
                    id: 'javascript.0.wetter.aktuell.temperatur',
                    options: { start: startJahr, end: jetzt, aggregate: 'average', step: EIN_TAG, addId: false }
                }, function(tempResult) {

                    var tSum7 = 0, tCnt7 = 0, tSumJahr = 0, tCntJahr = 0;
                    (tempResult.result || []).forEach(function(p) {
                        if (p.val === null || p.val === undefined) return;
                        tSumJahr += p.val; tCntJahr++;
                        if (p.ts >= siebenTageAgo) { tSum7 += p.val; tCnt7++; }
                    });
                    var tempAvg7    = tCnt7    > 0 ? Math.round(tSum7    / tCnt7    * 10) / 10 : null;
                    var tempAvgJahr = tCntJahr > 0 ? Math.round(tSumJahr / tCntJahr * 10) / 10 : null;

                    var tempAktuell = safeState('wetter.aktuell.temperatur',  null);
                    var regenHeute  = safeState('wetter.aktuell.regen_gesamt', 0);
                    var regenRate   = safeState('wetter.aktuell.regen_rate',   0);

                    sendTo('telegram.0',
                        '🌧️ Wetter Raubling — eigene Station\n\n' +
                        '📅 Heute (seit Mitternacht):\n' +
                        '🌡️ ' + (tempAktuell !== null ? tempAktuell + '°C' : '?') +
                            (regenRate > 0 ? '   💧 ' + regenRate + ' mm/h' : '') + '\n' +
                        '🌧️ Regen: ' + Math.round(regenHeute * 10) / 10 + ' mm\n' +
                        '\n📆 Letzte 7 Tage:\n' +
                        '🌧️ Regen: ' + Math.round(regen7 * 10) / 10 + ' mm\n' +
                        '🌡️ Ø Temperatur: ' + (tempAvg7 !== null ? tempAvg7 + '°C' : '?') + '\n' +
                        '\n📅 ' + new Date().getFullYear() + seitTxt + ':\n' +
                        '🌧️ Regen: ' + Math.round(regenJahr * 10) / 10 + ' mm\n' +
                        '🌡️ Ø Temperatur: ' + (tempAvgJahr !== null ? tempAvgJahr + '°C' : '?')
                    );
                });
            });
        });

    // --- Hilfe ---

    } else if (cmd === '/hilfe' || cmd === '/start') {

        sendTo('telegram.0',
            '📋 Verfügbare Befehle:\n\n' +
            '/status — Heizung & Energie Überblick\n' +
            '/forecast — Wettervorschau morgen & übermorgen\n' +
            '/wetter — Regen & Temperatur letzte 7 Tage\n' +
            '/klima — Klimaanlage Status\n' +
            '/klima ein — Klimaanlage einschalten\n' +
            '/klima aus — Klimaanlage ausschalten\n' +
            '/pellets_ein — Pellets manuell freigeben\n' +
            '/pellets_aus — Pellets manuell sperren\n' +
            '/pellets_auto — Automatik (nur Empfehlungen, kein Eingriff)\n' +
            '/p2rueck — Puffer2 → Puffer1 Rückspeisung manuell starten\n' +
            '/deploy — Scripts aus Git aktualisieren\n' +
            '/hilfe — Diese Übersicht'
        );
    }
});

log('Telegram Script gestartet');
