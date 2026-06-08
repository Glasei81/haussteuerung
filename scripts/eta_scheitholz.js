// ============================================
// ETA Scheitholz Script
// Scheitholzkessel Status alle 5 Minuten
// Stand: 08.06.2026
// ============================================

var http = require('http');

var ETA_IP   = '192.168.178.5';
var ETA_PORT = 8080;

var DATENPUNKTE = [
    // Spalten: [statePath, uri, name, unit, role, type]
    ['eta.scheitholz.zustand',      '/272/10921/0/0/12000',      'Scheitholz Zustand',          '',    'text',        'string'],
    ['eta.scheitholz.isoliertuere', '/272/10921/0/11193/2016',   'Scheitholz Isoliertüre',      '',    'text',        'string'],
    ['eta.scheitholz.waermemenge',  '/272/10921/14877/0/2273',   'Scheitholz Wärmemenge gesamt','kWh', 'value',       'number'],
    ['eta.scheitholz.leistung',     '/272/10921/14877/0/2287',   'Scheitholz Leistung',         'kW',  'value.power', 'number'],
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
    req.on('error', function(e) { log('ETA Scheitholz Fehler ' + uri + ': ' + e.message, 'error'); });
    req.end();
}

function scheitholzLesen() {
    DATENPUNKTE.forEach(function(dp) {
        etaLesen(dp[1], dp[0], dp[5] === 'string');
    });
    log('ETA Scheitholz: ' + DATENPUNKTE.length + ' Datenpunkte abgerufen');
}

scheitholzLesen();
schedule('*/5 * * * *', function() { scheitholzLesen(); });
log('ETA Scheitholz Script gestartet');
