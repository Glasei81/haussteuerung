// ============================================
// InfluxDB Setup — Vollständige Konfiguration
// ETA + Solarmanager + Wetterstation
//
// Ersetzt influxdb_setup_eta.js.
// Läuft bei jedem ioBroker-Start (idempotent —
// bereits aktive Datenpunkte werden nur aktualisiert).
//
// Warum welcher Tier:
//   TIER 1 — Energiebilanz: ohne diese Werte keine Aussage möglich
//   TIER 2 — Betrieb & Verschleiß: langfristig wertvoll, geringer Overhead
//   TIER 3 — Wetter & Klima: Korrelationsanalyse mit Heizverbrauch
//   NICHT aufzeichnen: Text-Zustände, Aliase, gestrige Werte (schon
//                      in der Historie), Timestamps, booleans ohne Trend
// ============================================

var INFLUX = 'influxdb.0';

// changesOnly: false → jeden Poll-Wert schreiben (saubere Zeitreihe
//   auch wenn Wert gleich bleibt — wichtig bei 5/10-Min-Polling)
var OPT_NORMAL = { changesOnly: false, debounce: 0, maxLength: 0, retention: 0, aliasId: '' };

// changesOnly: true → nur bei Wertänderung (für langsam ändernde Zähler)
var OPT_COUNTER = { changesOnly: true,  debounce: 0, maxLength: 0, retention: 0, aliasId: '' };

