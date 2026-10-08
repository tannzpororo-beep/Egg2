const GAME_CONFIG = {
  economy:{startingCoins:250, offlineCapSeconds:8*60*60, speedPerTreadmill:10, baseIncomeMultiplier:1},
  player:{walkSpeed:7, sprintSpeed:11, jumpSpeed:10, carryMultiplier:.72, gravity:28},
  eggs:[
    {id:'basic',name:'Basic Egg',biome:'forest',rarity:'COMMON',value:25,hatch:['Chicken','Bird','Owl'],color:0xf4e7c5},
    {id:'forest',name:'Forest Egg',biome:'forest',rarity:'UNCOMMON',value:90,hatch:['Bird','Raccoon','Owl'],color:0x73b86b},
    {id:'lake',name:'Lake Egg',biome:'lake',rarity:'RARE',value:350,hatch:['Frog','Owl','Whale'],color:0x54c7e8},
    {id:'desert',name:'Desert Egg',biome:'desert',rarity:'EPIC',value:1200,hatch:['Raccoon','Tiger','Scorpion'],color:0xf0a34a},
    {id:'jungle',name:'Jungle Egg',biome:'jungle',rarity:'LEGENDARY',value:4500,hatch:['Tiger','Dinosaur','Dragon'],color:0x44d17b},
    {id:'ice',name:'Ice Egg',biome:'ice',rarity:'MUTATED',value:15000,hatch:['Yeti','Whale','Cosmic Dragon'],color:0x8be7ff},
    {id:'volcano',name:'Volcano Egg',biome:'volcano',rarity:'HUGE',value:50000,hatch:['Scorpion','Dragon'],color:0xff6138},
    {id:'ocean',name:'Ocean Egg',biome:'ocean',rarity:'SECRET',value:150000,hatch:['Whale','Dragon','Cosmic Dragon'],color:0x3d8dff},
    {id:'cosmic',name:'Cosmic Egg',biome:'cosmic',rarity:'DIVINE',value:1000000,hatch:['Cosmic Dragon','Dragon'],color:0xb26cff}
  ],
  pets:{Chicken:1,Bird:5,Owl:20,Raccoon:80,Frog:150,Tiger:500,Yeti:2000,Scorpion:8000,Whale:25000,Dinosaur:60000,Dragon:150000,'Cosmic Dragon':1000000},
  biomes:[
    {id:'forest',name:'FOREST',need:0,color:0x5d9f58}, {id:'lake',name:'LAKE',need:500,color:0x3c9bd6}, {id:'desert',name:'DESERT',need:2500,color:0xd39b4c},
    {id:'jungle',name:'JUNGLE',need:8000,color:0x2b8b4a}, {id:'ice',name:'ICE',need:25000,color:0x9adff5}, {id:'volcano',name:'VOLCANO',need:75000,color:0xc84d3c},
    {id:'ocean',name:'OCEAN',need:200000,color:0x266ac0}, {id:'prehistoric',name:'PREHISTORIC',need:500000,color:0x7e9a4c}, {id:'cosmic',name:'COSMIC',need:1000000,color:0x6d43a8}
  ],
  rarityMultiplier:{COMMON:1,UNCOMMON:1.2,RARE:1.8,EPIC:2.5,LEGENDARY:4,MUTATED:7,HUGE:12,SECRET:30,ETERNAL:60,DIVINE:100}
};

const C=GAME_CONFIG;

const $=s=>document.querySelector(s), clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), fmt=n=>new Intl.NumberFormat('en-US',{notation:n>999999?'compact':'standard',maximumFractionDigits:0}).format(n);
const saveKey='tannEggHeistSaveV1';
const defaults={coins:C.economy.startingCoins,speed:0,pets:[],eggs:[],inventory:[],equippedPet:null,equippedTrail:null,baseLevel:1,unlockedBiomes:['forest'],settings:{graphics:'MEDIUM',sound:true,music:true,vibration:true,cameraSensitivity:1,showPets:true,showOthers:true},lastOnlineTimestamp:Date.now(),tutorialStep:0};
let S={...defaults,...JSON.parse(localStorage.getItem(saveKey)||'{}')}; S.settings={...defaults.settings,...S.settings};
function persist(){S.lastOnlineTimestamp=Date.now();localStorage.setItem(saveKey,JSON.stringify(S));}
function income(){return S.pets.reduce((n,p)=>n+(C.pets[p.name]||1)*(p.mult||1),0)}
const offline=Math.min(C.economy.offlineCapSeconds,Math.max(0,(Date.now()-(S.lastOnlineTimestamp||Date.now()))/1000)); if(offline>5){S.coins+=income()*offline;setTimeout(()=>toast(`WELCOME BACK! +$${fmt(income()*offline)} FROM YOUR PETS`),1200);}

