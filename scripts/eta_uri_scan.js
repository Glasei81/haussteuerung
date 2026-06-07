// ============================================
// ETA URI Scanner — einmalig ausführen
// Findet korrekte URIs für Sensoren die 0°C zeigen
// Ergebnis im ioBroker Log lesen
// ============================================

var http = require('http');
var ETA_IP   = '192.168.178.5';
var ETA_PORT = 8080;

var KANDIDATEN = [

    // --- Puffer 1 Fühler 2/3/4 (/272/10601) ---
    // Aktuell eingetragen (zeigen 0°C):
    ['/272/10601/0/0/13933',  'P1-F2 (aktuell 13933)'],
    ['/272/10601/0/0/13934',  'P1-F3 (aktuell 13934)'],
    ['/272/10601/0/0/13935',  'P1-F4 (aktuell 13935)'],
    // Alte Kandidaten: Sensor-Node im Sub-Pfad
    ['/272/10601/0/11328/0',  'P1-F2 (alt: node 11328)'],
    ['/272/10601/0/11329/0',  'P1-F3 (alt: node 11329)'],
    ['/272/10601/0/11330/0',  'P1-F4 (alt: node 11330)'],
    // Weitere Varianten mit bekannter Variable 13191/13192
    ['/272/10601/0/11328/13191', 'P1-F2 (node+var)'],
    ['/272/10601/0/11329/13191', 'P1-F3 (node+var)'],
    ['/272/10601/0/11330/13191', 'P1-F4 (node+var)'],
    // Sequenzielle IDs um bekannte herum
    ['/272/10601/0/0/13193',  'P1 (13193)'],
    ['/272/10601/0/0/13194',  'P1 (13194)'],
    ['/272/10601/0/0/13195',  'P1 (13195)'],
    ['/272/10601/0/0/13196',  'P1 (13196)'],

    // --- Puffer 2 Mitte (/121/10601) ---
    // Aktuell eingetragen (zeigt 0°C):
    ['/121/10601/0/0/13934',  'P2-mitte (aktuell 13934)'],
    // Kandidaten:
    ['/121/10601/0/0/13193',  'P2-mitte (13193)'],
    ['/121/10601/0/0/13933',  'P2-mitte (13933)'],
    ['/121/10601/0/0/13935',  'P2-mitte (13935)'],

];

log('=== ETA URI Scan startet (' + KANDIDATEN.length + ' Kandidaten) ===');

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
