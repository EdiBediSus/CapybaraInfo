// server.js
const WebSocket = require("ws");
const PORT = process.env.PORT || 10000;
const wss = new WebSocket.Server({ port: PORT });

// CHANGE THIS to your chosen password
const ADMIN_PASSWORD = "123";

console.log("Starting server on port", PORT);
console.log("Admin password is:", ADMIN_PASSWORD);

const MAPS = [
    {
        name: "The Cross",
        walls: [
            {x: 0, y: 0, width: 1000, height: 20, color: '#2c3e50'},
            {x: 0, y: 680, width: 1000, height: 20, color: '#2c3e50'},
            {x: 0, y: 0, width: 20, height: 700, color: '#2c3e50'},
            {x: 980, y: 0, width: 20, height: 700, color: '#2c3e50'},
            {x: 200, y: 200, width: 200, height: 20, color: '#34495e'},
            {x: 600, y: 200, width: 200, height: 20, color: '#34495e'},
            {x: 200, y: 480, width: 200, height: 20, color: '#34495e'},
            {x: 600, y: 480, width: 200, height: 20, color: '#34495e'},
            {x: 480, y: 100, width: 20, height: 200, color: '#34495e'},
            {x: 480, y: 400, width: 20, height: 200, color: '#34495e'},
        ]
    },
    {
        name: "Arena",
        walls: [
            {x: 0, y: 0, width: 1000, height: 20, color: '#2c3e50'},
            {x: 0, y: 680, width: 1000, height: 20, color: '#2c3e50'},
            {x: 0, y: 0, width: 20, height: 700, color: '#2c3e50'},
            {x: 980, y: 0, width: 20, height: 700, color: '#2c3e50'},
            {x: 150, y: 150, width: 100, height: 100, color: '#34495e'},
            {x: 750, y: 150, width: 100, height: 100, color: '#34495e'},
            {x: 150, y: 450, width: 100, height: 100, color: '#34495e'},
            {x: 750, y: 450, width: 100, height: 100, color: '#34495e'},
            {x: 420, y: 250, width: 80, height: 80, color: '#34495e'},
            {x: 520, y: 370, width: 80, height: 80, color: '#34495e'},
        ]
    },
    {
        name: "The Maze",
        walls: [
            {x: 0, y: 0, width: 1000, height: 20, color: '#2c3e50'},
            {x: 0, y: 680, width: 1000, height: 20, color: '#2c3e50'},
            {x: 0, y: 0, width: 20, height: 700, color: '#2c3e50'},
            {x: 980, y: 0, width: 20, height: 700, color: '#2c3e50'},
            {x: 200, y: 100, width: 20, height: 250, color: '#34495e'},
            {x: 400, y: 150, width: 20, height: 400, color: '#34495e'},
            {x: 600, y: 100, width: 20, height: 250, color: '#34495e'},
            {x: 800, y: 150, width: 20, height: 400, color: '#34495e'},
            {x: 100, y: 300, width: 150, height: 20, color: '#34495e'},
            {x: 300, y: 500, width: 150, height: 20, color: '#34495e'},
            {x: 550, y: 300, width: 150, height: 20, color: '#34495e'},
            {x: 700, y: 500, width: 150, height: 20, color: '#34495e'},
        ]
    },
    {
        name: "Corridors",
        walls: [
            {x: 0, y: 0, width: 1000, height: 20, color: '#2c3e50'},
            {x: 0, y: 680, width: 1000, height: 20, color: '#2c3e50'},
            {x: 0, y: 0, width: 20, height: 700, color: '#2c3e50'},
            {x: 980, y: 0, width: 20, height: 700, color: '#2c3e50'},
            {x: 100, y: 200, width: 800, height: 20, color: '#34495e'},
            {x: 100, y: 480, width: 800, height: 20, color: '#34495e'},
            {x: 300, y: 50, width: 20, height: 150, color: '#34495e'},
            {x: 700, y: 50, width: 20, height: 150, color: '#34495e'},
            {x: 300, y: 520, width: 20, height: 150, color: '#34495e'},
            {x: 700, y: 520, width: 20, height: 150, color: '#34495e'},
        ]
    },
    {
        name: "Open Field",
        walls: [
            {x: 0, y: 0, width: 1000, height: 20, color: '#2c3e50'},
            {x: 0, y: 680, width: 1000, height: 20, color: '#2c3e50'},
            {x: 0, y: 0, width: 20, height: 700, color: '#2c3e50'},
            {x: 980, y: 0, width: 20, height: 700, color: '#2c3e50'},
            {x: 250, y: 150, width: 80, height: 20, color: '#34495e'},
            {x: 670, y: 150, width: 80, height: 20, color: '#34495e'},
            {x: 250, y: 530, width: 80, height: 20, color: '#34495e'},
            {x: 670, y: 530, width: 80, height: 20, color: '#34495e'},
            {x: 450, y: 300, width: 20, height: 100, color: '#34495e'},
            {x: 550, y: 300, width: 20, height: 100, color: '#34495e'},
        ]
    }
];

