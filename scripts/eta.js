// ============================================
// ETA Script
// Liest ETA REST API alle 5 Minuten
// Stand: Mai 2026 | Erweitert: 28.05.2026
// URIs aus /user/menu analysiert: 28.05.2026
// ============================================

var http = require('http');

var ETA_IP   = '192.168.178.5';
var ETA_PORT = 8080;

var ETA_URIS = {
    // Puffer 1a/1b (/272/10601) — 5 Fühler
    puffer_fuehler1:    '/272/10601/0/0/13191',  // oben (bestätigt)
    puffer_fuehler2:    null,                     // TODO: testen /272/10601/0/11328/0
    puffer_fuehler3:    null,                     // TODO: testen /272/10601/0/11329/0
    puffer_fuehler4:    null,                     // TODO: testen /272/10601/0/11330/0
    puffer_fuehler5:    '/272/10601/0/0/13192',  // unten (bestätigt)
    puffer_ladung:      '/272/10601/0/0/12528',

    // Warmwasser (/121/10111) — alle URIs bestätigt via menu
    warmwasser_oben:    '/121/10111/0/0/12271',
    warmwasser_unten:   '/121/10111/0/0/12272',
    warmwasser_soll:    '/121/10111/0/0/12132',

    // Puffer 2 (600L Keller, /121/10601) — nach Umbau aktivieren
    puffer2_oben:       null,                     // bereit: /121/10601/0/0/13191
    puffer2_mitte:      null,                     // bereit: /121/10601/0/0/13934 (testen)
    puffer2_unten:      null,                     // bereit: /121/10601/0/0/13192

    // Pellets (/264/10891)
    pellets_zustand:        '/264/10891/0/0/12000',
    pellets_ertrag_heute:   '/264/10891/14877/0/12350',
    pellets_energie_gesamt: '/264/10891/14877/0/2273',
    pellets_leistung:       '/264/10891/14877/0/2287',
    pellets_volllaststunden:'/264/10891/0/0/12153',
    pellets_verbrauch:      '/264/10891/0/0/12016',
    pellets_behaelter:      '/264/10891/0/0/12011',

    // Scheitholz (/272/10921)
    holz_zustand:           '/272/10921/0/0/12000',
    holz_ertrag_heute:      '/272/10921/14877/0/12350',

    // System
    aussen_temp:            '/121/10241/0/0/12197',
};

var MAPPING = {
    'puffer_fuehler1':       'eta.puffer.fuehler1',
    'puffer_fuehler2':       'eta.puffer.fuehler2',
    'puffer_fuehler3':       'eta.puffer.fuehler3',
    'puffer_fuehler4':       'eta.puffer.fuehler4',
    'puffer_fuehler5':       'eta.puffer.fuehler5',
    'puffer_ladung':         'eta.puffer.ladung',
    'warmwasser_oben':       'eta.warmwasser.oben',
    'warmwasser_unten':      'eta.warmwasser.unten',
    'warmwasser_soll':       'eta.warmwasser.soll',
    'puffer2_oben':          'eta.puffer2.oben',
    'puffer2_mitte':         'eta.puffer2.mitte',
    'puffer2_unten':         'eta.puffer2.unten',
    'pellets_zustand':       'eta.pellets.zustand',
    'pellets_ertrag_heute':  'eta.pellets.ertrag_heute',
    'pellets_energie_gesamt':'eta.pellets.energie_gesamt',
    'pellets_leistung':      'eta.pellets.leistung',
    'pellets_volllaststunden':'eta.pellets.volllaststunden',
    'pellets_verbrauch':     'eta.pellets.verbrauch_gesamt',
    'pellets_behaelter':     'eta.pellets.behaelter_inhalt',
    'holz_zustand':          'eta.holz.zustand',
    'holz_ertrag_heute':     'eta.holz.ertrag_heute',
    'aussen_temp':           'eta.aussen.temperatur',
};