var DATENPUNKTE = [

    // =========================================================
    // TIER 1 — Energiebilanz ETA (Pflicht für alle Auswertungen)
    // =========================================================

    // Puffer 1 Schichtung (5 Fühler) + Ladezustand
    // → Wärmeverlust-Kurve, Ladeprofile, Thermokline sichtbar
    { id: 'javascript.0.eta.puffer.fuehler1',       opt: OPT_NORMAL  },  // oben
    { id: 'javascript.0.eta.puffer.fuehler2',       opt: OPT_NORMAL  },
    { id: 'javascript.0.eta.puffer.fuehler3',       opt: OPT_NORMAL  },  // mitte (Thermokline)
    { id: 'javascript.0.eta.puffer.fuehler4',       opt: OPT_NORMAL  },
    { id: 'javascript.0.eta.puffer.fuehler5',       opt: OPT_NORMAL  },  // unten
    { id: 'javascript.0.eta.puffer.ladung',         opt: OPT_NORMAL  },  // % → quantitativer Energieinhalt

    // Puffer 2 Schichtung (600L Keller) + Ladezustand
    // → Heizstab-Effizienz, Solarthermie-Einspeisung
    { id: 'javascript.0.eta.puffer2.oben',          opt: OPT_NORMAL  },
    { id: 'javascript.0.eta.puffer2.mitte',         opt: OPT_NORMAL  },
    { id: 'javascript.0.eta.puffer2.unten',         opt: OPT_NORMAL  },
    { id: 'javascript.0.eta.puffer2.ladung',        opt: OPT_NORMAL  },

    // Warmwasser
    // → tägliche Verbrauchsmuster, Legionellenschutz-Nachweis
    { id: 'javascript.0.eta.warmwasser.oben',       opt: OPT_NORMAL  },
    { id: 'javascript.0.eta.warmwasser.unten',      opt: OPT_NORMAL  },  // Stratifikation im WW-Speicher

    // Heizkreise — Spreizung = Wärmeleistung ohne Durchflusssensor
    // → Vorlauf − Rücklauf × const = näherungsweise Heizleistung
    { id: 'javascript.0.eta.hk.vorlauf',            opt: OPT_NORMAL  },  // Heizkörper EG
    { id: 'javascript.0.eta.hk.ruecklauf',          opt: OPT_NORMAL  },
    { id: 'javascript.0.eta.fbh.vorlauf',           opt: OPT_NORMAL  },  // Fußbodenheizung OG
    { id: 'javascript.0.eta.fbh.ruecklauf',         opt: OPT_NORMAL  },

    // Pellets — Leistung live + täglicher Ertrag
    // → Brennerstunden, Effizienz-Trend
    { id: 'javascript.0.eta.pellets.leistung',      opt: OPT_NORMAL  },
    { id: 'javascript.0.eta.pellets.ertrag_heute',  opt: OPT_NORMAL  },  // kWh täglich (reset um Mitternacht)

    // Scheitholz — Leistung live + täglicher Ertrag
    { id: 'javascript.0.eta.holz.leistung',         opt: OPT_NORMAL  },
    { id: 'javascript.0.eta.holz.ertrag_heute',     opt: OPT_NORMAL  },

    // Solarthermie — Leistung + täglicher Ertrag
    // → Kollektor-Effizienz: Vorlauf − Rücklauf × Pumpenleistung
    { id: 'javascript.0.eta.solar.vorlauf',         opt: OPT_NORMAL  },
    { id: 'javascript.0.eta.solar.ruecklauf',       opt: OPT_NORMAL  },
    { id: 'javascript.0.eta.solar.ertrag_heute',    opt: OPT_NORMAL  },

    // Außentemperatur ETA (eigener Sensor der Heizung)
    // → Korrelation: Außentemp vs Verbrauch (Heizkennlinie)
    { id: 'javascript.0.eta.aussen.temperatur',     opt: OPT_NORMAL  },

    // =========================================================
    // TIER 1 — Energiebilanz Solar (Pflicht)
    // =========================================================

    // PV — Leistung + Tagesertrag
    // (1-Min-Polling → in Grafana aggregateWindow(5m) verwenden!)
    { id: 'javascript.0.solar.pv.watt',             opt: OPT_NORMAL  },
    { id: 'javascript.0.solar.pv.today',            opt: OPT_NORMAL  },  // kWh heute kumuliert

    // Netzbezug/-einspeisung (positiv = Bezug, negativ = Einspeisung)
    { id: 'javascript.0.solar.netz.watt',           opt: OPT_NORMAL  },

    // Hausverbrauch gesamt
    { id: 'javascript.0.solar.verbrauch.watt',      opt: OPT_NORMAL  },

    // Batterie
    { id: 'javascript.0.solar.batterie.soc',        opt: OPT_NORMAL  },  // % Ladestand
    { id: 'javascript.0.solar.batterie.watt',       opt: OPT_NORMAL  },  // positiv = laden

    // Heizstäbe (elektrische Wärmezufuhr → Term der Hauswärmebilanz)
    { id: 'javascript.0.solar.puffer2.watt',        opt: OPT_NORMAL  },  // Puffer2 Pro3 (Relais-IDs noch prüfen)
    { id: 'javascript.0.solar.heizstab.puffer_watt', opt: OPT_NORMAL },  // myPV Puffer (wattgenau)
    { id: 'javascript.0.solar.heizstab.ww_watt',     opt: OPT_NORMAL },  // myPV WW (wattgenau)

    // =========================================================
    // TIER 1 — Wetter (für alle Korrelationsanalysen nötig)
    // =========================================================

    // Eigene Wetterstation IRAUBL19 (10-Min-Auflösung)
    { id: 'javascript.0.wetter.aktuell.temperatur',            opt: OPT_NORMAL  },  // Außen-Vergleich (roh, Betondach-Bias)
    { id: 'javascript.0.wetter.aktuell.temperatur_korrigiert', opt: OPT_NORMAL  },  // Median ETA/Nord/Süd/WS
    { id: 'javascript.0.wetter.aktuell.solar',                 opt: OPT_NORMAL  },  // W/m² → PV-Korrelation

    // Warmwasser-Nachtverlust (Schwerkraftbremsen-Diagnose, 1×/Nacht)
    { id: 'javascript.0.zirkulation.monitor.rate_nacht',       opt: OPT_COUNTER },  // °C/h Abkühlrate
    { id: 'javascript.0.zirkulation.monitor.delta_nacht',      opt: OPT_COUNTER },  // °C Abfall oben

    // TRV Heizkörperthermostate EG (Sonoff TRVZB) — Heizprofil je Raum
    // Ist + Soll + Batterie direkt vom Gerät, heizt (1/0) aus trv_heizkoerper.js.
    // Kein pi_heating_demand am TRVZB → running_state als Heizquote-Proxy.
    // #1 Gang EG (0x983268fffe97aab4) — weitere TRVs hier nach gleichem Muster:
    { id: 'zigbee.0.983268fffe97aab4.local_temperature',         opt: OPT_NORMAL  },  // Gang EG Ist
    { id: 'zigbee.0.983268fffe97aab4.occupied_heating_setpoint', opt: OPT_COUNTER },  // Gang EG Soll (ändert selten)
    { id: 'zigbee.0.983268fffe97aab4.battery',                   opt: OPT_COUNTER },  // Gang EG Batterie
    { id: 'javascript.0.trv.gang_eg.heizt',                      opt: OPT_COUNTER },  // Gang EG heizt 1/0

    // =========================================================
    // TIER 2 — Betrieb & Verschleiß (langfristig wertvoll)
    // =========================================================

    // Pellets — Wartungsindikatoren + Verbrauchsbilanz
    { id: 'javascript.0.eta.pellets.behaelter_inhalt',   opt: OPT_NORMAL  },  // kg → wann nachfüllen
    { id: 'javascript.0.eta.pellets.verbrauch_gesamt',   opt: OPT_COUNTER },  // kg total (Zähler)
    { id: 'javascript.0.eta.pellets.volllaststunden',    opt: OPT_COUNTER },  // h → Wartungsintervall
    { id: 'javascript.0.eta.pellets.heizbetriebe',       opt: OPT_COUNTER },  // Starts → Verschleiß
    { id: 'javascript.0.eta.pellets.zuendungen',         opt: OPT_COUNTER },  // Zündungen → Verschleiß
    { id: 'javascript.0.eta.pellets.kesseldruck',        opt: OPT_NORMAL  },  // bar → Druckabfall = Wartung fällig

    // Scheitholz — Verbrauchsbilanz + Wartung
    { id: 'javascript.0.eta.holz.energie_gesamt',        opt: OPT_COUNTER },  // kWh kumuliert
    { id: 'javascript.0.eta.holz.volllaststunden',       opt: OPT_COUNTER },
    { id: 'javascript.0.eta.holz.heizbetriebe',          opt: OPT_COUNTER },

    // Solarthermie — kumulierter Ertrag
    { id: 'javascript.0.eta.solar.waermemenge',          opt: OPT_COUNTER },  // kWh gesamt

    // =========================================================
    // TIER 3 — Klima & Komfort (Langzeit-Klimastatistik)
    // =========================================================

    { id: 'javascript.0.wetter.aktuell.feuchte',         opt: OPT_NORMAL  },  // % → Behaglichkeit, Taupunkt
    { id: 'javascript.0.wetter.aktuell.druck',           opt: OPT_NORMAL  },  // hPa → Wetterfront-Erkennung
    { id: 'javascript.0.wetter.aktuell.wind',            opt: OPT_NORMAL  },  // km/h
    { id: 'javascript.0.wetter.aktuell.windboee',        opt: OPT_NORMAL  },  // km/h → Sturmstatistik
    { id: 'javascript.0.wetter.aktuell.windrichtung',    opt: OPT_NORMAL  },  // Grad → Windrad-Analyse (Erler Wind aus SO)
    { id: 'javascript.0.wetter.aktuell.regen_rate',      opt: OPT_NORMAL  },  // mm/h → Starkregen-Events
    { id: 'javascript.0.wetter.aktuell.regen_gesamt',    opt: OPT_COUNTER },  // mm täglich kumuliert
    { id: 'javascript.0.wetter.aktuell.uv',              opt: OPT_NORMAL  },  // UV-Index → PV-Korrelation

    // =========================================================
    // TIER 2 — Raumklima Zigbee (event-driven, minimaler Overhead)
    // =========================================================

    // Sensoren (TH02Z) — temperature + humidity
    { id: 'zigbee.0.a4c13829dfc9b6a6.temperature',      opt: OPT_NORMAL  },
    { id: 'zigbee.0.a4c13829dfc9b6a6.humidity',         opt: OPT_NORMAL  },
    { id: 'zigbee.0.a4c138b099b0852f.temperature',      opt: OPT_NORMAL  },
    { id: 'zigbee.0.a4c138b099b0852f.humidity',         opt: OPT_NORMAL  },

    // Sensoren (ZTH05_1) — temperature + humidity
    { id: 'zigbee.0.a4c13894b001e9c9.temperature',      opt: OPT_NORMAL  },
    { id: 'zigbee.0.a4c13894b001e9c9.humidity',         opt: OPT_NORMAL  },
    { id: 'zigbee.0.a4c138a8b3f53353.temperature',      opt: OPT_NORMAL  },
    { id: 'zigbee.0.a4c138a8b3f53353.humidity',         opt: OPT_NORMAL  },
    { id: 'zigbee.0.a4c1388161f407cf.temperature',      opt: OPT_NORMAL  },
    { id: 'zigbee.0.a4c1388161f407cf.humidity',         opt: OPT_NORMAL  },

    // Sensor (TH01) — Schlafzimmer (bestätigt in klima_logik.js)
    { id: 'zigbee.0.a4c1388f0b92eb71.temperature',      opt: OPT_NORMAL  },
    { id: 'zigbee.0.a4c1388f0b92eb71.humidity',         opt: OPT_NORMAL  },

    // Thermostate (BHT-002) — local_temperature = gemessene Raumtemperatur
    { id: 'zigbee.0.9035eafffe2a7ad9.local_temperature', opt: OPT_NORMAL },
    { id: 'zigbee.0.2c1165fffe52fc24.local_temperature', opt: OPT_NORMAL },

    // Thermostate (ZHT-002) — Gang/Treppenhaus + Gang/Schlafzimmer (neu)
    { id: 'zigbee.0.a4c1387b40e90364.local_temperature', opt: OPT_NORMAL },
    { id: 'zigbee.0.a4c138d0a5ca4495.local_temperature', opt: OPT_NORMAL },

];