let currentMapIndex = 0;
let WALLS = MAPS[currentMapIndex].walls;

function checkWallCollision(x, y, size) {
    for(const wall of WALLS) {
        if(x + size > wall.x && x - size < wall.x + wall.width && y + size > wall.y && y - size < wall.y + wall.height) {
            return true;
        }
    }
    return false;
}

let players = new Map();
let lastId = 1000;
let admins = new Set();

const MAP_CHANGE_INTERVAL = 180000; // 3 minutes

setInterval(() => {
    currentMapIndex = (currentMapIndex + 1) % MAPS.length;
    WALLS = MAPS[currentMapIndex].walls;
    const msg = JSON.stringify({ type: "mapChange", mapIndex: currentMapIndex });
    for(const [id, p] of players) {
        if(p.ws.readyState === WebSocket.OPEN) p.ws.send(msg);
    }
    console.log("Map changed to", currentMapIndex);
}, MAP_CHANGE_INTERVAL);

function broadcastAll(obj) {
    const msg = JSON.stringify(obj);
    for(const [id, p] of players) {
        if(p.ws.readyState === WebSocket.OPEN) p.ws.send(msg);
    }
}

wss.on("connection", ws=>{
    const id = ++lastId;
    const color=["#39f","#4cd","cyan","#f66","#7c3","#ff7","#9af","#f9a"][Math.floor(Math.random()*8)];
    players.set(id, { ws, x:500, y:350, vx:0, vy:0, hp:100, username:"P"+id, color, deadUntil:0, kills:0, lastShot:0 });
    console.log("Player connected", id);

    ws.send(JSON.stringify({ type: "init", id, hp:100, deadUntil: 0 }));
    ws.send(JSON.stringify({ type: "mapChange", mapIndex: currentMapIndex }));

    let bullets = [];

    ws.on("message", raw=>{
        let data;
        try { data = JSON.parse(raw); } catch(e){ return; }
        const me = players.get(id);
        if(!me) return;

        // ADMIN AUTH
        if(data.type === "adminAuth" && typeof data.password === "string") {
            if(data.password === ADMIN_PASSWORD) {
                admins.add(id);
                ws.send(JSON.stringify({ type: "adminAuth", success: true }));
                console.log("Admin granted to", id);
            } else {
                ws.send(JSON.stringify({ type: "adminAuth", success: false }));
                console.log("Admin failed for", id);
            }
            return;
        }

        // ADMIN COMMANDS (require admins.has(id) and correct supplied password)
        if(data.type === "adminChangeMap" && admins.has(id) && data.password === ADMIN_PASSWORD) {
            currentMapIndex = (currentMapIndex + 1) % MAPS.length;
            WALLS = MAPS[currentMapIndex].walls;
            broadcastAll({ type: "mapChange", mapIndex: currentMapIndex });
            return;
        }
        if(data.type === "adminSetMap" && admins.has(id) && data.password === ADMIN_PASSWORD) {
            const idx = parseInt(data.mapIndex) || 0;
            currentMapIndex = Math.max(0, Math.min(MAPS.length-1, idx));
            WALLS = MAPS[currentMapIndex].walls;
            broadcastAll({ type: "mapChange", mapIndex: currentMapIndex });
            return;
        }
        if(data.type === "adminKillAll" && admins.has(id) && data.password === ADMIN_PASSWORD) {
            for(const [pid, p] of players) {
                p.hp = 0;
                p.deadUntil = Date.now() + 3000;
                if(p.ws.readyState === WebSocket.OPEN) p.ws.send(JSON.stringify({ type: "dead", playerId: pid, deadUntil: p.deadUntil }));
            }
            broadcastAll({ type: "adminBroadcast", message: "Admin killed all players" });
            return;
        }
        if(data.type === "adminHealAll" && admins.has(id) && data.password === ADMIN_PASSWORD) {
            for(const [pid, p] of players) { p.hp = 100; p.deadUntil = 0; }
            broadcastAll({ type: "adminBroadcast", message: "Admin healed everyone" });
            return;
        }
        if(data.type === "adminResetKills" && admins.has(id) && data.password === ADMIN_PASSWORD) {
            for(const [pid, p] of players) p.kills = 0;
            broadcastAll({ type: "adminBroadcast", message: "Admin reset all kills" });
            return;
        }
        if(data.type === "adminKick" && admins.has(id) && data.password === ADMIN_PASSWORD) {
            const tid = parseInt(data.playerId);
            const target = players.get(tid);
            if(target && target.ws.readyState === WebSocket.OPEN) {
                target.ws.close();
                broadcastAll({ type: "adminBroadcast", message: `${target.username} was kicked by admin` });
            }
            return;
        }
        if(data.type === "adminBroadcast" && admins.has(id) && data.password === ADMIN_PASSWORD) {
            broadcastAll({ type: "adminBroadcast", message: data.message || "" });
            return;
        }

        // Normal flow
        if(me.deadUntil > Date.now()) {
            if(data.type !== "setName" && data.type !== "chat") return;
        }

        if(data.type === "setName" && typeof data.name === "string") {
            me.username = data.name.slice(0,16);
            // broadcast authoritative state (including to the sender)
            broadcastAll({ type: "state", playerId: id, state: {
                x: me.x, y: me.y, vx: me.vx, vy: me.vy, hp: me.hp,
                username: me.username, color: me.color, deadUntil: me.deadUntil, kills: me.kills, bullets
            }});
            return;
        }

        if(data.type === "chat" && typeof data.message === "string") {
            broadcastAll({ type: "chat", playerId: id, username: me.username, message: data.message.slice(0,120) });
            return;
        }

        if(data.type === "shoot" && typeof data.angle === "number") {
            const now = Date.now();
            if(now - (me.lastShot || 0) < 300) return;
            me.lastShot = now;
            const dx = Math.cos(data.angle) * 10;
            const dy = Math.sin(data.angle) * 10;
            bullets.push({ x: data.x || me.x, y: data.y || me.y, dx, dy, t: now, owner: id });
            return;
        }

        if(data.type === "update" && data.state) {
            me.x = typeof data.state.x === "number" ? data.state.x : me.x;
            me.y = typeof data.state.y === "number" ? data.state.y : me.y;
            me.vx = typeof data.state.vx === "number" ? data.state.vx : me.vx;
            me.vy = typeof data.state.vy === "number" ? data.state.vy : me.vy;
            if(Array.isArray(data.state.bullets)) bullets = data.state.bullets;
            return;
        }
    });

    // Per-connection interval: regen, bullets, collisions, broadcast authoritative state (including to origin)
    const tick = setInterval(()=>{
        const me = players.get(id);
        if(!me) return;

        const RESP_COOLDOWN_MS = 3000;

        // respawn handling
        if(me.deadUntil > 0 && me.deadUntil <= Date.now()) {
            me.deadUntil = 0;
            me.hp = 100;
            me.x = 500; me.y = 350; me.vx = 0; me.vy = 0;
            me.ws.send(JSON.stringify({ type: "respawned", playerId: id }));
            broadcastAll({ type: "state", playerId: id, state: { x: me.x, y: me.y, vx: me.vx, vy: me.vy, hp: me.hp, username: me.username, color: me.color, deadUntil: 0, kills: me.kills, bullets: [] }});
        }

        // regeneration (authoritative)
        if(me.deadUntil === 0 && me.hp < 100) {
            me.hp = Math.min(100, me.hp + 0.5); // ~10 HP/s at 50ms tick
        }

        // bullet updates & collisions
        if(bullets.length > 0) {
            // advance bullets
            for(const b of bullets) { b.x += b.dx; b.y += b.dy; }
            // check collisions against all players
            for(const [pid, p] of players) {
                if(p.deadUntil > Date.now()) continue;
                for(let i = bullets.length - 1; i >= 0; i--) {
                    const b = bullets[i];
                    // ignore bullet owner hitting themselves
                    if(b.owner === pid) continue;
                    if(checkWallCollision(b.x, b.y, 6)) {
                        bullets.splice(i, 1);
                        continue;
                    }
                    const dx = b.x - p.x, dy = b.y - p.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if(dist < 22) {
                        // damage
                        p.hp -= 20;
                        p.vx += dx * 0.1;
                        p.vy += dy * 0.1;
                        // notify everyone about hit
                        broadcastAll({ type: "hit", playerId: pid, hp: p.hp, knock: { x: dx * 0.1, y: dy * 0.1 }});
                        bullets.splice(i, 1);
                        if(p.hp <= 0) {
                            p.hp = 0;
                            p.deadUntil = Date.now() + RESP_COOLDOWN_MS;
                            p.vx = 0; p.vy = 0;
                            // find killer (owner)
                            const killer = players.get(b.owner);
                            if(killer) killer.kills = (killer.kills || 0) + 1;
                            // notify dead to everybody
                            broadcastAll({ type: "dead", playerId: pid, deadUntil: p.deadUntil });
                            broadcastAll({ type: "kill", killerId: b.owner, victimId: pid, killerName: killer ? killer.username : "Unknown", victimName: p.username, killerKills: killer ? killer.kills : 0 });
                        }
                    }
                }
            }
        }

        // broadcast authoritative state for this player to everyone (including the sender)
        if(me) {
            broadcastAll({ type: "state", playerId: id, state: {
                x: me.x, y: me.y, vx: me.vx, vy: me.vy, hp: me.hp, username: me.username, color: me.color, deadUntil: me.deadUntil, kills: me.kills, bullets
            }});
        }
    }, 50);

    ws.on("close", ()=>{
        clearInterval(tick);
        admins.delete(id);
        players.delete(id);
        broadcastAll({ type: "leave", playerId: id });
        console.log("Player disconnected", id);
    });
});

