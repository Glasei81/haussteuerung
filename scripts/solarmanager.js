// ============================================
// Solarmanager Script
// Liest Solarmanager API jede Minute
// Stand: Mai 2026
// ============================================

var http = require('http');

var SM_IP = '192.168.178.36';

var DEVICE_IDS = {
    puffer_heizstab:  '672f524463329ad0323012bd',
    ww_heizstab:      '672f519e00c1de1963ec63db',
    virt_switch:      '6a0cb9886b7b9a89b6aa06a2',
    batterie1:        '672cded5a25fe6ead2b37ef6',
    batterie2:        '672e0993e05febbf44b19ff3',
    // Heizstab Puffer 2 (4,5kW Keller) — Shelly Pro3, 3 Relais à 1500W
    puffer2_relais:   ['672cd496e4b1e4feca2e4b4c', '672dccfdc008a5373eadad23', '672e09ecbf2027621d498c3c']
};

var states = [
    ['solar.pv.watt',           'PV Leistung',            'number',  'W',   'value.power'],
    ['solar.pv.today',          'PV Heute kWh',           'number',  'kWh', 'value.power.consumption'],
    ['solar.netz.watt',         'Netz Leistung',          'number',  'W',   'value.power'],
    ['solar.verbrauch.watt',    'Verbrauch',               'number',  'W',   'value.power'],
    ['solar.batterie.soc',      'Batterie SOC',            'number',  '%',   'value.battery'],
    ['solar.batterie.watt',     'Batterie Leistung',      'number',  'W',   'value.power'],
    ['solar.switch',            'Virtueller Switch',       'boolean', '',    'switch'],
    ['solar.puffer.temperatur', 'Puffer Temp myPV',       'number',  '°C',  'value.temperature'],
    ['solar.puffer2.watt',      'Heizstab Puffer2 gesamt','number',  'W',   'value.power'],
];

states.forEach(function(s) {
    createState(s[0], s[2] === 'number' ? 0 : false, {
        name: s[1], type: s[2], unit: s[3], role: s[4], read: true, write: false
    });
});

// einmalig die Geräteliste ins Log (zeigt welche Felder myPV/Relais liefern)
var apiGeloggt = false;

function smGet(path, callback) {
    var options = { host: SM_IP, port: 80, path: path, method: 'GET' };
    var req = http.request(options, function(res) {
        var data = '';
        res.on('data', function(c) { data += c; });
        res.on('end', function() {
            try { callback(JSON.parse(data)); }
            catch(e) { log('SM Parse Fehler: ' + e, 'error'); }
        });
    });
    req.on('error', function(e) { log('SM Fehler: ' + e.message, 'error'); });
    req.end();
}

function solarmanagerLesen() {
    smGet('/v2/point', function(data) {
        if (!data || typeof data.pW === 'undefined') {
            log('SM: Ungültige Antwort', 'warn');
            return;
        }

        setState('javascript.0.solar.pv.watt',        {val: data.pW  || 0, ack: true});
        setState('javascript.0.solar.pv.today',       {val: data.pWh || 0, ack: true});
        setState('javascript.0.solar.verbrauch.watt', {val: data.cW  || 0, ack: true});
        setState('javascript.0.solar.batterie.soc',   {val: data.soc || 0, ack: true});
        // positiv = laden, negativ = entladen
        setState('javascript.0.solar.batterie.watt',  {val: (data.bcW || 0) - (data.bdW || 0), ack: true});
        // positiv = Netzbezug, negativ = Einspeisung
        setState('javascript.0.solar.netz.watt',      {val: (data.cW || 0) + (data.bcW || 0) - (data.pW || 0) - (data.bdW || 0), ack: true});

        // Geräteliste einmalig protokollieren, damit wir sehen was die API liefert
        if (!apiGeloggt) {
            apiGeloggt = true;
            (data.devices || []).forEach(function(d) {
                log('SM-Gerät ' + d._id + ': power=' + d.power + ' switchState=' + d.switchState + ' temp=' + d.temperature);
            });
        }

        var puffer2Watt = 0;
        (data.devices || []).forEach(function(d) {
            if (d._id === DEVICE_IDS.virt_switch) {
                setState('javascript.0.solar.switch', {val: d.switchState === 1, ack: true});
            }
            if (d._id === DEVICE_IDS.puffer_heizstab && d.temperature !== undefined) {
                setState('javascript.0.solar.puffer.temperatur', {val: d.temperature, ack: true});
            }
            // Pro3 misst keine Leistung → aus Schaltzustand: jedes Relais an = 1500W
            if (DEVICE_IDS.puffer2_relais.indexOf(d._id) !== -1) {
                puffer2Watt += (d.switchState === 1 ? 1500 : 0);
            }
        });
        setState('javascript.0.solar.puffer2.watt', {val: puffer2Watt, ack: true});
    });
}

solarmanagerLesen();
schedule('* * * * *', function() { solarmanagerLesen(); });
log('Solarmanager Script gestartet');