const scene=new THREE.Scene(); scene.background=new THREE.Color(0x79c8f2); scene.fog=new THREE.Fog(0x79c8f2,55,230);
const camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,.1,500); camera.position.set(0,7,13);
const renderer=new THREE.WebGLRenderer({canvas:$('#game'),antialias:true,powerPreference:'high-performance'}); renderer.setPixelRatio(Math.min(devicePixelRatio,1.25)); renderer.setSize(innerWidth,innerHeight,false); renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFShadowMap;
scene.add(new THREE.HemisphereLight(0xdff6ff,0x42614b,2)); const sun=new THREE.DirectionalLight(0xffffff,3);sun.position.set(30,60,20);sun.castShadow=true;sun.shadow.mapSize.set(512,512);scene.add(sun);
const world=new THREE.Group();scene.add(world); const actors=new THREE.Group();scene.add(actors);
function mat(color,rough=.8,metal=0){return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});}
function box(w,h,d,color){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));m.castShadow=m.receiveShadow=true;return m}
function sph(r,color){const m=new THREE.Mesh(new THREE.SphereGeometry(r,16,12),mat(color));m.castShadow=m.receiveShadow=true;return m}
function cyl(r,h,color){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,12),mat(color));m.castShadow=m.receiveShadow=true;return m}
function label(text,color='#fff'){const c=document.createElement('canvas'),x=c.getContext('2d');c.width=512;c.height=96;x.fillStyle='rgba(10,15,30,.72)';x.roundRect(8,8,496,80,20);x.fill();x.fillStyle=color;x.font='bold 32px system-ui';x.textAlign='center';x.fillText(text,256,57);const t=new THREE.CanvasTexture(c);const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true}));sp.scale.set(5,.94,1);return sp}
function playerModel(color=0x65a8ff){const g=new THREE.Group();const body=box(1.05,1.35,.7,color);body.position.y=1.35;g.add(body);const head=sph(.58,0xffd0a8);head.position.y=2.45;g.add(head);const hair=sph(.62,0x3b251c);hair.scale.y=.45;hair.position.set(0,2.78,0);g.add(hair);for(const x of[-.72,.72]){const a=cyl(.16,.95,color);a.position.set(x,1.55,0);a.rotation.z=x<0?-.18:.18;g.add(a);const hand=sph(.2,0xffd0a8);hand.position.set(x*1.03,1.1,0);g.add(hand);const leg=box(.32,.9,.38,0x26355e);leg.position.set(x*.3,.45,0);g.add(leg)}return g}
function eggModel(color=0xf4e7c5,scale=1){const g=new THREE.Group();const e=sph(.7,color);e.scale.set(.85,1.18,.85);g.add(e);const ring=new THREE.Mesh(new THREE.TorusGeometry(.72,.045,8,32),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.3}));ring.rotation.x=Math.PI/2;g.add(ring);g.scale.setScalar(scale);return g}
function petModel(name){const colors={Chicken:0xffdf8a,Bird:0x5ecbff,Owl:0x8a6ad9,Raccoon:0x88919e,Frog:0x65db71,Tiger:0xffa13b,Yeti:0xe9f7ff,Scorpion:0xff7043,Whale:0x4e8fdc,Dinosaur:0x68b36b,Dragon:0xd455ff,'Cosmic Dragon':0x9f7cff};const g=new THREE.Group(), c=colors[name]||0xffffff;g.add(sph(.45,c));const head=sph(.32,c);head.position.y=.42;g.add(head);for(const x of[-.18,.18]){const foot=sph(.13,c);foot.position.set(x,-.38,.12);g.add(foot)}if(name.includes('Dragon')){const a=box(.9,.08,.45,0xd8a9ff);a.position.y=.25;a.rotation.z=.25;g.add(a)}return g}
function makeTree(x,z){const g=new THREE.Group();const trunk=cyl(.35,3,0x704c32);trunk.position.y=1.5;g.add(trunk);for(let i=0;i<3;i++){const top=sph(1.2-i*.18,0x4b9d59);top.position.set((i-1)*.5,3+i*.55,0);g.add(top)}g.position.set(x,0,z);world.add(g)}
function makeRock(x,z,s=1){const r=sph(s,0x777b83);r.scale.y=.55;r.position.set(x,s*.55,z);world.add(r)}
function terrain(){
  // FAST START: only the home/base zone is created synchronously.
  const ground=box(170,.6,170,0x4e9159); ground.position.y=-.35; ground.receiveShadow=true; world.add(ground);
  const base=box(16,.6,16,0x4b6cc8); base.position.set(0,.1,0); world.add(base);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(8,.18,8,32),new THREE.MeshBasicMaterial({color:0x8be7ff}));
  ring.rotation.x=Math.PI/2; ring.position.y=.5; world.add(ring);
  const title=label('YOUR BASE','#8be7ff'); title.position.set(0,5,0); world.add(title);
  // Small starter decoration set; more scenery streams in after PLAY.
  for(let i=0;i<14;i++){const a=Math.random()*Math.PI*2,d=18+Math.random()*34;makeTree(Math.cos(a)*d,Math.sin(a)*d)}
  for(let i=0;i<10;i++){const a=Math.random()*Math.PI*2,d=14+Math.random()*42;makeRock(Math.cos(a)*d,Math.sin(a)*d,.5+Math.random()*.7)}
}
terrain();

