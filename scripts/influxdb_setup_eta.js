// ============================================
// InfluxDB Setup — ETA Datenpunkte aktivieren
// Einmalig ausführen in ioBroker, danach löschen
// InfluxDB: http://192.168.178.130:8086 (Bucket: wetter, Org: iobroker)
// ============================================

var INFLUX_ADAPTER = 'influxdb.0';

// changesOnly: false -> jeden Wert aufzeichnen (5-Min-Polling = saubere Zeitreihe)
// maxLength: 0       -> unbegrenzt (Retention via InfluxDB Policy regeln)
// retention: 0       -> Retention Policy des Adapters (Standard)
var OPTIONEN = {
    changesOnly: false,
    debounce: 0,
    maxLength: 0,
    retention: 0,
    aliasId: ''
};

var DATENPUNKTE = [

    // === TIER 1 — immer aufzeichnen ===

    // Puffer 1a/1b Schichtung + Ladung
    'javascript.0.eta.puffer.fuehler1',
    'javascript.0.eta.puffer.fuehler2',
    'javascript.0.eta.puffer.fuehler3',
    'javascript.0.eta.puffer.fuehler4',
    'javascript.0.eta.puffer.fuehler5',
    'javascript.0.eta.puffer.ladung',

    // Puffer 2 (600L Keller)
    'javascript.0.eta.puffer2.oben',
    'javascript.0.eta.puffer2.mitte',
    'javascript.0.eta.puffer2.unten',
    'javascript.0.eta.puffer2.ladung',

    // Außentemperatur
    'javascript.0.eta.aussen.temperatur',

    // Warmwasser
    'javascript.0.eta.warmwasser.oben',

    // Solar Ertrag
    'javascript.0.eta.solar.ertrag_heute',

    // Pellets live + Ertrag
    'javascript.0.eta.pellets.leistung',
    'javascript.0.eta.pellets.ertrag_heute',

    // Scheitholz live + Ertrag
    'javascript.0.eta.holz.leistung',
    'javascript.0.eta.holz.ertrag_heute',

    // === TIER 2 — sinnvoll ===

    // Heizkreis HK + FBH Spreizung
    'javascript.0.eta.hk.vorlauf',
    'javascript.0.eta.hk.ruecklauf',
    'javascript.0.eta.fbh.vorlauf',
    'javascript.0.eta.fbh.ruecklauf',

    // Solar Kollektoreffizienz
    'javascript.0.eta.solar.vorlauf',
    'javascript.0.eta.solar.ruecklauf',

    // Pellets Verbrauch + Verschleiß
    'javascript.0.eta.pellets.behaelter_inhalt',
    'javascript.0.eta.pellets.verbrauch_gesamt',
    'javascript.0.eta.pellets.volllaststunden',
    'javascript.0.eta.pellets.heizbetriebe',

    // Scheitholz kumuliert
    'javascript.0.eta.holz.volllaststunden',
    'javascript.0.eta.holz.energie_gesamt',

    // Solar kumuliert
    'javascript.0.eta.solar.waermemenge',

];

// === TIER 3 — optional, bei Bedarf auskommentieren ===
// 'javascript.0.eta.warmwasser.unten',       // wenn WW-Logik aktiv
// 'javascript.0.eta.pellets.kesseldruck',    // nur Fehlerdiagnose
// 'javascript.0.eta.pellets.zuendungen',     // Statistik
// 'javascript.0.eta.solar.zustand',          // Betriebszeiten
// 'javascript.0.eta.pellets.zustand',        // Betriebszeiten
// 'javascript.0.eta.holz.zustand',           // Betriebszeiten

// ============================================

var ok = 0;
var fehler = 0;
var offen = DATENPUNKTE.length;

log('InfluxDB Setup startet — ' + offen + ' Datenpunkte werden aktiviert...');

DATENPUNKTE.forEach(function(id) {
    sendTo(INFLUX_ADAPTER, 'enableHistory', { id: id, options: OPTIONEN }, function(result) {
        offen--;
        if (result && result.error) {
            log('FEHLER ' + id + ': ' + result.error, 'error');
            fehler++;
        } else {
            log('OK: ' + id);
            ok++;
        }
        if (offen === 0) {
            log('InfluxDB Setup abgeschlossen: ' + ok + ' aktiviert, ' + fehler + ' Fehler');
        }
    });
});