var states = [
    // Puffer 1a/1b Schichtung
    ['eta.puffer.fuehler1',        'Puffer Fühler 1 (oben)',    'number', '°C',  'value.temperature'],
    ['eta.puffer.fuehler2',        'Puffer Fühler 2',           'number', '°C',  'value.temperature'],
    ['eta.puffer.fuehler3',        'Puffer Fühler 3',           'number', '°C',  'value.temperature'],
    ['eta.puffer.fuehler4',        'Puffer Fühler 4',           'number', '°C',  'value.temperature'],
    ['eta.puffer.fuehler5',        'Puffer Fühler 5 (unten)',   'number', '°C',  'value.temperature'],
    ['eta.puffer.ladung',          'Puffer Ladung',             'number', '%',   'value'],
    // Warmwasser
    ['eta.warmwasser.oben',        'Warmwasser oben',           'number', '°C',  'value.temperature'],
    ['eta.warmwasser.unten',       'Warmwasser unten',          'number', '°C',  'value.temperature'],
    ['eta.warmwasser.soll',        'Warmwasser Soll',           'number', '°C',  'value.temperature'],
    // Puffer 2 (nach Umbau)
    ['eta.puffer2.oben',           'Puffer 2 oben',             'number', '°C',  'value.temperature'],
    ['eta.puffer2.mitte',          'Puffer 2 mitte',            'number', '°C',  'value.temperature'],
    ['eta.puffer2.unten',          'Puffer 2 unten',            'number', '°C',  'value.temperature'],
    // Pellets
    ['eta.pellets.zustand',        'Pellets Zustand',           'number', '',    'value'],
    ['eta.pellets.ertrag_heute',   'Pellets Ertrag heute',      'number', 'kWh', 'value'],
    ['eta.pellets.energie_gesamt', 'Pellets Energie gesamt',    'number', 'kWh', 'value'],
    ['eta.pellets.leistung',       'Pellets Leistung aktuell',  'number', 'kW',  'value.power'],
    ['eta.pellets.volllaststunden','Pellets Volllaststunden',   'number', 'h',   'value'],
    ['eta.pellets.verbrauch_gesamt','Pellets Verbrauch gesamt', 'number', 'kg',  'value'],
    ['eta.pellets.behaelter_inhalt','Pellets Behälter Inhalt',  'number', 'kg',  'value'],
    // Scheitholz
    ['eta.holz.zustand',           'Holz Zustand',              'number', '',    'value'],
    ['eta.holz.ertrag_heute',      'Holz Ertrag heute',         'number', 'kWh', 'value'],
    // System
    ['eta.aussen.temperatur',      'Aussentemperatur',          'number', '°C',  'value.temperature'],
];

// Alias für Kompatibilität mit eta_pellets_logik.js
createState('eta.puffer.oben', 0, {
    name: 'Puffer oben (Alias fuer fuehler1)', type: 'number', unit: '°C',
    role: 'value.temperature', read: true, write: false
});

states.forEach(function(s) {
    createState(s[0], 0, {
        name: s[1], type: s[2], unit: s[3], role: s[4], read: true, write: false
    });
});

function etaLesen(uri, datenpunkt) {
    var options = { host: ETA_IP, port: ETA_PORT, path: '/user/var' + uri, method: 'GET' };
    var req = http.request(options, function(res) {
        var data = '';
        res.on('data', function(c) { data += c; });
        res.on('end', function() {
            var match = data.match(/strValue="([^"]+)"/);
            if (match) {
                var val = parseFloat(match[1].replace(',', '.'));
                if (!isNaN(val)) {
                    setState('javascript.0.' + datenpunkt, {val: val, ack: true});
                    if (datenpunkt === 'eta.puffer.fuehler1') {
                        setState('javascript.0.eta.puffer.oben', {val: val, ack: true});
                    }
                }
            }
        });
    });
    req.on('error', function(e) { log('ETA Fehler ' + uri + ': ' + e.message, 'error'); });
    req.end();
}

function alleEtaWerteLesen() {
    Object.keys(ETA_URIS).forEach(function(key) {
        var uri = ETA_URIS[key];
        if (uri === null) return;
        etaLesen(uri, MAPPING[key]);
    });
}

alleEtaWerteLesen();
schedule('*/5 * * * *', function() { alleEtaWerteLesen(); });
log('ETA Script gestartet');
