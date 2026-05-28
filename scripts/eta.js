// ============================================
// ETA Script
// Liest ETA REST API alle 5 Minuten
// Stand: Mai 2026 | Erweitert: 28.05.2026
// ============================================

var http = require('http');

var ETA_IP   = '192.168.178.5';
var ETA_PORT = 8080;

var ETA_URIS = {
    // Puffer 1a/1b — Fühler 1+5 bekannt, 2-4 nach Umbau prüfen
    puffer_fuehler1:    '/272/10601/0/0/13191',  // oben (bekannt)
    puffer_fuehler2:    null,                     // TODO: URI prüfen (vermutlich 13193)
    puffer_fuehler3:    null,                     // TODO: URI prüfen (vermutlich 13194)
    puffer_fuehler4:    null,                     // TODO: URI prüfen (vermutlich 13195)
    puffer_fuehler5:    '/272/10601/0/0/13192',  // unten (bekannt)
    puffer_ladung:      '/272/10601/0/0/12528',

    // Warmwasser
    warmwasser_oben:    '/121/10111/0/0/12271',  // bekannt
    warmwasser_unten:   null,                     // TODO: URI nach Umbau suchen
    warmwasser_soll:    null,                     // TODO: URI nach Umbau suchen

    // Puffer 2 (600L Keller) — nach Umbau in ca. 12 Tagen
    puffer2_oben:       null,                     // TODO: URI nach Umbau suchen
    puffer2_mitte:      null,                     // TODO: URI nach Umbau suchen (optional)
    puffer2_unten:      null,                     // TODO: URI nach Umbau suchen

    // Heizung
    pellets_zustand:    '/264/10891/0/0/12000',
    holz_zustand:       '/272/10921/0/0/12000',
    aussen_temp:        '/121/10241/0/0/12197',
};

var MAPPING = {
    'puffer_fuehler1':  'eta.puffer.fuehler1',
    'puffer_fuehler2':  'eta.puffer.fuehler2',
    'puffer_fuehler3':  'eta.puffer.fuehler3',
    'puffer_fuehler4':  'eta.puffer.fuehler4',
    'puffer_fuehler5':  'eta.puffer.fuehler5',
    'puffer_ladung':    'eta.puffer.ladung',
    'warmwasser_oben':  'eta.warmwasser.oben',
    'warmwasser_unten': 'eta.warmwasser.unten',
    'warmwasser_soll':  'eta.warmwasser.soll',
    'puffer2_oben':     'eta.puffer2.oben',
    'puffer2_mitte':    'eta.puffer2.mitte',
    'puffer2_unten':    'eta.puffer2.unten',
    'pellets_zustand':  'eta.pellets.zustand',
    'holz_zustand':     'eta.holz.zustand',
    'aussen_temp':      'eta.aussen.temperatur',
};

var states = [
    // Puffer 1a/1b Schichtung
    ['eta.puffer.fuehler1',   'Puffer Fühler 1 (oben)',  'number', '°C', 'value.temperature'],
    ['eta.puffer.fuehler2',   'Puffer Fühler 2',         'number', '°C', 'value.temperature'],
    ['eta.puffer.fuehler3',   'Puffer Fühler 3',         'number', '°C', 'value.temperature'],
    ['eta.puffer.fuehler4',   'Puffer Fühler 4',         'number', '°C', 'value.temperature'],
    ['eta.puffer.fuehler5',   'Puffer Fühler 5 (unten)', 'number', '°C', 'value.temperature'],
    ['eta.puffer.ladung',     'Puffer Ladung',           'number', '%',  'value'],
    // Warmwasser
    ['eta.warmwasser.oben',   'Warmwasser oben',         'number', '°C', 'value.temperature'],
    ['eta.warmwasser.unten',  'Warmwasser unten',        'number', '°C', 'value.temperature'],
    ['eta.warmwasser.soll',   'Warmwasser Soll',         'number', '°C', 'value.temperature'],
    // Puffer 2 (nach Umbau)
    ['eta.puffer2.oben',      'Puffer 2 oben',           'number', '°C', 'value.temperature'],
    ['eta.puffer2.mitte',     'Puffer 2 mitte',          'number', '°C', 'value.temperature'],
    ['eta.puffer2.unten',     'Puffer 2 unten',          'number', '°C', 'value.temperature'],
    // Heizung
    ['eta.pellets.zustand',   'Pellets Zustand',         'number', '',   'value'],
    ['eta.holz.zustand',      'Holz Zustand',            'number', '',   'value'],
    ['eta.aussen.temperatur', 'Aussentemperatur',        'number', '°C', 'value.temperature'],
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
                    // Alias mitschreiben
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
        if (uri === null) return; // URI noch unbekannt, überspringen
        etaLesen(uri, MAPPING[key]);
    });
}

alleEtaWerteLesen();
schedule('*/5 * * * *', function() { alleEtaWerteLesen(); });
log('ETA Script gestartet');
