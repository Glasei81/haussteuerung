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
    batterie2:        '672e0993e05febbf44b19ff3'
};

var states = [
    ['solar.pv.watt',          'PV Leistung',       'number',  'W',   'value.power'],
    ['solar.pv.today',         'PV Heute kWh',      'number',  'kWh', 'value.power.consumption'],
    ['solar.netz.watt',        'Netz Leistung',     'number',  'W',   'value.power'],
    ['solar.verbrauch.watt',   'Verbrauch',         'number',  'W',   'value.power'],
    ['solar.batterie.soc',     'Batterie SOC',      'number',  '%',   'value.battery'],
    ['solar.batterie.watt',    'Batterie Leistung', 'number',  'W',   'value.power'],
    ['solar.switch',           'Virtueller Switch', 'boolean', '',    'switch'],
    ['solar.puffer.temperatur','Puffer Temp myPV',  'number',  '°C',  'value.temperature'],
];

states.forEach(function(s) {
    createState(s[0], s[2] === 'number' ? 0 : false, {
        name: s[1], type: s[2], unit: s[3], role: s[4], read: true, write: false
    });
});

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
        if (!data || !data.point) return;
        var p = data.point;

        setState('javascript.0.solar.pv.watt',        {val: p.pv_power || 0,      ack: true});
        setState('javascript.0.solar.pv.today',       {val: p.pv_today || 0,      ack: true});
        setState('javascript.0.solar.netz.watt',      {val: p.grid_power || 0,    ack: true});
        setState('javascript.0.solar.verbrauch.watt', {val: p.consumption || 0,   ack: true});
        setState('javascript.0.solar.batterie.soc',   {val: p.battery_soc || 0,   ack: true});
        setState('javascript.0.solar.batterie.watt',  {val: p.battery_power || 0, ack: true});

        // Virtueller Switch
        if (p.devices) {
            p.devices.forEach(function(d) {
                if (d.id === DEVICE_IDS.virt_switch) {
                    setState('javascript.0.solar.switch', {val: d.state === 1, ack: true});
                }
                if (d.id === DEVICE_IDS.puffer_heizstab && d.temperature) {
                    setState('javascript.0.solar.puffer.temperatur', {val: d.temperature, ack: true});
                }
            });
        }
    });
}

solarmanagerLesen();
schedule('* * * * *', function() { solarmanagerLesen(); });
log('Solarmanager Script gestartet');
