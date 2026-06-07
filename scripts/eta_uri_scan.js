// ============================================
// ETA URI Scanner — einmalig ausführen
// Findet korrekte URIs für Sensoren die 0°C zeigen
// Ergebnis im ioBroker Log lesen
// ============================================

var http = require('http');
var ETA_IP   = '192.168.178.5';
var ETA_PORT = 8080;

var KANDIDATEN = [

    // --- Puffer 2 Mitte (/121/10601) ---
    // ETA Display zeigt ~62°C — URI noch unbekannt
    // Variablen-basiert (wie oben=13191, unten=13935):
    ['/121/10601/0/0/13192',  'P2-mitte var 13192'],
    ['/121/10601/0/0/13193',  'P2-mitte var 13193'],
    ['/121/10601/0/0/13933',  'P2-mitte var 13933'],
    ['/121/10601/0/0/13934',  'P2-mitte var 13934'],
    ['/121/10601/0/0/13936',  'P2-mitte var 13936'],
    ['/121/10601/0/0/13937',  'P2-mitte var 13937'],
    ['/121/10601/0/0/13938',  'P2-mitte var 13938'],
    // Node-basiert (wie Puffer 1 Fühler 2-4 = 11328/29/30):
    ['/121/10601/0/11328/0',  'P2-mitte node 11328'],
    ['/121/10601/0/11329/0',  'P2-mitte node 11329'],
    ['/121/10601/0/11330/0',  'P2-mitte node 11330'],
    ['/121/10601/0/11331/0',  'P2-mitte node 11331'],
    ['/121/10601/0/11332/0',  'P2-mitte node 11332'],
    ['/121/10601/0/11333/0',  'P2-mitte node 11333'],
    ['/121/10601/0/11334/0',  'P2-mitte node 11334'],
    ['/121/10601/0/11335/0',  'P2-mitte node 11335'],
    // Node + Variable:
    ['/121/10601/0/11328/13191', 'P2-mitte node11328+var'],
    ['/121/10601/0/11329/13191', 'P2-mitte node11329+var'],
    ['/121/10601/0/11330/13191', 'P2-mitte node11330+var'],

];

log('=== ETA URI Scan startet (' + KANDIDATEN.length + ' Kandidaten) ===');
log('Ziel: Puffer 2 Mitte (~62°C laut ETA-Display)');

KANDIDATEN.forEach(function(k) {
    var uri   = k[0];
    var label = k[1];

    var options = {
        host: ETA_IP, port: ETA_PORT,
        path: '/user/var' + uri,
        method: 'GET'
    };

    var req = http.request(options, function(res) {
        var data = '';
        res.on('data', function(c) { data += c; });
        res.on('end', function() {
            var match = data.match(/strValue="([^"]+)"/);
            if (match) {
                log('[TREFFER] ' + label + ' → ' + match[1] + '  (' + uri + ')');
            } else {
                log('[leer]    ' + label + '  (' + uri + ')');
            }
        });
    });

    req.on('error', function(e) {
        log('[FEHLER]  ' + label + ': ' + e.message, 'error');
    });

    req.end();
});
