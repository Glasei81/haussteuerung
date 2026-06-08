// ============================================
// ETA Puffer 2 Script
// Puffer 2 (600L Keller) Sensoren alle 5 Min
// Stand: 08.06.2026
// ============================================

var http = require('http');

var ETA_IP   = '192.168.178.5';
var ETA_PORT = 8080;

var DATENPUNKTE = [
    // Spalten: [statePath, uri, name, unit, role, type]
    ['eta.puffer2.oben',       '/121/10601/0/11327/2002', 'Puffer2 oben',         '°C', 'value.temperature', 'number'],
    ['eta.puffer2.mitte',      '/121/10601/0/11328/2002', 'Puffer2 mitte',        '°C', 'value.temperature', 'number'],
    ['eta.puffer2.unten',      '/121/10601/0/11329/2002', 'Puffer2 unten',        '°C', 'value.temperature', 'number'],
    ['eta.puffer2.ladepumpe',  '/121/10601/0/11157/2002', 'Puffer2 Ladepumpe',   '',   'text',              'string'],
    ['eta.puffer2.ladezustand','/121/10601/0/0/12528',    'Puffer2 Ladezustand', '%',  'value',             'number'],
];

DATENPUNKTE.forEach(function(dp) {
    createState(dp[0], dp[5] === 'string' ? '' : 0, {
        name: dp[2], type: dp[5], unit: dp[3], role: dp[4], read: true, write: false
    });
});

function etaLesen(uri, statePath, isString) {
    var options = { host: ETA_IP, port: ETA_PORT, path: '/user/var' + uri, method: 'GET' };
    var req = http.request(options, function(res) {
        var data = '';
        res.on('data', function(c) { data += c; });
        res.on('end', function() {
            var match = data.match(/strValue="([^"]+)"/);
            if (!match) return;
            if (isString) {
                setState('javascript.0.' + statePath, { val: match[1], ack: true });
            } else {
                var val = parseFloat(match[1].replace(',', '.'));
                if (!isNaN(val)) setState('javascript.0.' + statePath, { val: val, ack: true });
            }
        });
    });
    req.on('error', function(e) { log('ETA Puffer2 Fehler ' + uri + ': ' + e.message, 'error'); });
    req.end();
}

function puffer2Lesen() {
    DATENPUNKTE.forEach(function(dp) {
        etaLesen(dp[1], dp[0], dp[5] === 'string');
    });
    log('ETA Puffer2: ' + DATENPUNKTE.length + ' Datenpunkte abgerufen');
}

puffer2Lesen();
schedule('*/5 * * * *', function() { puffer2Lesen(); });
log('ETA Puffer2 Script gestartet');