// =========================================================
// BEWUSST NICHT AUFGEZEICHNET — Begründung:
// =========================================================
//
//   eta.puffer.oben          → Alias für fuehler1, identische Daten
//   eta.pellets.ertrag_gestern / holz.ertrag_gestern / solar.ertrag_gestern
//                            → gestern ist schon in der Historie von ertrag_heute
//   eta.warmwasser.soll      → ändert sich kaum, kein Trend
//   eta.warmwasser.zustand / hk.zustand / fbh.zustand / solar.zustand
//   eta.pellets.zustand / holz.zustand
//                            → Text-Felder, nicht für Zeitreihen geeignet
//                              (in ioBroker Admin lesbar, kein InfluxDB-Wert)
//   eta.pellets.kessel_soll / eta.pellets.ruecklauf / eta.holz.ruecklauf
//                            → wenig Aussagekraft, Rücklauf-Wert nicht für Spreizung
//                              relevant (keine Pumpensteuerung unsererseits)
//   eta.holz.zuendungen / holz.kesseldruck
//                            → Holz-Kesseldruck nicht aussagekräftig (Naturzug)
//   solar.switch             → boolean, kein Trend
//   solar.puffer.temperatur  → myPV Sensor, weitgehend redundant zu eta.warmwasser
//   wetter.forecast.*        → Vorhersagedaten, keine Messwerte
//   wetter.pv.prognose_morgen → Text, nicht numerisch
//   wetter.aktuell.timestamp  → kein Messwert
//   zigbee.*.occupied_heating_setpoint (OG FBH-Thermostate)
//                            → Soll-Werte der FBH-Thermostate, kein Messwert
//                              (AUSNAHME: EG-TRVs oben aktiv geloggt — für Regelabweichung
//                               Ist vs. Soll + spätere ETA-Vorlauflogik)
//   zigbee.*.battery         → Batteriestand, interessant aber niedrige Frequenz
//                              (bei Bedarf ergänzen)

