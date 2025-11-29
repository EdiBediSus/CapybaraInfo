// Slipper Attack Server with Admin Controls
const WebSocket = require("ws");
const PORT = process.env.PORT || 10000;
const wss = new WebSocket.Server({ port: PORT });

// 🔐 ADMIN PASSWORD - Change this to your own password!
const ADMIN_PASSWORD = "admin123";

wss.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`\n🚨 ERROR: Port ${PORT} is already in use. Please stop the old process or change the port.`);
    } else {
        console.error('Server error:', error.message);
    }
});

console.log("✅ WebSocket server running on port", PORT);
console.log("🔐 Admin password:", ADMIN_PASSWORD);

const MAP_CHANGE_INTERVAL = 180000; // 3 minutes

const MAPS = [
    // Map 1: Cross layout
    [{x: 0, y: 0, width: 1000, height: 20}, {x: 0, y: 680, width: 1000, height: 20}, 
     {x: 0, y: 0, width: 20, height: 700}, {x: 980, y: 0, width: 20, height: 700},
     {x: 200, y: 200, width: 200, height: 20}, {x: 600, y: 200, width: 200, height: 20},
     {x: 200, y: 480, width: 200, height: 20}, {x: 600, y: 480, width: 200, height: 20},
     {x: 480, y: 100, width: 20, height: 200}, {x: 480, y: 400, width: 20, height: 200}],
    
    // Map 2: Arena
    [{x: 0, y: 0, width: 1000, height: 20}, {x: 0, y: 680, width: 1000, height: 20},
     {x: 0, y: 0, width: 20, height: 700}, {x: 980, y: 0, width: 20, height: 700},
     {x: 150, y: 150, width: 100, height: 100}, {x: 750, y: 150, width: 100, height: 100},
     {x: 150, y: 450, width: 100, height: 100}, {x: 750, y: 450, width: 100, height: 100},
     {x: 420, y: 250, width: 80, height: 80}, {x: 520, y: 370, width: 80, height: 80}],
    
    // Map 3: Maze
    [{x: 0, y: 0, width: 1000, height: 20}, {x: 0, y: 680, width: 1000, height: 20},
     {x: 0, y: 0, width: 20, height: 700}, {x: 980, y: 0, width: 20, height: 700},
     {x: 200, y: 100, width: 20, height: 250}, {x: 400, y: 150, width: 20, height: 400},
     {x: 600, y: 100, width: 20, height: 250}, {x: 800, y: 150, width: 20, height: 400},
     {x: 100, y: 300, width: 150, height: 20}, {x: 300, y: 500, width: 150, height: 20},
     {x: 550, y: 300, width: 150, height: 20}, {x: 700, y: 500, width: 150, height: 20}],
    
    // Map 4: Corridors
    [{x: 0, y: 0, width: 1000, height: 20}, {x: 0, y: 680, width: 1000, height: 20},
     {x: 0, y: 0, width: 20, height: 700}, {x: 980, y: 0, width: 20, height: 700},
     {x: 100, y: 200, width: 800, height: 20}, {x: 100, y: 480, width: 800, height: 20},
     {x: 300, y: 50, width: 20, height: 150}, {x: 700, y: 50, width: 20, height: 150},
     {x: 300, y: 520, width: 20, height: 150}, {x: 700, y: 520, width: 20, height: 150}],
    
    // Map 5: Open field
    [{x: 0, y: 0, width: 1000, height: 20}, {x: 0, y: 680, width: 1000, height: 20},
     {x: 0, y: 0, width: 20, height: 700}, {x: 980, y: 0, width: 20, height: 700},
     {x: 250, y: 150, width: 80, height: 20}, {x: 670, y: 150, width: 80, height: 20},
     {x: 250, y: 530, width: 80, height: 20}, {x: 670, y: 530, width: 80, height: 20},
     {x: 450, y: 300, width: 20, height: 100}, {x: 550, y: 300, width: 20, height: 100}]
];

let currentMapIndex = 0;
let WALLS = MAPS[currentMapIndex];

function checkWallCollision(x, y, size) {
    for(const wall of WALLS) {
        if(x + size > wall.x && 
           x - size < wall.x + wall.width &&
           y + size > wall.y && 
           y - size < wall.y + wall.height) {
            return true;
        }
    }
    return false;
}

let players = new Map(); 
let lastAssigned = 1000;
let admins = new Set(); // Track admin player IDs

// Map change timer
setInterval(() => {
    currentMapIndex = (currentMapIndex + 1) % MAPS.length;
    WALLS = MAPS[currentMapIndex];
    console.log(`🗺️ Map changed to index ${currentMapIndex}`);
    
    for(const [id, p] of players) {
        p.x = 500;
        p.y = 350;
        p.vx = 0;
        p.vy = 0;
    }
    
    const msg = JSON.stringify({type: "mapChange", mapIndex: currentMapIndex});
    for(const [id, p] of players) {
        if(p.ws.readyState === 1) {
            p.ws.send(msg);
        }
    }
}, MAP_CHANGE_INTERVAL);

