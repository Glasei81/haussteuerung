// ============================================
// ETA Script
// Liest ETA REST API alle 5 Minuten
// Stand: Mai 2026
// ============================================

var http = require('http');

var ETA_IP   = '192.168.178.5';
var ETA_PORT = 8080;

var ETA_URIS = {
    puffer_oben:        '/272/10601/0/0/13191',
    puffer_unten:       '/272/10601/0/0/13192',
    puffer_ladung:      '/272/10601/0/0/12528',
    pellets_zustand:    '/264/10891/0/0/12000',
    holz_zustand:       '/272/10921/0/0/12000',
    aussen_temp:        '/121/10241/0/0/12197',
    warmwasser_oben:    '/121/10111/0/0/12271',
};

var states = [
    ['eta.puffer.oben',          'Puffer oben',       'number', '°C', 'value.temperature'],
    ['eta.puffer.unten',         'Puffer unten',      'number', '°C', 'value.temperature'],
    ['eta.puffer.ladung',        'Puffer Ladung',     'number', '%',  'value'],
    ['eta.pellets.zustand',      'Pellets Zustand',   'number', '',   'value'],
    ['eta.holz.zustand',         'Holz Zustand',      'number', '',   'value'],
    ['eta.aussen.temperatur',    'Aussentemperatur',  'number', '°C', 'value.temperature'],
    ['eta.warmwasser.oben',      'Warmwasser oben',   'number', '°C', 'value.temperature'],
];

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
                }
            }
        });
    });
    req.on('error', function(e) { log('ETA Fehler ' + uri + ': ' + e.message, 'error'); });
    req.end();
}

function alleEtaWerteLesen() {
    Object.keys(ETA_URIS).forEach(function(key) {
        var mapping = {
            'puffer_oben':       'eta.puffer.oben',
            'puffer_unten':      'eta.puffer.unten',
            'puffer_ladung':     'eta.puffer.ladung',
            'pellets_zustand':   'eta.pellets.zustand',
            'holz_zustand':      'eta.holz.zustand',
            'aussen_temp':       'eta.aussen.temperatur',
            'warmwasser_oben':   'eta.warmwasser.oben',
        };
        etaLesen(ETA_URIS[key], mapping[key]);
    });
}

alleEtaWerteLesen();
schedule('*/5 * * * *', function() { alleEtaWerteLesen(); });
log('ETA Script gestartet');