// =========================================================

log('InfluxDB Setup startet — wartet 15s auf influxdb.0...');

setTimeout(function () {
    var ok = 0;
    var fehler = 0;

    // Nur States aktivieren die es auch gibt. enableHistory auf ein nicht
    // existierendes Objekt legt sonst ein kaputtes Objekt an (type=undefined).
    // Wichtig bei noch nicht angelernten Geräten / noch nicht laufenden Scripts
    // (z.B. weitere TRVs, deren State erst trv_heizkoerper.js erzeugt).
    var vorhanden = [];
    DATENPUNKTE.forEach(function (dp) {
        if (existsObject(dp.id)) {
            vorhanden.push(dp);
        } else {
            log('InfluxDB übersprungen (Objekt fehlt noch): ' + dp.id, 'warn');
        }
    });

    var uebersprungen = DATENPUNKTE.length - vorhanden.length;
    var offen = vorhanden.length;

    log('InfluxDB Setup: aktiviere ' + offen + ' Datenpunkte' +
        (uebersprungen ? ' (' + uebersprungen + ' übersprungen)' : '') + '...');

    if (offen === 0) {
        log('InfluxDB Setup: nichts zu aktivieren');
        return;
    }

    vorhanden.forEach(function (dp) {
        sendTo(INFLUX, 'enableHistory', { id: dp.id, options: dp.opt }, function (result) {
            offen--;
            if (result && result.error) {
                if (result.error === 'timeout') {
                    // Adapter noch nicht bereit — Konfiguration trotzdem meistens übernommen
                    log('WARNUNG ' + dp.id + ': timeout (Logging meist trotzdem aktiv)', 'warn');
                } else {
                    log('FEHLER ' + dp.id + ': ' + result.error, 'error');
                    fehler++;
                }
            } else {
                ok++;
            }
            if (offen === 0) {
                log('InfluxDB Setup abgeschlossen: ' + ok + ' aktiviert, ' + fehler + ' Fehler' +
                    (uebersprungen ? ', ' + uebersprungen + ' übersprungen' : ''));
            }
        });
    });

}, 15000);