function streamWorld(){
  // Build distant biome pads/gates in tiny batches so the first frame is playable.
  const biomes=C.biomes.slice(1); let i=0;
  function batch(){
    const stop=Math.min(i+1,biomes.length);
    for(;i<stop;i++){
      const b=biomes[i]; const idx=i+1; const x=(idx%3-1)*55, z=Math.floor(idx/3)*-55-45;
      const pad=box(30,.4,30,b.color); pad.position.set(x,0,z); world.add(pad);
      const l=label(`${b.name} • ${b.need.toLocaleString()} SPEED`); l.position.set(x,4,z); world.add(l);
      const gate=box(5,5,.7,0x6d79a8); gate.position.set(x,2.5,z+15); world.add(gate);
    }
    if(i<biomes.length) setTimeout(batch,120);
  }
  setTimeout(batch,400);
}


const player=playerModel();actors.add(player); player.position.set(0,0,0);
const petsGroup=new THREE.Group();actors.add(petsGroup);
let eggs=[]; let guardians=[]; let others=new Map(); let carrying=null; let activeBiome='forest';
function spawnEgg(cfg=C.eggs[0],pos={x:0,z:-18}){const e=eggModel(cfg.color,1);e.userData={cfg,basePos:new THREE.Vector3(pos.x,.9,pos.z),stolen:false,drop:false};e.position.copy(e.userData.basePos);world.add(e);eggs.push(e);return e}
for(let i=0;i<4;i++){const cfg=C.eggs[i%2];spawnEgg(cfg,{x:-14+Math.random()*28,z:-18-Math.random()*24})}
function guardianModel(color=0xff7043){const g=new THREE.Group();const body=sph(1.35,color);body.position.y=1.35;g.add(body);const head=sph(.85,color);head.position.y=2.65;g.add(head);for(const x of[-.45,.45]){const horn=cyl(.12,.8,0xeee4cf);horn.position.set(x,3.35,0);horn.rotation.z=x<0?-.3:.3;g.add(horn)}return g}
for(let i=0;i<1;i++){const g=guardianModel([0xff8b55,0x8be0ff,0xc45bff][i]);g.position.set(-28+i*28,0,-45);g.userData={target:null,home:g.position.clone(),speed:4+i};world.add(g);guardians.push(g)}

