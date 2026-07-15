// ============================================
// Telegram Script
// Befehle: /status /forecast /wetter /klima /pellets_ein/aus/auto /hilfe
// Liest ioBroker States — unabhängig von anderen Scripts
//
// Klimaanlagen:
//   Schlafzimmer — Midea (midea.0.153931628437826)
//   Treppenhaus  — Tuya  (tuya.0.0.121075124022d88f2e59, DPS 1)
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

        var r0 = function(v) { return (typeof v === 'number') ? Math.round(v) : v; };

        // Rückspeisung (nur wenn < 48h alt)
        var rueckZeit  = safeState('eta.puffer2rueck.letzter_transfer', 0);
        var rueckGrund = safeState('eta.puffer2rueck.grund', '');
        var rueckZeile = '';
        if (rueckZeit > 0 && (Date.now() - rueckZeit) < 48 * 3600 * 1000) {
            var minAgo = Math.round((Date.now() - rueckZeit) / 60000);
            var zeitTxt = minAgo < 60 ? 'vor ' + minAgo + ' Min' : 'vor ' + Math.round(minAgo / 60) + ' h';
            rueckZeile = '  🔄 Rückspeisung ' + zeitTxt + ' (' + rueckGrund + ')\n';
        }

        // PV / Netz / Batterie
        var pvW    = safeState('solar.pv.watt',       0);
        var netzW  = safeState('solar.netz.watt',     0);
        var verbW  = safeState('solar.verbrauch.watt',0);
        var batW   = safeState('solar.batterie.watt', 0);
        var batSoc = safeState('solar.batterie.soc',  0);
        var netzZeile = netzW > 0 ? '  🔌 Netzbezug: ' + r0(netzW) + ' W' : '  ➡️ Einspeisung: ' + r0(Math.abs(netzW)) + ' W';
        var batZeile  = batW >= 0 ? '  🔋 Batterie: ' + batSoc + '% (lädt ' + r0(batW) + ' W)' : '  🔋 Batterie: ' + batSoc + '% (liefert ' + r0(Math.abs(batW)) + ' W)';

        // WW-Nachtverlust
        var wwRate = safeState('zirkulation.monitor.rate_nacht', null);
        var wwBew  = safeState('zirkulation.monitor.bewertung', '');
        var wwZeile = (wwRate !== null) ? '🌙 WW-Nacht: ' + wwRate + ' °C/h (' + (wwBew || '-') + ')\n\n' : '';

        var aussen = safeState('wetter.aktuell.temperatur_korrigiert', 0) || safeState('eta.aussen.temperatur', '?');

        sendTo('telegram.0',
            '📊 Haus Status\n\n' +

            '🔥 Puffer 1 (3000L)\n' +
            '  ' + safeState('eta.puffer.fuehler1','?') + ' / ' + safeState('eta.puffer.fuehler2','?') + ' / ' +
                   safeState('eta.puffer.fuehler3','?') + ' / ' + safeState('eta.puffer.fuehler4','?') + ' / ' +
                   safeState('eta.puffer.fuehler5','?') + ' °C\n' +
            '  Ladung: ' + safeState('eta.puffer.ladung','?') + '%\n\n' +

            '🔥 Puffer 2 (600L)\n' +
            '  ' + safeState('eta.puffer2.oben','?') + ' / ' + safeState('eta.puffer2.mitte','?') + ' / ' +
                   safeState('eta.puffer2.unten','?') + ' °C (o/m/u)\n' +
            '  Ladung: ' + safeState('eta.puffer2.ladung','?') + '%\n' +
            rueckZeile + '\n' +

            '🚿 Warmwasser: ' + safeState('eta.warmwasser.oben','?') + ' / ' + safeState('eta.warmwasser.unten','?') +
                ' °C (Soll ' + safeState('eta.warmwasser.soll','?') + ')\n' +
            '🌡️ Außen: ' + aussen + ' °C\n\n' +

            '♨️ Heizkreise\n' +
            '  HK: ' + safeState('eta.hk.vorlauf','?') + '→' + safeState('eta.hk.ruecklauf','?') + ' °C (' + safeState('eta.hk.zustand','-') + ')\n' +
            '  FBH: ' + safeState('eta.fbh.vorlauf','?') + '→' + safeState('eta.fbh.ruecklauf','?') + ' °C (' + safeState('eta.fbh.zustand','-') + ')\n\n' +

            '🔥 Kessel\n' +
            '  Pellets: ' + (safeState('eta.pellets.gesperrt', false) ? 'GESPERRT' : 'FREI') +
                ' (' + safeState('eta.pellets.modus','-') + ') · ' + safeState('eta.pellets.leistung',0) + ' kW · heute ' + safeState('eta.pellets.ertrag_heute',0) + ' kWh\n' +
            '  Scheitholz: ' + safeState('eta.holz.leistung',0) + ' kW · heute ' + safeState('eta.holz.ertrag_heute',0) + ' kWh\n' +
            '  💡 ' + (safeState('eta.pellets.empfehlung','') || '-') + '\n\n' +

            '☀️ Solarthermie: ' + safeState('eta.solar.vorlauf','?') + '→' + safeState('eta.solar.ruecklauf','?') +
                ' °C · heute ' + safeState('eta.solar.ertrag_heute',0) + ' kWh\n\n' +

            '⚡ PV & Batterie\n' +
            '  ☀️ PV: ' + r0(pvW) + ' W (heute ' + safeState('solar.pv.today',0) + ' kWh)\n' +
            '  🏠 Verbrauch: ' + r0(verbW) + ' W\n' +
            netzZeile + '\n' +
            batZeile + '\n\n' +

            '🔌 Heizstäbe\n' +
            '  Puffer 1: ' + safeState('solar.puffer1.watt',0) + ' W · Puffer 2: ' + safeState('solar.puffer2.watt',0) + ' W\n' +
            '  myPV Puffer: ' + safeState('solar.heizstab.puffer_watt',0) + ' W · WW: ' + safeState('solar.heizstab.ww_watt',0) + ' W\n\n' +

            wwZeile +

            '💧 Wasser (letzte Ablesung ' + (safeState('wasser.datum','-')) + ')\n' +
            '  Familie: ' + safeState('wasser.familie_lpt',0) + ' L/Tag · WW ' + safeState('wasser.warm_lpt',0) +
                ' L/Tag ≈ ' + safeState('wasser.ww_kwh_tag',0) + ' kWh/Tag\n' +
            '  WM: ' + safeState('wasser.wm_lpt',0) + ' · Pool: ' + safeState('wasser.pool_lpt',0) +
                ' · EG: ' + safeState('wasser.eg_lpt',0) + ' L/Tag\n\n' +

            '📅 Morgen: ' + (safeState('wetter.forecast.morgen.max',0) || '?') + ' °C · Regen ' +
                (safeState('wetter.forecast.morgen.regen',-1) >= 0 ? safeState('wetter.forecast.morgen.regen',0) + '%' : '?') + ' · UV ' +
                (safeState('wetter.forecast.morgen.uv',0) || '?') + '\n' +
            '☀️ PV Prognose: ' + (safeState('wetter.pv.prognose_morgen','') || '?') + '\n\n' +

            '🧠 Entscheidung:\n' + safeState('eta.pellets.letzte_entscheidung','-')
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

        var jetzt = Date.now();

        function klimaStatus(aktiv, startZeit, pauseStart, temp, grund) {
            var status;
            if (aktiv) {
                status = '✅ AKTIV seit ' + Math.round((jetzt - startZeit) / 60000) + ' Min';
            } else if (pauseStart > 0 && (jetzt - pauseStart) < 3600000) {
                status = '⏸ PAUSE — noch ' + Math.round((3600000 - (jetzt - pauseStart)) / 60000) + ' Min';
            } else {
                status = 'AUS';
            }
            var tempTxt = temp !== null ? (Math.round(temp * 10) / 10) + '°C' : '?';
            var grundTxt = (grund && grund !== '-') ? '\n   ↳ ' + grund : '';
            return status + '\n🌡️ ' + tempTxt + grundTxt;
        }

        // Echter Gerätestatus hat Vorrang vor Shadow State
        var slRealOn = false;
        try { var sr = getState('midea.0.153931628437826.powerState'); if (sr) slRealOn = !!sr.val; } catch(e) {}
        var slAktiv  = slRealOn || safeState('klima.schlafzimmer.aktiv', false);
        var slStart  = safeState('klima.schlafzimmer.start_zeit',  0);
        var slPause  = safeState('klima.schlafzimmer.pause_start', 0);
        var slGrund  = slRealOn && !safeState('klima.schlafzimmer.aktiv', false) ? 'Extern EIN (Shadow State veraltet)' : safeState('klima.schlafzimmer.grund', '-');
        var slTemp   = null;
        try { var zs = getState('zigbee.0.a4c1388f0b92eb71.temperature'); if (zs && zs.val !== null) slTemp = zs.val; } catch(e) {}

        var trRealOn = false;
        try { var tr = getState('tuya.0.0.121075124022d88f2e59.1'); if (tr) trRealOn = !!tr.val; } catch(e) {}
        var trAktiv  = trRealOn || safeState('klima.treppe.aktiv', false);
        var trStart  = safeState('klima.treppe.start_zeit',  0);
        var trPause  = safeState('klima.treppe.pause_start', 0);
        var trGrund  = trRealOn && !safeState('klima.treppe.aktiv', false) ? 'Extern EIN (Shadow State veraltet)' : safeState('klima.treppe.grund', '-');
        var trTemp   = null;
        try { var zt = getState('zigbee.0.a4c138d0a5ca4495.local_temperature'); if (zt && zt.val !== null) trTemp = zt.val; } catch(e) {}

        sendTo('telegram.0',
            '❄️ Klimaanlagen\n\n' +
            '🛏 Schlafzimmer (Midea)\n' +
            klimaStatus(slAktiv, slStart, slPause, slTemp, slGrund) + '\n\n' +
            '🏠 Treppenhaus (Tuya)\n' +
            klimaStatus(trAktiv, trStart, trPause, trTemp, trGrund) + '\n\n' +
            '/klima ein — Schlafzimmer einschalten\n' +
            '/klima aus — Schlafzimmer ausschalten'
        );

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

        setState('midea.0.153931628437826.powerState', false);
        setState('javascript.0.klima.schlafzimmer.aktiv',       { val: false,      ack: true });
        setState('javascript.0.klima.schlafzimmer.pause_start', { val: Date.now(), ack: true });
        setState('javascript.0.klima.schlafzimmer.grund',       { val: 'Manuell AUS via Telegram', ack: true });

        sendTo('telegram.0', '❄️ Klimaanlage AUS (manuell)\n⏸ 1h Pause — keine Auto-Einschaltung');

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

    // --- Windrose (Richtungsverteilung + Böen) ---

    } else if (cmd === '/wind') {

        var EIN_TAG    = 24 * 3600 * 1000;
        var jetzt      = Date.now();
        var start30    = jetzt - 30 * EIN_TAG;
        var heuteAnf   = new Date(); heuteAnf.setHours(0, 0, 0, 0);
        var heuteStart = heuteAnf.getTime();

        var himmel = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
        var padR = function(s, n) { s = String(s); while (s.length < n) s += ' '; return s; };
        var padL = function(s, n) { s = String(s); while (s.length < n) s = ' ' + s; return s; };

        // 1) Erster Windrichtungs-Datenpunkt (für "seit")
        sendTo('influxdb.0', 'getHistory', {
            id: 'javascript.0.wetter.aktuell.windrichtung',
            options: { start: new Date(2026, 0, 1).getTime(), end: jetzt, count: 1, aggregate: 'none', addId: false }
        }, function(firstRes) {

            var seitTxt = '';
            if (firstRes.result && firstRes.result[0] && firstRes.result[0].ts) {
                var d = new Date(firstRes.result[0].ts);
                seitTxt = 'seit ' + d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear();
            }

            // 2) Windrichtung roh (30 Tage) → Sektoren zählen
            sendTo('influxdb.0', 'getHistory', {
                id: 'javascript.0.wetter.aktuell.windrichtung',
                options: { start: start30, end: jetzt, aggregate: 'none', addId: false }
            }, function(dirRes) {

                var sektor = [0, 0, 0, 0, 0, 0, 0, 0], gesamt = 0;
                (dirRes.result || []).forEach(function(p) {
                    if (p.val === null || p.val === undefined) return;
                    var g = ((p.val % 360) + 360) % 360;
                    sektor[Math.floor(((g + 22.5) % 360) / 45)]++;
                    gesamt++;
                });

                // 3) Windgeschwindigkeit roh (30 Tage) → Ø
                sendTo('influxdb.0', 'getHistory', {
                    id: 'javascript.0.wetter.aktuell.wind',
                    options: { start: start30, end: jetzt, aggregate: 'none', addId: false }
                }, function(spdRes) {

                    var sum = 0, cnt = 0;
                    (spdRes.result || []).forEach(function(p) { if (p.val != null) { sum += p.val; cnt++; } });
                    var avg = cnt ? Math.round(sum / cnt * 10) / 10 : null;

                    // 4) Böen roh (30 Tage) → Max gesamt + Max heute
                    sendTo('influxdb.0', 'getHistory', {
                        id: 'javascript.0.wetter.aktuell.windboee',
                        options: { start: start30, end: jetzt, aggregate: 'none', addId: false }
                    }, function(gustRes) {

                        var max30 = 0, maxHeute = 0;
                        (gustRes.result || []).forEach(function(p) {
                            if (p.val == null) return;
                            if (p.val > max30) max30 = p.val;
                            if (p.ts >= heuteStart && p.val > maxHeute) maxHeute = p.val;
                        });

                        if (gesamt === 0) {
                            sendTo('telegram.0', '🌬️ Windrichtung — noch keine Daten.\nDas Logging läuft erst seit heute, die Windrose füllt sich über die nächsten Tage.');
                            return;
                        }

                        var rose = '';
                        for (var i = 0; i < 8; i++) {
                            var pct  = Math.round(sektor[i] / gesamt * 100);
                            var voll = Math.round(pct / 100 * 10);
                            var bar  = '';
                            for (var b = 0; b < 10; b++) bar += (b < voll ? '▓' : '░');
                            rose += padR(himmel[i], 3) + bar + ' ' + padL(pct + '%', 4) +
                                    (himmel[i] === 'SO' ? '  ← Erler Wind' : '') + '\n';
                        }

                        sendTo('telegram.0', {
                            text: '🌬️ <b>Windverteilung</b> — letzte 30 Tage' + (seitTxt ? ' (' + seitTxt + ')' : '') + '\n' +
                                  '<pre>' + rose + '</pre>' +
                                  'Ø ' + (avg != null ? avg : '?') + ' km/h · max Böe ' + Math.round(max30) + ' km/h\n' +
                                  '💨 Stärkste Böe heute: ' + Math.round(maxHeute) + ' km/h',
                            parse_mode: 'HTML'
                        });
                    });
                });
            });
        });

    // --- Warmwasser Nachtverlust (Schwerkraftbremsen-Check) ---

    } else if (cmd === '/wwnacht') {

        var wwDatum = safeState('zirkulation.monitor.datum', '');
        if (!wwDatum) {
            sendTo('telegram.0', '🌙 Noch keine Nacht-Messung vorhanden.\nErste Auswertung nach 04:50 Uhr.');
        } else {
            var wwStartO = safeState('zirkulation.monitor.start_oben',  0);
            var wwEndO   = safeState('zirkulation.monitor.end_oben',    0);
            var wwStartU = safeState('zirkulation.monitor.start_unten', 0);
            var wwEndU   = safeState('zirkulation.monitor.end_unten',   0);
            var wwDelta  = safeState('zirkulation.monitor.delta_nacht', 0);
            var wwRate   = safeState('zirkulation.monitor.rate_nacht',  0);
            var wwKwh    = safeState('zirkulation.monitor.verlust_kwh', null);
            var wwBew    = safeState('zirkulation.monitor.bewertung',   '-');

            sendTo('telegram.0',
                '🌙 Warmwasser-Nachtverlust (' + wwDatum + ')\n' +
                '   Zirkulation aus, 21:10 → 05:40\n\n' +
                '🌡️ oben: ' + wwStartO + '→' + wwEndO + '°C (Δ' + wwDelta + '°C)\n' +
                (wwStartU > 0 ? '🌡️ unten: ' + wwStartU + '→' + wwEndU + '°C\n' : '') +
                '📉 Rate: ' + wwRate + ' °C/h\n' +
                (wwKwh !== null ? '🔥 ~' + wwKwh + ' kWh/Tag (Boiler-Standby laut Datenblatt: 2,5 kWh/Tag)\n' : '') +
                '\n📋 ' + wwBew + '\n\n' +
                'Richtwert: ~0,2–0,4 °C/h = normaler Dämmverlust.'
            );
        }

    // --- Hilfe ---

    } else if (cmd === '/hilfe' || cmd === '/start') {

        sendTo('telegram.0',
            '📋 Verfügbare Befehle:\n\n' +
            '/status — Heizung & Energie Überblick\n' +
            '/forecast — Wettervorschau morgen & übermorgen\n' +
            '/wetter — Regen & Temperatur letzte 7 Tage\n' +
            '/wind — Windrose & stärkste Böe (30 Tage)\n' +
            '/wwnacht — Warmwasser-Nachtverlust (Schwerkraftbremse)\n' +
            '/zaehler — Wasserzähler ablesen (Haupt Kalt Warm WM Pool)\n' +
            '/verbrauch — Wasserverbrauch gesamt seit Jahresanfang\n' +
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
