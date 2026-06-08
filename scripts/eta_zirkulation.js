// ============================================
// ETA Zirkulation Script
// Warmwasser-Zirkulation + Ladepumpe alle 5 Min
// Stand: 08.06.2026
// ============================================

var http = require('http');

var ETA_IP   = '192.168.178.5';
var ETA_PORT = 8080;

var DATENPUNKTE = [
    // Spalten: [statePath, uri, name, unit, role, type]
    ['eta.zirkulation.status',       '/121/10111/0/0/12273', 'Zirkulation Status',         '',    'text',  'string'],
    ['eta.zirkulation.laufzeit',     '/121/10111/0/0/12174', 'Zirkulation Laufzeit',       'min', 'value', 'number'],
    ['eta.zirkulation.pause',        '/121/10111/0/0/12173', 'Zirkulation Pause',          'min', 'value', 'number'],
    ['eta.zirkulation.freigabe',     '/121/10111/0/0/12176', 'Zirkulation Freigabe',       '',    'text',  'string'],
    ['eta.warmwasser.ladepumpe',     '/121/10111/0/0/12274', 'Warmwasser Ladepumpe',       '',    'text',  'string'],
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
    req.on('error', function(e) { log('ETA Zirkulation Fehler ' + uri + ': ' + e.message, 'error'); });
    req.end();
}

function zirkulationLesen() {
    DATENPUNKTE.forEach(function(dp) {
        etaLesen(dp[1], dp[0], dp[5] === 'string');
    });
    log('ETA Zirkulation: ' + DATENPUNKTE.length + ' Datenpunkte abgerufen');
}

zirkulationLesen();
schedule('*/5 * * * *', function() { zirkulationLesen(); });
log('ETA Zirkulation Script gestartet');