const keys={};addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='Escape')toggleMenu(true);if(e.code==='KeyE')interact();if(e.code==='Space')jump()});addEventListener('keyup',e=>keys[e.code]=false);
let joystick={x:0,y:0,active:false};let cam={yaw:0,pitch:.18,dist:10,drag:false,lastX:0,lastY:0};
const hud=$('#hud'),menu=$('#menu');
function renderHUD(){hud.innerHTML=`<div class="topbar"><div class="card player-card"><div class="avatar">🥚</div><div><b>TANN</b><small>LEVEL ${S.baseLevel}</small></div></div><div class="card biome">${activeBiome.toUpperCase()} • SPEED ${fmt(S.speed)}</div><div class="card coins">🪙 $${fmt(S.coins)}</div></div><div class="prompt" id="prompt"></div><div class="bottom"><div class="card stats">⚡ ${fmt(S.speed)} SPEED<br>💰 $${fmt(income())}/s</div><div class="actions"><button id="jump">JUMP</button><button id="interact">STEAL</button><button id="sprint">SPRINT</button><button id="petsBtn">PETS</button><button id="menuBtn">☰</button></div></div><div id="stick"><i></i></div>`;
$('#jump').onclick=jump;$('#interact').onclick=interact;$('#petsBtn').onclick=()=>openPanel('PETS');$('#menuBtn').onclick=()=>toggleMenu(true);setupJoystick();}
function setupJoystick(){const st=$('#stick');if(!st)return;const move=e=>{const r=st.getBoundingClientRect(),p=e.touches?e.touches[0]:e,dx=p.clientX-(r.left+r.width/2),dy=p.clientY-(r.top+r.height/2),m=Math.min(48,Math.hypot(dx,dy)),a=Math.atan2(dy,dx);joystick.x=Math.cos(a)*m/48;joystick.y=Math.sin(a)*m/48;st.querySelector('i').style.transform=`translate(${joystick.x*38}px,${joystick.y*38}px)`};const end=()=>{joystick.x=joystick.y=0;st.querySelector('i').style.transform='translate(0,0)';joystick.active=false};st.addEventListener('touchstart',e=>{joystick.active=true;move(e)},{passive:true});st.addEventListener('touchmove',move,{passive:true});st.addEventListener('touchend',end)}
function nearestEgg(){let best=null,d=4;for(const e of eggs){if(e.userData.stolen)continue;const q=e.position.distanceTo(player.position);if(q<d){d=q;best=e}}return best}
function interact(){if(carrying){if(player.position.distanceTo(new THREE.Vector3(0,0,0))<10){returnEgg();}return;}const e=nearestEgg();if(e){steal(e)}}
function steal(e){carrying=e;e.userData.stolen=true;e.removeFromParent();player.add(e);e.position.set(0,2.4,0);toast('🥚 STEAL EGG! RETURN TO YOUR BASE');}
function returnEgg(){if(!carrying)return;const cfg=carrying.userData.cfg;player.remove(carrying);carrying.position.set(0,.9,0);world.add(carrying);carrying.position.copy(new THREE.Vector3(0,.9,0));eggs.push(carrying);S.eggs.push(cfg.id);toast('EGG RETURNED • HATCH IT AT BASE');carrying=null;persist();}
function dropEgg(){if(!carrying)return;player.remove(carrying);carrying.position.copy(player.position);world.add(carrying);carrying.userData.stolen=false;carrying.userData.drop=true;eggs.push(carrying);carrying=null;toast('💥 GUARDIAN HIT! EGG DROPPED');}
function jump(){if(player.position.y<=.02)player.userData.vy=C.player.jumpSpeed}
function hatch(){if(!S.eggs.length){toast('NO EGGS — STEAL ONE FIRST');return}const id=S.eggs.shift(),cfg=C.eggs.find(e=>e.id===id)||C.eggs[0];const name=cfg.hatch[Math.floor(Math.random()*cfg.hatch.length)];const mult=1+(Math.random()<.08?4:0);S.pets.push({name,mult});const p=petModel(name);p.position.set((Math.random()-.5)*5,1,2+Math.random()*2);p.userData.name=name;petsGroup.add(p);toast(`✨ ${cfg.rarity} ✨ YOU HATCHED ${name} • $${fmt((C.pets[name]||1)*mult)}/s`);persist();renderHUD()}
function treadmill(){if(player.position.distanceTo(new THREE.Vector3(10,0,0))<4){S.speed+=C.economy.speedPerTreadmill;S.coins+=1;toast('+10 SPEED');persist();}}
function updatePets(t){petsGroup.children.forEach((p,i)=>{const a=t*.001+i*2;p.position.lerp(new THREE.Vector3(player.position.x+Math.cos(a)*2,1+Math.sin(a*2)*.15,player.position.z+Math.sin(a)*2),.08);p.rotation.y+=.02})}
function updateGuardians(dt){guardians.forEach(g=>{const dist=g.position.distanceTo(player.position);const target=carrying?player.position:null;if(target&&dist<55){g.lookAt(player.position.x,g.position.y,player.position.z);g.position.lerp(player.position,.015*g.userData.speed);if(dist<2.5)dropEgg();}else{g.position.x=g.userData.home.x+Math.sin(performance.now()*.0004+g.userData.speed)*8;g.position.z=g.userData.home.z+Math.cos(performance.now()*.0005+g.userData.speed)*5}})}
function movement(dt){let x=(keys.KeyD?1:0)-(keys.KeyA?1:0)+joystick.x,y=(keys.KeyS?1:0)-(keys.KeyW?1:0)+joystick.y;const l=Math.hypot(x,y);if(l){x/=l;y/=l;const speed=(keys.ShiftLeft||keys.ShiftRight)?C.player.sprintSpeed:C.player.walkSpeed;const sp=carrying?speed*C.player.carryMultiplier:speed;player.position.x+=x*sp*dt;player.position.z+=y*sp*dt;player.rotation.y=Math.atan2(x,y);}
player.userData.vy=(player.userData.vy||0)-C.player.gravity*dt;player.position.y+=player.userData.vy*dt;if(player.position.y<0){player.position.y=0;player.userData.vy=0}player.position.x=clamp(player.position.x,-110,110);player.position.z=clamp(player.position.z,-120,80);if(player.position.distanceTo(new THREE.Vector3(10,0,0))<4)treadmill();
const target=new THREE.Vector3(player.position.x-Math.sin(cam.yaw)*cam.dist,player.position.y+5+cam.pitch*8,player.position.z-Math.cos(cam.yaw)*cam.dist);camera.position.lerp(target,.12);camera.lookAt(player.position.x,player.position.y+1.2,player.position.z);}
function toast(t){const n=document.createElement('div');n.className='toast';n.textContent=t;document.body.append(n);setTimeout(()=>n.remove(),2600)}
function openPanel(type){const html=type==='PETS'?`<div class="panel"><button class="close">×</button><h2>PETS</h2><div class="grid">${(S.pets.length?S.pets:[{name:'???'}]).map((p,i)=>`<div class="petcard"><div class="mini" id="mini${i}"></div><b>${p.name}</b><small>$${fmt((C.pets[p.name]||0)*(p.mult||1))}/s</small><button data-equip="${i}">EQUIP</button></div>`).join('')}</div><button id="hatchBtn" class="primary">HATCH EGG</button></div>`:`<div class="panel"><button class="close">×</button><h2>INDEX</h2><p>${S.pets.length} / 100 Pets</p><div class="index">${Object.keys(C.pets).map(n=>`<span>${S.pets.some(p=>p.name===n)?'🐾':'?' } ${n}</span>`).join('')}</div></div>`;menu.innerHTML=html;menu.classList.add('show');menu.querySelector('.close').onclick=()=>menu.classList.remove('show');menu.querySelector('#hatchBtn')?.addEventListener('click',hatch);menu.querySelectorAll('[data-equip]').forEach(b=>b.onclick=()=>{S.equippedPet=S.pets[+b.dataset.equip].name;toast('PET EQUIPPED');persist()});}
function toggleMenu(on){if(!on){menu.classList.remove('show');return}menu.innerHTML=`<div class="menuPanel"><h1>🥚 TANN EGG HEIST 3D</h1><p>STEAL • ESCAPE • HATCH • GROW</p><button class="primary" id="resume">PLAY</button><div class="menuRow"><button id="pets">PETS</button><button id="index">INDEX</button><button id="settings">SETTINGS</button></div><button id="reset">RESET SAVE</button><small>OFFLINE MODE READY • ${location.hostname||'local'}</small></div>`;menu.classList.add('show');$('#resume').onclick=()=>toggleMenu(false);$('#pets').onclick=()=>openPanel('PETS');$('#index').onclick=()=>openPanel('INDEX');$('#settings').onclick=()=>openPanel('INDEX');$('#reset').onclick=()=>{localStorage.removeItem(saveKey);location.reload()}}
function animate(){requestAnimationFrame(animate);const dt=Math.min(.033,clock.getDelta()),t=performance.now();movement(dt);updateGuardians(dt);updatePets(t);eggs.forEach(e=>{if(e.parent===world){e.rotation.y+=dt;e.position.y=e.userData.basePos.y+Math.sin(t*.002+e.position.x)*.12}});if(Math.random()<.02){S.coins+=income()/50;persist();renderHUD()}const p=nearestEgg();$('#prompt')&&(($('#prompt').textContent=p?'[E] STEAL EGG':carrying?'RETURN EGG TO BASE':'Find an Egg'));renderer.render(scene,camera)}
const clock=new THREE.Clock();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
addEventListener('pointerdown',e=>{if(e.target.closest('button')||e.target.closest('#stick'))return;cam.drag=true;cam.lastX=e.clientX;cam.lastY=e.clientY});addEventListener('pointermove',e=>{if(!cam.drag)return;cam.yaw-=(e.clientX-cam.lastX)*.006;cam.pitch=clamp(cam.pitch-(e.clientY-cam.lastY)*.003,-.3,.7);cam.lastX=e.clientX;cam.lastY=e.clientY});addEventListener('pointerup',()=>cam.drag=false);
renderHUD();
if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
// No fake long loading: start after the critical starter scene exists.
let prog=0; const timer=setInterval(()=>{prog+=50; $('#loadProgress').style.width=prog+'%'; if(prog>=100){clearInterval(timer); $('#loading').classList.add('hide'); animate(); streamWorld();}},70);
window.addEventListener('beforeunload',persist);
