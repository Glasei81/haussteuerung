// ============================================
// ETA Script — Heizungssteuerung
// Liest ETA REST API alle 5 Minuten
// URIs aus /user/menu analysiert: 05.06.2026
// ============================================

var http = require('http');

var ETA_IP   = '192.168.178.5';
var ETA_PORT = 8080;

// Spalten: [key, uri|null, statePath, name, unit, role, type]
// uri=null: URI bekannt, aber noch nicht aktiviert (nach Umbau/Test)
var ETA_DATENPUNKTE = [

    // --- Puffer 1a/1b (3000L, /272/10601) ---
    ['puffer_fuehler1',         '/272/10601/0/0/13191',      'eta.puffer.fuehler1',          'Puffer Fühler 1 (oben)',      '°C',  'value.temperature', 'number'],
    ['puffer_fuehler2',         '/272/10601/0/11328/0',      'eta.puffer.fuehler2',          'Puffer Fühler 2',             '°C',  'value.temperature', 'number'],
    ['puffer_fuehler3',         '/272/10601/0/11329/0',      'eta.puffer.fuehler3',          'Puffer Fühler 3',             '°C',  'value.temperature', 'number'],
    ['puffer_fuehler4',         '/272/10601/0/11330/0',      'eta.puffer.fuehler4',          'Puffer Fühler 4',             '°C',  'value.temperature', 'number'],
    ['puffer_fuehler5',         '/272/10601/0/0/13192',      'eta.puffer.fuehler5',          'Puffer Fühler 5 (unten)',     '°C',  'value.temperature', 'number'],
    ['puffer_ladung',           '/272/10601/0/0/12528',      'eta.puffer.ladung',            'Puffer Ladung',               '%',   'value',             'number'],

    // --- Puffer 2 (600L Keller, /121/10601) — nach Umbau aktivieren ---
    ['puffer2_oben',            '/121/10601/0/0/13191',      'eta.puffer2.oben',             'Puffer2 oben',                '°C',  'value.temperature', 'number'],
    ['puffer2_mitte',           '/121/10601/0/11328/0',      'eta.puffer2.mitte',            'Puffer2 mitte',               '°C',  'value.temperature', 'number'],
    ['puffer2_unten',           '/121/10601/0/11329/0',      'eta.puffer2.unten',            'Puffer2 unten',               '°C',  'value.temperature', 'number'],
    ['puffer2_ladung',          '/121/10601/0/0/12528',      'eta.puffer2.ladung',           'Puffer2 Ladung',              '%',   'value',             'number'],

    // --- Warmwasser (/121/10111) ---
    ['warmwasser_oben',         '/121/10111/0/0/12271',      'eta.warmwasser.oben',          'Warmwasser oben',             '°C',  'value.temperature', 'number'],
    ['warmwasser_unten',        '/121/10111/0/0/12272',      'eta.warmwasser.unten',         'Warmwasser unten',            '°C',  'value.temperature', 'number'],
    ['warmwasser_soll',         '/121/10111/0/0/12132',      'eta.warmwasser.soll',          'Warmwasser Soll',             '°C',  'value.temperature', 'number'],
    ['warmwasser_zustand',      '/121/10111/0/0/12129',      'eta.warmwasser.zustand',       'Warmwasser-Zustand',          '',    'text',              'string'],

    // --- Heizkreis HK (/121/10101) — Heizkörper EG ---
    ['hk_vorlauf',              '/121/10101/0/0/12241',      'eta.hk.vorlauf',               'HK Vorlauf',                  '°C',  'value.temperature', 'number'],
    ['hk_ruecklauf',            '/121/10101/0/0/12220',      'eta.hk.ruecklauf',             'HK Rücklauf',                 '°C',  'value.temperature', 'number'],
    ['hk_zustand',              '/121/10101/0/0/12090',      'eta.hk.zustand',               'HK Zustand',                  '',    'text',              'string'],

    // --- Heizkreis FBH (/121/10102) — Fußbodenheizung 1.OG ---
    ['fbh_vorlauf',             '/121/10102/0/0/12241',      'eta.fbh.vorlauf',              'FBH Vorlauf',                 '°C',  'value.temperature', 'number'],
    ['fbh_ruecklauf',           '/121/10102/0/0/12220',      'eta.fbh.ruecklauf',            'FBH Rücklauf',                '°C',  'value.temperature', 'number'],
    ['fbh_zustand',             '/121/10102/0/0/12090',      'eta.fbh.zustand',              'FBH Zustand',                 '',    'text',              'string'],

    // --- Solar (/121/10221) ---
    ['solar_zustand',           '/121/10221/0/0/12183',      'eta.solar.zustand',            'Solar Zustand',               '',    'text',              'string'],
    ['solar_vorlauf',           '/121/10221/0/0/12260',      'eta.solar.vorlauf',            'Solar Vorlauf',               '°C',  'value.temperature', 'number'],
    ['solar_ruecklauf',         '/121/10221/0/0/12355',      'eta.solar.ruecklauf',          'Solar Rücklauf',              '°C',  'value.temperature', 'number'],
    ['solar_ertrag_heute',      '/121/10221/0/0/12350',      'eta.solar.ertrag_heute',       'Solar Ertrag heute',          'kWh', 'value',             'number'],
    ['solar_ertrag_gestern',    '/121/10221/0/0/12769',      'eta.solar.ertrag_gestern',     'Solar Ertrag gestern',        'kWh', 'value',             'number'],
    ['solar_waermemenge',       '/121/10221/0/0/12349',      'eta.solar.waermemenge',        'Solar Wärmemenge gesamt',     'kWh', 'value',             'number'],

    // --- Pellets (/264/10891) ---
    ['pellets_zustand',         '/264/10891/0/0/12000',      'eta.pellets.zustand',          'Pellets Zustand',             '',    'text',              'string'],
    ['pellets_ertrag_heute',    '/264/10891/14877/0/12350',  'eta.pellets.ertrag_heute',     'Pellets Ertrag heute',        'kWh', 'value',             'number'],
    ['pellets_ertrag_gestern',  '/264/10891/14877/0/12769',  'eta.pellets.ertrag_gestern',   'Pellets Ertrag gestern',      'kWh', 'value',             'number'],
    ['pellets_energie_gesamt',  '/264/10891/14877/0/2273',   'eta.pellets.energie_gesamt',   'Pellets Energie gesamt',      'kWh', 'value',             'number'],
    ['pellets_leistung',        '/264/10891/14877/0/2287',   'eta.pellets.leistung',         'Pellets Leistung',            'kW',  'value.power',       'number'],
    ['pellets_volllaststunden', '/264/10891/0/0/12153',      'eta.pellets.volllaststunden',  'Pellets Volllaststunden',     'h',   'value',             'number'],
    ['pellets_verbrauch',       '/264/10891/0/0/12016',      'eta.pellets.verbrauch_gesamt', 'Pellets Verbrauch gesamt',    'kg',  'value',             'number'],
    ['pellets_behaelter',       '/264/10891/0/0/12011',      'eta.pellets.behaelter_inhalt', 'Pellets Behälter Inhalt',     'kg',  'value',             'number'],
    ['pellets_ruecklauf',       '/264/10891/0/0/12220',      'eta.pellets.ruecklauf',        'Pellets Rücklauf',            '°C',  'value.temperature', 'number'],
    ['pellets_kessel_soll',     '/264/10891/0/0/12006',      'eta.pellets.kessel_soll',      'Pellets Kessel Soll',         '°C',  'value.temperature', 'number'],
    ['pellets_kesseldruck',     '/264/10891/0/0/12180',      'eta.pellets.kesseldruck',      'Pellets Kesseldruck',         'bar', 'value',             'number'],
    ['pellets_heizbetriebe',    '/264/10891/0/0/12017',      'eta.pellets.heizbetriebe',     'Pellets Heizbetriebe',        '',    'value',             'number'],
    ['pellets_zuendungen',      '/264/10891/0/0/12018',      'eta.pellets.zuendungen',       'Pellets Zündungen',           '',    'value',             'number'],

    // --- Scheitholz (/272/10921) ---
    ['holz_zustand',            '/272/10921/0/0/12000',      'eta.holz.zustand',             'Holz Zustand',                '',    'text',              'string'],
    ['holz_ertrag_heute',       '/272/10921/14877/0/12350',  'eta.holz.ertrag_heute',        'Holz Ertrag heute',           'kWh', 'value',             'number'],
    ['holz_ertrag_gestern',     '/272/10921/14877/0/12769',  'eta.holz.ertrag_gestern',      'Holz Ertrag gestern',         'kWh', 'value',             'number'],
    ['holz_energie_gesamt',     '/272/10921/14877/0/2273',   'eta.holz.energie_gesamt',      'Holz Energie gesamt',         'kWh', 'value',             'number'],
    ['holz_leistung',           '/272/10921/14877/0/2287',   'eta.holz.leistung',            'Holz Leistung',               'kW',  'value.power',       'number'],
    ['holz_ruecklauf',          '/272/10921/0/0/12220',      'eta.holz.ruecklauf',           'Holz Rücklauf',               '°C',  'value.temperature', 'number'],
    ['holz_volllaststunden',    '/272/10921/0/0/12153',      'eta.holz.volllaststunden',     'Holz Volllaststunden',        'h',   'value',             'number'],
    ['holz_heizbetriebe',       '/272/10921/0/0/12017',      'eta.holz.heizbetriebe',        'Holz Heizbetriebe',           '',    'value',             'number'],
    ['holz_zuendungen',         '/272/10921/0/0/12018',      'eta.holz.zuendungen',          'Holz Zündungen',              '',    'value',             'number'],
    ['holz_kesseldruck',        '/272/10921/0/0/12180',      'eta.holz.kesseldruck',         'Holz Kesseldruck',            'bar', 'value',             'number'],

    // --- System (/121/10241) ---
    ['aussen_temp',             '/121/10241/0/0/12197',      'eta.aussen.temperatur',        'Aussentemperatur',            '°C',  'value.temperature', 'number'],
];

