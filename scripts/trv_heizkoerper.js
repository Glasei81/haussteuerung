// ============================================
// TRV Heizkörperthermostate EG (Sonoff TRVZB)
//
// Der Zigbee-Adapter liefert Ist (local_temperature), Soll
// (occupied_heating_setpoint) und Batterie direkt — diese gehen
// ohne Script per influxdb_setup.js in die DB.
//
// Der TRVZB liefert KEINEN numerischen Ventil-/Bedarfswert
// (kein pi_heating_demand). Der einzige Live-Bedarf ist
// running_state = idle/heat (Text). Dieses Script spiegelt das
// je Raum auf einen numerischen Wert 1/0, damit Grafana die
// Heizquote (% der Zeit geheizt) trenden kann.
//
// Später: Basis für das Wärmebedarf-Signal an die ETA-Vorlauflogik.
//
// Neuen TRV ergänzen: nur eine Zeile in TRVS (id + raum + name),
// dann die 4 States in influxdb_setup.js nachtragen.
// Stand: 03.07.2026
// ============================================

var TRVS = [
    { id: 'zigbee.0.983268fffe97aab4', raum: 'gang_eg', name: 'Gang EG' },
    // { id: 'zigbee.0.................', raum: '........', name: '........' },
    // { id: 'zigbee.0.................', raum: '........', name: '........' },
    // { id: 'zigbee.0.................', raum: '........', name: '........' },
];

TRVS.forEach(function(t) {

    createState('trv.' + t.raum + '.heizt', 0, {
        name: 'TRV ' + t.name + ' heizt (1/0)', type: 'number', unit: '', role: 'value', read: true, write: false
    });

    function update() {
        var rs = getState(t.id + '.running_state');
        var heizt = (rs && rs.val !== null && String(rs.val).toLowerCase() === 'heat') ? 1 : 0;
        setState('javascript.0.trv.' + t.raum + '.heizt', { val: heizt, ack: true });
    }

    // running_state kommt vom Gerät (ack:true) — auf jede Änderung reagieren
    on({ id: t.id + '.running_state', change: 'any' }, update);
    update();
});

log('TRV Heizkörper Script gestartet — ' + TRVS.length + ' Thermostat(e)');