function broadcast(obj, except=null){
    const msg = JSON.stringify(obj);
    for(const [id,p] of players){
        if(p.ws.readyState===WebSocket.OPEN && id!==except) p.ws.send(msg);
    }
}

function changeMap(newIndex) {
    currentMapIndex = newIndex % MAPS.length;
    WALLS = MAPS[currentMapIndex];
    console.log(`👑 Admin changed map to index ${currentMapIndex}`);
    
    for(const [id, p] of players) {
        p.x = 500;
        p.y = 350;
        p.vx = 0;
        p.vy = 0;
    }
    
    const msg = JSON.stringify({type: "mapChange", mapIndex: currentMapIndex});
    for(const [id, p] of players) {
        if(p.ws.readyState === 1) {
            p.ws.send(msg);
        }
    }
}

wss.on("connection", ws=>{
    const myId = (++lastAssigned);
    const color=["#39f","#4cd","cyan","#f66","#7c3","#ff7","#9af","#f9a"][Math.floor(Math.random()*8)];
    
    players.set(myId,{
        ws, x:500, y:350, vx:0, vy:0, hp:100,
        username:"P"+myId, color, deadUntil: 0, kills: 0,
        lastShot: 0
    });
    
    console.log("📡 Player connected:", myId, "| Total players:", players.size);
    
    ws.send(JSON.stringify({type:"init", id: myId, hp:100, deadUntil: 0}));
    ws.send(JSON.stringify({type:"mapChange", mapIndex: currentMapIndex}));

    let bullets = [];

    ws.on("message", raw=>{
        let data;
        try{ data=JSON.parse(raw); } catch(e){ return; }

        const me = players.get(myId);
        if(!me) return;
        
        // Admin authentication
        if(data.type==="adminAuth" && typeof data.password==="string"){
            if(data.password === ADMIN_PASSWORD) {
                admins.add(myId);
                console.log(`👑 Player ${myId} (${me.username}) is now an admin`);
                ws.send(JSON.stringify({type:"adminAuth", success: true}));
            } else {
                console.log(`❌ Player ${myId} failed admin auth`);
                ws.send(JSON.stringify({type:"adminAuth", success: false}));
            }
            return;
        }
        
        // Admin commands - verify password for each command
        if(data.type==="adminChangeMap" && admins.has(myId) && data.password === ADMIN_PASSWORD){
            changeMap(currentMapIndex + 1);
            return;
        }
        
        if(data.type==="adminSetMap" && admins.has(myId) && data.password === ADMIN_PASSWORD){
            changeMap(data.mapIndex);
            return;
        }
        
        if(data.type==="adminKillAll" && admins.has(myId) && data.password === ADMIN_PASSWORD){
            console.log(`👑 Admin ${me.username} killed all players`);
            for(const [id, p] of players) {
                if(p.hp > 0) {
                    p.hp = 0;
                    p.deadUntil = Date.now() + 3000;
                    p.vx = 0;
                    p.vy = 0;
                    p.ws.send(JSON.stringify({type:"dead", playerId: id, deadUntil: p.deadUntil}));
                }
            }
            broadcast({type:"adminBroadcast", message: "Admin killed everyone! 💀"});
            return;
        }
        
        if(data.type==="adminHealAll" && admins.has(myId) && data.password === ADMIN_PASSWORD){
            console.log(`👑 Admin ${me.username} healed all players`);
            for(const [id, p] of players) {
                p.hp = 100;
                p.deadUntil = 0;
            }
            broadcast({type:"adminBroadcast", message: "Admin healed everyone! ❤️"});
            return;
        }
        
        if(data.type==="adminResetKills" && admins.has(myId) && data.password === ADMIN_PASSWORD){
            console.log(`👑 Admin ${me.username} reset all kills`);
            for(const [id, p] of players) {
                p.kills = 0;
            }
            broadcast({type:"adminBroadcast", message: "Admin reset all kills! 🔄"});
            return;
        }
        
        if(data.type==="adminKick" && admins.has(myId) && data.password === ADMIN_PASSWORD){
            const targetId = parseInt(data.playerId);
            const target = players.get(targetId);
            if(target) {
                console.log(`👑 Admin ${me.username} kicked player ${target.username} (ID: ${targetId})`);
                target.ws.close();
                broadcast({type:"adminBroadcast", message: `${target.username} was kicked by admin`});
            }
            return;
        }
        
        if(data.type==="adminBroadcast" && admins.has(myId) && data.password === ADMIN_PASSWORD){
            console.log(`📢 Admin broadcast from ${me.username}: ${data.message}`);
            broadcast({type:"adminBroadcast", message: data.message});
            return;
        }
        
        if(me.deadUntil > Date.now()) { 
            if(data.type!=="setName" && data.type!=="chat") return; 
        }

        if(data.type==="setName" && typeof data.name==="string"){
            me.username = data.name.slice(0,16);
            broadcast({
                type:"state", 
                playerId: myId, 
                state:{
                    x: me.x, y: me.y, vx: me.vx, vy: me.vy, 
                    hp: me.hp, username: me.username, color: me.color, 
                    deadUntil: me.deadUntil, kills: me.kills, bullets: bullets
                }
            }, myId);
            return;
        }

        if(data.type==="chat" && typeof data.message==="string"){
            broadcast({
                type:"chat",
                playerId: myId,
                username: me.username,
                message: data.message.slice(0,120)
            });
            return;
        }
        
        if(data.type==="shoot" && typeof data.angle==="number"){
            const now = Date.now();
            const SHOT_COOLDOWN = 300;
            
            if(now - (me.lastShot || 0) < SHOT_COOLDOWN) {
                return;
            }
            
            me.lastShot = now;
            
            const dx = Math.cos(data.angle) * 10;
            const dy = Math.sin(data.angle) * 10;
            bullets.push({
                x: data.x || me.x,
                y: data.y || me.y,
                dx: dx,
                dy: dy,
                t: now
            });
            
            return;
        }

        if(data.type==="update" && data.state){
            me.x = data.state.x || me.x;
            me.y = data.state.y || me.y;
            me.vx = data.state.vx || me.vx;
            me.vy = data.state.vy || me.vy;
            if(Array.isArray(data.state.bullets)) {
                bullets = data.state.bullets;
            }
        }
    });

    const interval = setInterval(()=>{
        const me = players.get(myId);
        if(!me) return;
        
        const RESP_COOLDOWN_MS = 3000;

        if (me.deadUntil > 0 && me.deadUntil <= Date.now()) {
            me.deadUntil = 0;
            me.hp = 100;
            me.x = 500; me.y = 350; me.vx = 0; me.vy = 0;
            bullets = [];
            
            console.log(`✨ Player ${myId} respawned`);
            
            me.ws.send(JSON.stringify({type:"respawned", playerId: myId}));
            
            broadcast({
                type:"state", 
                playerId: myId, 
                state:{
                    x: me.x, y: me.y, vx: me.vx, vy: me.vy, hp: me.hp, 
                    username: me.username, color: me.color, 
                    deadUntil: 0, kills: me.kills, bullets: []
                }
            }, myId);
        }

        if(me.deadUntil === 0 && me.hp < 100) { 
            me.hp = Math.min(100, me.hp + 0.5);
        }

        if (me.deadUntil === 0 && bullets.length > 0) { 
            for(const [targetId, target] of players){
                if(targetId === myId) continue;
                if(target.deadUntil > Date.now()) continue;
                
                let bulletsToRemove = [];

                bullets.forEach((bullet, bulletIndex) => {
                    if(checkWallCollision(bullet.x, bullet.y, 6)) {
                        bulletsToRemove.push(bulletIndex);
                        return;
                    }
                    
                    const dx = bullet.x - target.x;
                    const dy = bullet.y - target.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if(distance < 22) {
                        console.log(`💥 HIT! Player ${myId} hit player ${targetId}`);
                        
                        target.hp -= 20;
                        
                        const knockX = dx * 0.1;
                        const knockY = dy * 0.1;
                        target.vx += knockX;
                        target.vy += knockY;
                        
                        broadcast({
                            type:"hit", 
                            playerId: targetId, 
                            hp: target.hp, 
                            knock: {x: knockX, y: knockY}
                        });
                        
                        bulletsToRemove.push(bulletIndex);

                        if(target.hp <= 0){
                            target.hp = 0;
                            target.deadUntil = Date.now() + RESP_COOLDOWN_MS;
                            target.vx = 0;
                            target.vy = 0;
                            
                            me.kills++;
                            console.log(`☠️ KILL: ${me.username} (${myId}) eliminated ${target.username} (${targetId})`);
                            
                            target.ws.send(JSON.stringify({
                                type:"dead", 
                                playerId: targetId, 
                                deadUntil: target.deadUntil
                            }));
                            
                            broadcast({
                                type:"dead", 
                                playerId: targetId, 
                                deadUntil: target.deadUntil
                            });
                            
                            broadcast({
                                type:"kill",
                                killerId: myId,
                                victimId: targetId,
                                killerName: me.username,
                                victimName: target.username,
                                killerKills: me.kills
                            });
                        }
                    }
                });
                
                for(let i = bulletsToRemove.length - 1; i >= 0; i--){
                    bullets.splice(bulletsToRemove[i], 1);
                }
            }
        }

        broadcast({
            type:"state", 
            playerId: myId, 
            state:{
                x: me.x, y: me.y, vx: me.vx, vy: me.vy, hp: me.hp, 
                username: me.username, color: me.color, 
                deadUntil: me.deadUntil, kills: me.kills, bullets: bullets
            }
        }, myId); 
    }, 50);

    ws.on("close", ()=>{
        clearInterval(interval);
        admins.delete(myId);
        players.delete(myId);
        broadcast({type:"leave", playerId: myId});
        console.log("❌ Player disconnected:", myId, "| Total players:", players.size);
    });
});