// ============================================
// Zigbee Inventar — NUR LESEN, ändert nichts
//
// Listet alle zigbee.0-Geräte mit:
//   Adresse | Name in ioBroker | Soll-Name laut Repo | Typ | Scripts, die die Adresse nutzen
// Markiert: überschriebene Namen, Geräte ohne Soll-Namen, ungenutzte Geräte
// und Scripts, die eine Adresse verwenden, die es im Adapter nicht (mehr) gibt.
//
// Nutzung: Script (neu) starten → Ausgabe im Log und im State
//          javascript.0.tools.zigbee_inventar (Markdown-Tabelle).
//
// Soll-Namen unten pflegen (Quelle: trv_heizkoerper.js, klima_*.js, wetterstation.js).
// Hinweis: Die Scripts arbeiten mit den Adressen, nicht mit den Namen. Ein
// überschriebener Name bricht keine Automation, er macht nur die Admin-Ansicht unleserlich.
// Stand: 15.11.2026
// ============================================

var SOLL = {
    '983268fffe97aab4': 'Gang EG',
    '449fdafffe7452a3': 'Schlafzimmer EG',
    '983268fffe97dadd': 'WC EG',
    '983268fffe994d06': 'Küche EG',
    'a4c1388f0b92eb71': 'Schlafzimmer',
    'a4c138d0a5ca4495': 'Treppenhaus',
    'a4c13894b001e9c9': 'Nord',
    'a4c138b099b0852f': 'Süd'
    // Rest unbekannt: a4c13829dfc9b6a6, a4c138a8b3f53353, a4c1388161f407cf,
    //                 9035eafffe2a7ad9, 2c1165fffe52fc24, a4c1387b40e90364
};

createState('tools.zigbee_inventar', '', {
    name: 'Zigbee Inventar (Markdown)', type: 'string', role: 'text', read: true, write: false
});

function pad(s, n) { s = String(s); while (s.length < n) { s += ' '; } return s; }

function textName(n) {
    if (n === null || n === undefined) { return ''; }
    if (typeof n === 'object') { return n.de || n.en || ''; }
    return String(n);
}

function inventar() {
    getObjectView('system', 'device', { startkey: 'zigbee.0.', endkey: 'zigbee.0.香' }, function (err, devs) {
        if (err || !devs || !devs.rows) {
            log('Zigbee-Inventar: Geräteliste nicht lesbar: ' + err, 'warn');
            return;
        }
        getObjectView('system', 'script', { startkey: 'script.js.', endkey: 'script.js.香' }, function (err2, scr) {
            var scripts = (scr && scr.rows) ? scr.rows : [];
            var bekannt = {};
            var zeilen = [];

            devs.rows.forEach(function (r) {
                var ieee = r.id.replace('zigbee.0.', '');
                if (ieee.indexOf('.') >= 0) { return; }          // nur Geräteebene
                bekannt[ieee] = true;

                var c = (r.value && r.value.common) || {};
                var n = (r.value && r.value.native) || {};
                var ist = textName(c.name);
                var soll = SOLL[ieee] || '';
                var typ = c.type || n.modelId || n.model || '';

                var nutzer = [];
                scripts.forEach(function (s) {
                    if (s.id === scriptName) { return; }          // dieses Script nicht mitzählen
                    var src = (s.value && s.value.common && s.value.common.source) || '';
                    if (src.indexOf(ieee) >= 0) { nutzer.push(s.id.replace('script.js.', '')); }
                });

                var flag = 'ok';
                if (soll && ist.toLowerCase() !== soll.toLowerCase()) { flag = 'NAME ABWEICHEND'; }
                else if (!soll && (ist === '' || ist.toLowerCase().indexOf(ieee) >= 0)) { flag = 'NAME FEHLT'; }
                else if (!soll) { flag = 'ohne Soll'; }
                if (nutzer.length === 0) { flag += ' / ungenutzt'; }

                zeilen.push({ ieee: ieee, ist: ist, soll: soll, typ: typ, nutzer: nutzer.join(', '), flag: flag });
            });

            // Problemfälle zuerst, "ok" zuletzt
            function rang(z) { return z.flag === 'ok' ? 1 : 0; }
            zeilen.sort(function (a, b) { return rang(a) - rang(b) || (a.ieee < b.ieee ? -1 : 1); });

            // Adressen, die Scripts verwenden, die es im Adapter nicht gibt
            var fehlend = {};
            scripts.forEach(function (s) {
                if (s.id === scriptName) { return; }
                var src = (s.value && s.value.common && s.value.common.source) || '';
                var re = /zigbee\.0\.([0-9a-f]{16})/g;
                var m;
                while ((m = re.exec(src)) !== null) {
                    if (!bekannt[m[1]]) {
                        fehlend[m[1]] = (fehlend[m[1]] ? fehlend[m[1]] + ', ' : '') + s.id.replace('script.js.', '');
                    }
                }
            });

            var out = [];
            out.push('| Adresse | Name (ioBroker) | Soll (Repo) | Typ | Scripts | Status |');
            out.push('|---|---|---|---|---|---|');
            zeilen.forEach(function (z) {
                out.push('| ' + [z.ieee, z.ist || '-', z.soll || '-', z.typ || '-', z.nutzer || '-', z.flag].join(' | ') + ' |');
            });
            Object.keys(fehlend).forEach(function (k) {
                out.push('| ' + k + ' | FEHLT IM ADAPTER | - | - | ' + fehlend[k] + ' | Script nutzt unbekanntes Gerät |');
            });

            var text = out.join('\n');
            setState('javascript.0.tools.zigbee_inventar', text, true);
            log('Zigbee-Inventar (' + zeilen.length + ' Geräte):\n' + text, 'info');
        });
    });
}

// createState ist asynchron: kurz warten, dann einmal ausführen
setTimeout(inventar, 3000);
