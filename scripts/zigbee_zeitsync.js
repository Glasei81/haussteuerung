// ============================================
// Zigbee Zeitsynchronisation
// Startet Zigbee-Adapter täglich um 03:00 neu,
// damit alle Geräte (Moes TS0601 u.a.) die korrekte
// Systemzeit vom Zigbee-Koordinator abrufen.
//
// Hintergrund: Moes Thermostate holen sich die Zeit
// per Zigbee Time Cluster beim Adapter-Start.
// Ohne regelmäßigen Neustart driften sie auseinander.
// ============================================

schedule('0 3 * * *', function() {
    setState('system.adapter.zigbee.0.alive', { val: false, ack: false });
    setTimeout(function() {
        setState('system.adapter.zigbee.0.alive', { val: true, ack: false });
    }, 15000);
    log('Zigbee Adapter neu gestartet — Zeitsynchronisation');
});

log('Zigbee Zeitsync aktiv — täglich 03:00 Uhr');