// States anlegen
ETA_DATENPUNKTE.forEach(function(dp) {
    createState(dp[2], dp[6] === 'string' ? '' : 0, {
        name: dp[3], type: dp[6], unit: dp[4], role: dp[5], read: true, write: false
    });
});

// Alias für Kompatibilität mit eta_pellets_logik.js
createState('eta.puffer.oben', 0, {
    name: 'Puffer oben (Alias für fuehler1)', type: 'number', unit: '°C',
    role: 'value.temperature', read: true, write: false
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
                setState('javascript.0.' + statePath, {val: match[1], ack: true});
            } else {
                var val = parseFloat(match[1].replace(',', '.'));
                if (!isNaN(val)) {
                    setState('javascript.0.' + statePath, {val: val, ack: true});
                    if (statePath === 'eta.puffer.fuehler1') {
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
    ETA_DATENPUNKTE.forEach(function(dp) {
        if (dp[1] === null) return;
        etaLesen(dp[1], dp[2], dp[6] === 'string');
    });
}

alleEtaWerteLesen();
schedule('*/5 * * * *', function() { alleEtaWerteLesen(); });
log('ETA Script gestartet — ' + ETA_DATENPUNKTE.filter(function(dp) { return dp[1] !== null; }).length + ' Datenpunkte aktiv');
