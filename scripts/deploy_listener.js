// ============================================
// Deploy Listener
// Einmalig manuell in ioBroker einspielen —
// danach alle anderen Scripts per Telegram /deploy aktualisieren.
//
// Einmalige Einrichtung auf hauspi:
//   git clone git@github.com:glasei81/haussteuerung.git /home/pi/haussteuerung
//   (SSH-Key für GitHub muss für den iobroker-User vorhanden sein)
//
// Dieses Script deployed sich NICHT selbst — bei Änderungen
// muss es einmalig manuell neu eingespielt werden.
// ============================================

var fs = require('fs');

var REPO_DIR = '/home/pi/haussteuerung';

// Mapping: Dateiname im Repo → Script-ID in ioBroker
// Script-IDs aus ioBroker Admin → Skripte ablesen
var SCRIPTS_MAP = {
    'wetterstation.js':           'script.js.Wetterstation1',
    'solarmanager.js':            'script.js.Solarmanger',
    'eta.js':                     'script.js.ETA',
    'eta_pellets_logik.js':       'script.js.Eta_Pellets_Logik',
    'telegram.js':                'script.js.telegram',
    'influxdb_setup.js':          'script.js.influxdb',       // neues vollständiges Setup (ersetzt influxdb_setup_eta.js)
    'eta_uri_scan.js':            'script.js.eta_uri_scan',
    'eta_zirkulation.js':         'script.js.ETA_zirkulation',
    'eta_puffer2.js':             'script.js.Eta_Puffer_2',
    'eta_solar.js':               'script.js.Eta_Solar',
    'eta_scheitholz.js':          'script.js.Eta_Scheitholz',
    'zirkulation_monitor.js':     'script.js.Zirkulation_monitor',
    'klima_logik.js':             'script.js.klima_logik',
    'puffer2_heizstab_schutz.js': 'script.js.puffer2_heizstab_schutz'
    // deploy_listener.js NICHT hier eintragen — kann sich nicht selbst deployen
};

// --- Einzelnes Script aktualisieren oder neu anlegen ---

function deployScript(filename, scriptId, callback) {

    var filePath = REPO_DIR + '/scripts/' + filename;
    var source;

    try {
        source = fs.readFileSync(filePath, 'utf8');
    } catch (e) {
        return callback('Datei nicht lesbar: ' + e.message);
    }

    getObject(scriptId, function(err, obj) {

        if (!obj) {
            // Script existiert noch nicht → neu anlegen
            var name = scriptId.replace(/^script\.js\./, '');
            obj = {
                _id:    scriptId,
                type:   'script',
                common: {
                    name:       name,
                    engineType: 'Javascript/js',
                    engine:     'system.adapter.javascript.0',
                    source:     source,
                    enabled:    true,
                    debug:      false,
                    verbose:    false
                },
                native: {}
            };
        } else {
            obj.common.source = source;
        }

        setObject(scriptId, obj, function(setErr) {
            if (setErr) {
                callback('Speicherfehler: ' + setErr);
            } else {
                callback(null);
            }
        });
    });
}

// --- Alle Scripts nacheinander deployen ---

function deployAll(keys, index, results, done) {

    if (index >= keys.length) {
        return done(results);
    }

    var filename = keys[index];
    var scriptId = SCRIPTS_MAP[filename];

    deployScript(filename, scriptId, function(err) {
        results.push((err ? '❌ ' : '✅ ') + filename + (err ? '\n   ' + err : ''));
        deployAll(keys, index + 1, results, done);
    });
}

// --- Deploy starten ---

function startDeploy() {

    sendTo('telegram.0', '🚀 Deploy gestartet — git pull...');

    exec('git -C ' + REPO_DIR + ' pull 2>&1', function(err, stdout) {

        var gitOut = (stdout || '').trim();

        if (err && err.code !== 0) {
            sendTo('telegram.0', '❌ git pull fehlgeschlagen:\n' + gitOut);
            return;
        }

        var gitStatus = gitOut.split('\n')[0];
        var keys = Object.keys(SCRIPTS_MAP);

        deployAll(keys, 0, [], function(results) {

            var ok    = results.filter(function(r) { return r.startsWith('✅'); }).length;
            var fehler = results.filter(function(r) { return r.startsWith('❌'); }).length;

            sendTo('telegram.0',
                '🚀 Deploy abgeschlossen\n' +
                'Git: ' + gitStatus + '\n' +
                '✅ ' + ok + ' aktualisiert' + (fehler > 0 ? ', ❌ ' + fehler + ' Fehler' : '') + '\n\n' +
                results.join('\n')
            );

            log('Deploy: ' + ok + ' OK, ' + fehler + ' Fehler | Git: ' + gitStatus);
        });
    });
}

// --- Telegram Trigger ---
// Hört direkt auf den Telegram-State — unabhängig von telegram.js

on({id: 'telegram.0.communicate.request', change: 'any'}, function(obj) {

    var msg = obj.state.val;
    var cmd = '';

    try { cmd = JSON.parse(msg).message; } catch(e) { cmd = msg; }
    cmd = cmd.replace(/^\[.*?\]/, '').trim();

    if (cmd === '/deploy') {
        startDeploy();
    }
});

log('Deploy Listener gestartet — /deploy zum Aktualisieren aller Scripts');
