// Optional development test. Playwright/Chromium are not shipped to players.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH || (process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES ? process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright' : 'playwright'));
const root=path.resolve(new URL('../',import.meta.url).pathname);
const artifacts=process.env.BLACKSITE_TEST_ARTIFACTS;
if(artifacts)fs.mkdirSync(artifacts,{recursive:true});
const server=http.createServer((req,res)=>{
 const route=decodeURIComponent(req.url.split('?')[0]);
 if(!route.startsWith('/BlackSite/')){res.writeHead(404);res.end();return;}
 const file=path.resolve(root,'.'+route.slice('/BlackSite'.length)+(route.endsWith('/')?'index.html':''));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 try{const data=fs.readFileSync(file);res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.wav':'audio/wav','.glb':'model/gltf-binary'})[path.extname(file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port+'/BlackSite/';let browser;
try{
 browser=await chromium.launch({headless:true,...(process.env.BLACKSITE_CHROMIUM?{executablePath:process.env.BLACKSITE_CHROMIUM}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:960,height:600}}),errors=[],external=[],responses=[];
 page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE_ERROR',e.message);});page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('request',r=>{if(!r.url().startsWith(base)&&!r.url().startsWith('data:')&&!r.url().startsWith('blob:'))external.push(r.url());});
 page.on('response',r=>{if(r.status()>=400)responses.push([r.status(),r.url()]);});
 await page.addInitScript(()=>{
  localStorage.setItem('blacksite.settings.v1',JSON.stringify({quality:'low',botCount:16,allyCount:0}));
  window.__freezeFrames=true;window.requestAnimationFrame=fn=>{window.__blacksiteFrame=fn;return 0;};
 });
 console.log('Opening local WebGL build');await page.goto(base+'?test',{waitUntil:'load',timeout:60000});
 console.log('Page loaded');await page.waitForFunction(()=>window.__game&&document.getElementById('start').disabled===false,null,{timeout:60000,polling:50});
 await page.evaluate(()=>{window.__freezeFrames=true;window.requestAnimationFrame=fn=>{window.__blacksiteFrame=fn;return 0;};window.__testNow=performance.now();window.__testFrames=count=>{const g=window.__game,render=g.renderer.render;g.renderer.render=()=>{};for(let i=0;i<count;i++){window.__testNow+=40;window.__blacksiteFrame(window.__testNow);}g.renderer.render=render;};});
 await page.click('#start');
 await page.waitForFunction(()=>document.pointerLockElement===document.getElementById('world'),null,{timeout:10000,polling:50});
 const original=await page.evaluate(()=>({pos:window.__game.player.pos.toArray(),time:window.__game.state.time}));
 await page.keyboard.down('w');await page.keyboard.down('Space');await page.evaluate(()=>window.__testFrames(5));
 assert.deepEqual(await page.evaluate(()=>window.__game.player.pos.toArray()),original.pos,'browser buy movement lock');
 await page.keyboard.up('w');await page.keyboard.up('Space');await page.keyboard.press('b');
 await page.waitForFunction(()=>!document.getElementById('buy').hidden,null,{polling:50});
 const shopTime=await page.evaluate(()=>window.__game.state.time);await page.evaluate(()=>window.__testFrames(800));assert.equal(await page.evaluate(()=>window.__game.state.time),shopTime,'shop pauses buy time');
 await page.click('[data-buy="armor"]');assert.equal(await page.evaluate(()=>window.__game.player.armor),100);
 await page.click('#closeBuy');await page.waitForFunction(()=>!window.__game.state.paused,null,{timeout:10000,polling:50});
 await page.evaluate(()=>window.__testFrames(1));assert.ok(await page.evaluate(()=>window.__game.state.time)<shopTime);
 console.log('PASS: real browser mouse capture, buy lock, paused shop timer, purchase and resume.');
 // Fixture deployments below do not represent user gestures. Avoid queueing
 // denied pointer-lock requests while switching dozens of matches instantly.
 await page.evaluate(()=>{window.__game.returnMenu();});
 await page.waitForFunction(()=>!document.pointerLockElement,null,{timeout:10000,polling:50});
 await page.evaluate(()=>{document.getElementById('world').requestPointerLock=()=>Promise.resolve();});
 const configurations=await page.evaluate(()=>{
  const g=window.__game,results=[];
  for(const map of Object.keys(g.MAPS))for(const side of ['attack','defend'])for(const bots of [1,6,16]){
   g.returnMenu();g.settings.map=map;g.settings.botCount=bots;g.settings.allyCount=bots===16?7:2;document.getElementById('side').value=side;g.startMatch();
   if(g.state.bots.length!==bots+g.settings.allyCount)throw Error('roster '+map);if(!g.state.bots.every(b=>g.canStand(b.pos.x,b.pos.z,.43)))throw Error('spawn '+map);
   g.state.phase='live';g.updateBots(.04);g.updateBotPresentation(.04);g.scene.updateMatrixWorld(true);
   g.scene.traverse(o=>{if(!o.position.toArray().every(Number.isFinite)||!o.quaternion.toArray().every(Number.isFinite))throw Error('NaN transform '+o.name);});
   for(const b of g.state.bots){const hand=b.operator.rightHand.getWorldPosition(b.pos.clone()),gun=b.gun.getWorldPosition(b.pos.clone());if(hand.distanceTo(gun)>.3)throw Error('weapon hand attachment '+map);const forward=b.pos.clone().set(0,0,1).applyQuaternion(b.operator.model.quaternion);if(forward.z>-.99)throw Error('operator facing '+map);}
   results.push({map,side,bots,allies:g.settings.allyCount});
  }return results;
 });assert.equal(configurations.length,24);console.log('PASS: 24 browser configurations, all four maps/both sides/1,6,16 enemies and 2,7 allies, finite animated transforms.');
 const budgets=[];
 for(const map of ['helix','bastion','ironwood','zero']){
  const result=await page.evaluate(map=>{
   const g=window.__game;g.returnMenu();g.settings.map=map;g.settings.botCount=16;g.settings.allyCount=0;g.startMatch();g.updatePlayer(0);g.updateBotPresentation(.04);g.scene.updateMatrixWorld(true);
   g.renderer.autoClear=true;const start=performance.now();g.renderer.render(g.scene,g.camera);const world={...g.renderer.info.render},elapsed=performance.now()-start;
   g.renderer.autoClear=false;g.renderer.clearDepth();g.renderer.render(g.viewScene,g.viewCamera);return {map,world,batch:g.worldBatch,softwareRenderSubmitMs:Math.round(elapsed)};
  },map);budgets.push(result);
  if(artifacts)await page.screenshot({path:path.join(artifacts,map+'-browser.png'),timeout:60000});
 }
 console.log('WEBGL_BUDGET '+JSON.stringify(budgets));
 if(artifacts){
  const operators=await page.evaluate(()=>{const g=window.__game;g.returnMenu();g.loadMap('helix');g.state.botCount=1;g.state.allyCount=1;g.state.side='attack';g.state.roster=[];g.nextRound();g.state.active=true;g.state.phase='live';document.getElementById('menu').hidden=true;document.getElementById('hud').hidden=false;document.getElementById('pause').hidden=true;g.state.bots.forEach((b,i)=>{b.pos.set(i? -1:1,0,23);b.group.rotation.y=Math.PI;b.target=g.player;});g.updateBotPresentation(.3);g.camera.position.set(0,1.68,26);g.camera.lookAt(0,1.3,22);g.scene.updateMatrixWorld(true);g.updateHUD();g.renderer.autoClear=true;g.renderer.render(g.scene,g.camera);return g.state.bots.map(b=>({team:b.team,hand:b.operator.model.getObjectByName('hand_r')?.getWorldPosition(g.player.pos.clone()).toArray(),position:b.pos.toArray()}));});
  console.log('OPERATOR_PRESENTATION '+JSON.stringify(operators));await page.screenshot({path:path.join(artifacts,'operators-browser.png'),timeout:60000});
 }
 const finishes=await page.evaluate(async()=>{
  const g=window.__game,{applySkin,SKINS}=await import('./skins.js?v=0.8.0');let count=0;
  for(const weapon of Object.keys(g.WEAPONS)){
   g.state.primary=weapon;g.state.secondary=weapon;g.state.owned=true;g.equip(weapon);
   for(const skin of SKINS){applySkin(g.gunRoot,skin.id);g.renderer.compile(g.viewScene,g.viewCamera);count++;}
  }return count;
 });assert.equal(finishes,72);console.log('PASS: all 72 weapon/finish combinations compiled with the actual WebGL renderer.');
 await page.evaluate(()=>window.__game.returnMenu());await page.waitForFunction(()=>!document.pointerLockElement,null,{timeout:10000,polling:50});
 for(const view of ['deploy','armory','career','challenges','manual','settings']){
  await page.click('[data-view="'+view+'"]');
  assert.equal(await page.locator('#view-'+view).isVisible(),true,view+' view is visible');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false,view+' horizontal overflow');
  if(artifacts)await page.screenshot({path:path.join(artifacts,view+'-browser.png'),timeout:60000});
 }
 await page.selectOption('[data-setting="crossShape"]','t');await page.locator('[data-setting="crossDynamic"]').uncheck();
 await page.selectOption('[data-setting="quality"]','high');assert.equal(await page.evaluate(()=>window.__game.renderer.shadowMap.enabled),true);
 await page.selectOption('[data-setting="quality"]','low');assert.equal(await page.evaluate(()=>window.__game.renderer.shadowMap.enabled),false);
 const persisted=await page.evaluate(()=>JSON.parse(localStorage.getItem('blacksite.settings.v1')));assert.equal(persisted.crossShape,'t');assert.equal(persisted.crossDynamic,false);
 await page.click('[data-view="armory"]');await page.click('[data-weapon="ak47"]');await page.selectOption('#skinSelect','desert');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('blacksite.skins.v1')).ak47),'desert');
 const recorded=await page.evaluate(()=>{
  const g=window.__game;g.settings.map='zero';g.settings.botCount=1;g.settings.allyCount=2;g.startMatch();g.state.kills=2;g.state.headshots=1;g.state.shotsFired=10;g.state.hits=4;g.state.plants=1;g.endRound(true,'Browser verification');return {xp:g.career.data.xp,rounds:g.career.data.stats.rounds};
 });assert.ok(recorded.xp>0);assert.equal(recorded.rounds,1);assert.ok((await page.locator('#resultStats').innerText()).includes('XP EARNED'));
 if(artifacts)await page.screenshot({path:path.join(artifacts,'report-browser.png'),timeout:60000});
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('blacksite.career.v1')));assert.ok(stored.xp>0);
 const resources=await page.evaluate(()=>{const g=window.__game,counts=[];g.returnMenu();for(let i=0;i<4;i++){g.loadMap('helix');g.state.botCount=16;g.state.allyCount=0;g.nextRound();g.updateBotPresentation(.04);g.renderer.autoClear=true;g.renderer.render(g.scene,g.camera);g.loadMap('helix');g.renderer.render(g.scene,g.camera);counts.push({...g.renderer.info.memory});}return counts;});
 assert.ok(resources.at(-1).geometries<=resources[1].geometries+2,'map geometry cleanup');assert.ok(resources.at(-1).textures<=resources[1].textures+2,'skeleton texture cleanup');console.log('RESOURCE_CLEANUP '+JSON.stringify(resources));
 // A fresh renderer verifies optional-operator failure and denied LocalStorage.
 const fallback=await browser.newPage({viewport:{width:800,height:600}});const fallbackErrors=[];fallback.on('pageerror',e=>fallbackErrors.push(e.message));
 await fallback.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw Error('Storage disabled for test');}});window.requestAnimationFrame=()=>0;});
 await fallback.route('**/assets/operators/operator.glb*',route=>route.abort());await fallback.goto(base+'?test');await fallback.waitForFunction(()=>window.__game&&!document.getElementById('start').disabled,null,{timeout:60000,polling:50});
 await fallback.evaluate(()=>{window.__stop=true;});await fallback.click('#start');assert.equal(await fallback.evaluate(()=>!!window.__game.state.bots[0].operator),false);assert.equal(await fallback.evaluate(()=>window.__game.career.sessionOnly),true);assert.deepEqual(fallbackErrors,[]);await fallback.close();
 assert.deepEqual(external,[],'no runtime website dependencies');assert.deepEqual(responses,[],'all Pages-relative assets resolve');assert.deepEqual(errors,[],'browser console/runtime errors');
 console.log('PASS: menus, saved settings/skins/career, report, graphics quality, optional operator fallback, denied storage, GitHub Pages subpath and no runtime external requests.');
} finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
