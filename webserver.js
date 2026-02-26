// ESPHome web_server v1 — embedded SSE client + action handlers
// Simplified for maximum reliability on ESP8266 / all ESPHome versions
// Key: always use data.id (old format "domain-object_id") for getElementById
//      always use row.id to build REST API URLs

const source = new EventSource("/events");

// ── State updates via SSE ──
source.addEventListener("state", function(e) {
    try {
        const data = JSON.parse(e.data);
        // data.id = "domain-object_id" — always matches <tr id="...">
        const row = document.getElementById(data.id);
        if (row && data.state !== undefined) {
            row.children[1].innerText = data.state;
        }
    } catch(ex) {}
});

// ── Log stream ──
source.addEventListener("log", function(e) {
    const log = document.getElementById("log");
    if (log) {
        log.innerHTML += e.data + "\n";
        log.scrollTop = log.scrollHeight;
    }
});

// ── Build REST URL from row id ──
// row.id = "switch-nagrev" → "/switch/nagrev/toggle"
function postAction(row, action, params) {
    const idx = row.id.indexOf("-");
    const domain = row.id.substring(0, idx);
    const objId = row.id.substring(idx + 1);
    let url = "/" + domain + "/" + objId + "/" + action;
    if (params) url += "?" + params;
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.send();
}

// ── Bind actions to table rows ──
const states = document.getElementById("states");
if (states) {
    for (let i = 0; i < states.rows.length; i++) {
        const row = states.rows[i];
        if (!row.children[2] || !row.children[2].children.length) continue;

        // Switch / Light / Fan — single Toggle button
        if (row.classList.contains("switch") ||
            row.classList.contains("light") ||
            row.classList.contains("fan")) {
            row.children[2].children[0].addEventListener("click", function() {
                postAction(row, "toggle");
            });
        }

        // Button — Press
        if (row.classList.contains("button")) {
            row.children[2].children[0].addEventListener("click", function() {
                postAction(row, "press");
            });
        }

        // Cover — Open / Close buttons
        if (row.classList.contains("cover")) {
            const coverActs = ["open", "close"];
            for (let j = 0; j < row.children[2].children.length && j < coverActs.length; j++) {
                const act = coverActs[j];
                row.children[2].children[j].addEventListener("click", function() {
                    postAction(row, act);
                });
            }
        }

        // Lock — Lock / Unlock / Open buttons
        if (row.classList.contains("lock")) {
            const lockActs = ["lock", "unlock", "open"];
            for (let j = 0; j < row.children[2].children.length && j < lockActs.length; j++) {
                const act = lockActs[j];
                row.children[2].children[j].addEventListener("click", function() {
                    postAction(row, act);
                });
            }
        }

        // Number — input change
        if (row.classList.contains("number")) {
            row.children[2].children[0].addEventListener("change", function() {
                postAction(row, "set", "value=" + encodeURIComponent(this.value));
            });
        }

        // Select — dropdown change
        if (row.classList.contains("select")) {
            row.children[2].children[0].addEventListener("change", function() {
                postAction(row, "set", "option=" + encodeURIComponent(this.value));
            });
        }
    }
}

// ── WiFi ──
(function(){
    var s=document.createElement('div');
    s.style.cssText='margin:20px 0;padding:15px;border:1px solid #ccc;border-radius:8px';
    s.innerHTML='<h3>WiFi</h3>SSID: <input id=ws size=20><br>Pass: <input id=wp type=password size=20><br><br><button onclick="wS()">Save &amp; Reboot</button> <button onclick="wR()">Reset default</button><p id=wm></p>';
    document.body.appendChild(s);
    window.wS=function(){var ss=document.getElementById('ws').value;if(!ss){alert('SSID?');return}var f=new FormData();f.append('s',ss);f.append('p',document.getElementById('wp').value);fetch('/w',{method:'POST',body:f}).then(function(){document.getElementById('wm').textContent='OK, rebooting...'})};
    window.wR=function(){if(!confirm('Reset WiFi?'))return;fetch('/w',{method:'POST'}).then(function(){document.getElementById('wm').textContent='Reset, rebooting...'})};
})();
