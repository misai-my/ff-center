'use strict';
/* A small, dependency-free top-down action engine. All positions use a fixed 900 × 520 world. */
window.BreakpointArena = class BreakpointArena {
  constructor(canvas, config, hooks) {
    this.canvas=canvas; this.ctx=canvas.getContext('2d'); this.config=config; this.hooks=hooks;
    this.width=900; this.height=520; this.running=true; this.finished=false;
    this.keys=new Set(); this.pointer={x:650,y:270}; this.joystick={x:0,y:0}; this.touchAim=false;
    this.player={x:110,y:260,r:15,hp:config.hp,maxHp:config.maxHp,medkits:config.medkits,invuln:0,dodge:0,scan:0,fire:0};
    this.bullets=[]; this.particles=[]; this.elapsed=0; this.hudSecond=-1; this.message=''; this.messageTime=0; this.shake=0; this.last=0; this.scanned=false;
    this.walls=[{x:275,y:82,w:92,h:76},{x:492,y:65,w:80,h:100},{x:315,y:300,w:110,h:82},{x:590,y:308,w:95,h:77}];
    this.exit={x:826,y:260,r:27,open:false};
    this.relays=config.id==='droneFight'?[{x:224,y:422,done:false},{x:721,y:93,done:false}]:config.id==='mocoFight'?[{x:710,y:106,done:false}]:[];
    // Spawns have clearance from cover. The earlier coordinates placed two guards inside crates.
    this.enemies=config.id==='patrolFight'?[this.enemy(535,220,'guard'),this.enemy(740,420,'guard'),this.enemy(748,215,'captain')]:config.id==='droneFight'?[this.enemy(680,260,'drone')]:[this.enemy(676,260,'moco')];
    this.unsubs=[];
    this.listen(window,'keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();this.keys.add(e.code);if(e.repeat)return;if(e.code==='KeyE')this.interact();if(e.code==='KeyF')this.heal();if(e.code==='KeyQ')this.scan();if(e.code==='ShiftLeft'||e.code==='ShiftRight')this.dodge()});
    this.listen(window,'keyup',e=>this.keys.delete(e.code));
    this.listen(window,'blur',()=>{this.keys.clear();this.joystick={x:0,y:0}});
    this.listen(canvas,'pointermove',e=>{if(e.pointerType==='mouse')this.pointer=this.canvasPoint(e)});
    this.listen(canvas,'pointerdown',e=>{if(e.pointerType==='mouse'){this.pointer=this.canvasPoint(e);this.shoot()}});
    this.frame=requestAnimationFrame(t=>this.tick(t));
    this.notice(config.id==='mocoFight'?'Stay alive, scan the terminal, then extract.':'Reach the exit after completing the objective.');
  }
  listen(target,event,handler){target.addEventListener(event,handler);this.unsubs.push(()=>target.removeEventListener(event,handler))}
  enemy(x,y,type){return{x,y,r:type==='drone'?25:16,type,hp:type==='drone'?105:type==='captain'?48:type==='moco'?Infinity:34,maxHp:type==='drone'?105:type==='captain'?48:type==='moco'?Infinity:34,fire:1+Math.random()*.7,stun:0,phase:Math.random()*6.28,facing:Math.PI}}
  canvasPoint(e){const box=this.canvas.getBoundingClientRect();return{x:(e.clientX-box.left)*this.width/box.width,y:(e.clientY-box.top)*this.height/box.height}}
  notice(s){this.message=s;this.messageTime=3.3;this.hooks.onHud?.(this)}
  obstacle(x,y,r){return this.walls.some(w=>x+r>w.x&&x-r<w.x+w.w&&y+r>w.y&&y-r<w.y+w.h)}
  move(entity,dx,dy){const r=entity.r;const x=Math.max(r+12,Math.min(this.width-r-12,entity.x+dx));const y=Math.max(r+12,Math.min(this.height-r-12,entity.y+dy));if(!this.obstacle(x,entity.y,r))entity.x=x;if(!this.obstacle(entity.x,y,r))entity.y=y}
  // Return the first wall intersected by a shot segment, or Infinity if clear.
  wallFraction(x1,y1,x2,y2){let first=Infinity;for(const w of this.walls){const left=w.x-3,right=w.x+w.w+3,top=w.y-3,bottom=w.y+w.h+3;let near=0,far=1;for(const [origin,delta,min,max] of [[x1,x2-x1,left,right],[y1,y2-y1,top,bottom]]){if(Math.abs(delta)<1e-8){if(origin<min||origin>max){near=Infinity;break}}else{const t1=(min-origin)/delta,t2=(max-origin)/delta;near=Math.max(near,Math.min(t1,t2));far=Math.min(far,Math.max(t1,t2))}}if(near<=far&&near>=0&&near<=1)first=Math.min(first,near)}return first}
  circleFraction(x1,y1,x2,y2,cx,cy,r){const dx=x2-x1,dy=y2-y1,fx=x1-cx,fy=y1-cy,a=dx*dx+dy*dy,b=2*(fx*dx+fy*dy),disc=b*b-4*a*(fx*fx+fy*fy-r*r);if(a<1e-8||disc<0)return Infinity;const t=(-b-Math.sqrt(disc))/(2*a);return t>=0&&t<=1?t:fx*fx+fy*fy<=r*r?0:Infinity}
  nearest(){return this.enemies.filter(e=>e.hp>0&&this.wallFraction(this.player.x,this.player.y,e.x,e.y)===Infinity).sort((a,b)=>Math.hypot(a.x-this.player.x,a.y-this.player.y)-Math.hypot(b.x-this.player.x,b.y-this.player.y))[0]}
  separateActors(){const actors=[this.player,...this.enemies.filter(e=>e.hp>0)];for(let i=0;i<actors.length;i++)for(let j=i+1;j<actors.length;j++){const a=actors[i],b=actors[j],dx=b.x-a.x,dy=b.y-a.y,actual=Math.hypot(dx,dy),min=a.r+b.r+5;if(actual>=min)continue;const ux=actual<.001?1:dx/actual,uy=actual<.001?0:dy/actual,push=(min-actual)/2;this.move(a,-ux*push,-uy*push);this.move(b,ux*push,uy*push)}}
  hitEnemy(e,bullet){if(e.type==='moco'){e.stun=.3;this.notice('Moco deflects the shot. Find the terminal.')}else{const shielded=e.type==='drone'&&this.relays.some(r=>!r.done),dmg=shielded?3:bullet.damage;e.hp=Math.max(0,e.hp-dmg);e.stun=.12;this.burst(e.x,e.y,shielded?'#8be5e2':'#ffab69',8);if(e.hp<=0)this.notice(`${e.type.toUpperCase()} DOWN`)}this.hooks.onHud?.(this)}
  shoot(){if(!this.running||this.player.fire>0)return;const p=this.player,target=this.touchAim?this.nearest():this.pointer;if(!target){p.fire=.55;this.notice('MOVE AROUND COVER FOR A CLEAR SHOT.');return}const angle=Math.atan2(target.y-p.y,target.x-p.x);p.fire=.22;this.bullets.push({x:p.x+Math.cos(angle)*19,y:p.y+Math.sin(angle)*19,vx:Math.cos(angle)*650,vy:Math.sin(angle)*650,life:1.25,owner:'player',damage:17});this.burst(p.x,p.y,'#ffd58a',3);this.hooks.onShot?.()}
  dodge(){const p=this.player;if(!this.running||p.dodge>0)return;let x=(this.keys.has('KeyD')||this.keys.has('ArrowRight')?1:0)-(this.keys.has('KeyA')||this.keys.has('ArrowLeft')?1:0)+this.joystick.x;let y=(this.keys.has('KeyS')||this.keys.has('ArrowDown')?1:0)-(this.keys.has('KeyW')||this.keys.has('ArrowUp')?1:0)+this.joystick.y;if(!x&&!y){x=Math.cos(Math.atan2(this.pointer.y-p.y,this.pointer.x-p.x));y=Math.sin(Math.atan2(this.pointer.y-p.y,this.pointer.x-p.x))}const n=Math.hypot(x,y)||1;for(let i=0;i<8;i++)this.move(p,x/n*12,y/n*12);p.invuln=.4;p.dodge=3.2;this.burst(p.x,p.y,'#8be5e2',16);this.notice('DODGE!')}
  scan(){if(!this.running||this.player.scan>0)return;this.player.scan=7;this.scanned=true;for(const e of this.enemies)if(Math.hypot(e.x-this.player.x,e.y-this.player.y)<265)e.stun=1.4;this.burst(this.player.x,this.player.y,'#8be5e2',28);this.notice('Pulse reveals and briefly jams nearby targets.');this.hooks.onHud?.(this)}
  heal(){const p=this.player;if(!this.running||p.medkits<1||p.hp>=p.maxHp)return;p.medkits--;p.hp=Math.min(p.maxHp,p.hp+32);this.burst(p.x,p.y,'#6fe2ac',18);this.notice('Field patch: +32 HP.');this.hooks.onHud?.(this)}
  interact(){if(!this.running)return;const p=this.player;for(const relay of this.relays){if(!relay.done&&Math.hypot(p.x-relay.x,p.y-relay.y)<56){relay.done=true;this.scanned=true;this.burst(relay.x,relay.y,'#8be5e2',30);this.notice(this.config.id==='mocoFight'?'Subject file decrypted. Survive the pursuit.':'Relay disabled. Drone shield disrupted.');this.hooks.onHud?.(this);return}}
    if(this.exit.open&&Math.hypot(p.x-this.exit.x,p.y-this.exit.y)<55){this.finish(true);return}this.notice('Move closer to a highlighted objective.');}
  objective(){const id=this.config.id;if(id==='patrolFight')return this.enemies.every(e=>e.hp<=0);if(id==='droneFight')return this.relays.every(r=>r.done)&&this.enemies.every(e=>e.hp<=0);return this.relays.every(r=>r.done)&&this.elapsed>=22}
  objectiveText(){const id=this.config.id;if(id==='patrolFight')return `CLEAR THE PATROL · ${this.enemies.filter(e=>e.hp>0).length} REMAINING`;if(id==='droneFight')return `DISABLE RELAYS ${this.relays.filter(r=>r.done).length}/2 · ${this.enemies[0].hp>0?'STOP THE HUNTER':'HUNTER DOWN'}`;return `DECRYPT FILE ${this.relays[0].done?'✓':'○'} · SURVIVE ${Math.max(0,Math.ceil(22-this.elapsed))}s`}
  burst(x,y,color,count){for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=30+Math.random()*160;this.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.25+Math.random()*.4,color})}}
  finish(win){if(this.finished)return;this.finished=true;this.running=false;this.hooks.onFinish?.({win,hp:this.player.hp,medkits:this.player.medkits,scanned:this.scanned})}
  tick(time){if(!this.running)return;const dt=this.last?Math.min(.04,(time-this.last)/1000):0;this.last=time;this.update(dt);this.draw();this.frame=requestAnimationFrame(t=>this.tick(t))}
  update(dt){const p=this.player;this.elapsed+=dt;p.fire=Math.max(0,p.fire-dt);p.dodge=Math.max(0,p.dodge-dt);p.scan=Math.max(0,p.scan-dt);p.invuln=Math.max(0,p.invuln-dt);this.messageTime=Math.max(0,this.messageTime-dt);this.shake=Math.max(0,this.shake-dt);
    if(Math.floor(this.elapsed)!==this.hudSecond){this.hudSecond=Math.floor(this.elapsed);this.hooks.onHud?.(this)}
    let dx=(this.keys.has('KeyD')||this.keys.has('ArrowRight')?1:0)-(this.keys.has('KeyA')||this.keys.has('ArrowLeft')?1:0)+this.joystick.x,dy=(this.keys.has('KeyS')||this.keys.has('ArrowDown')?1:0)-(this.keys.has('KeyW')||this.keys.has('ArrowUp')?1:0)+this.joystick.y;const n=Math.hypot(dx,dy);if(n>0){dx/=Math.max(1,n);dy/=Math.max(1,n);this.move(p,dx*210*dt,dy*210*dt)}
    if(this.keys.has('Space')){const enemy=this.nearest();if(enemy){const prev=this.touchAim;this.touchAim=true;this.shoot();this.touchAim=prev}}
    if(this.objective()&&!this.exit.open){this.exit.open=true;this.notice('EXTRACTION OPEN · reach the cyan gate and press E.');this.hooks.onHud?.(this)}
    for(const e of this.enemies){if(e.hp<=0)continue;e.stun=Math.max(0,e.stun-dt);if(e.stun>0)continue;const dist=Math.hypot(p.x-e.x,p.y-e.y),ang=Math.atan2(p.y-e.y,p.x-e.x);e.facing=ang;if(dist>105&&dist<590){const speed=dt*(e.type==='moco'?80:45),oldX=e.x,oldY=e.y;this.move(e,Math.cos(ang)*speed,Math.sin(ang)*speed);if(Math.hypot(e.x-oldX,e.y-oldY)<speed*.15)this.move(e,-Math.sin(ang)*speed,Math.cos(ang)*speed)}e.fire-=dt;if(e.fire<=0&&dist<570&&this.wallFraction(e.x,e.y,p.x,p.y)===Infinity){e.fire=e.type==='moco'?1.05:e.type==='drone'?1.15:1.6+Math.random()*.5;const speed=e.type==='drone'?295:250;this.bullets.push({x:e.x,y:e.y,vx:Math.cos(ang)*speed,vy:Math.sin(ang)*speed,life:2.3,owner:'enemy',damage:e.type==='drone'?11:e.type==='moco'?9:7})}}
    this.separateActors();
    for(const b of this.bullets){const x=b.x+b.vx*dt,y=b.y+b.vy*dt;b.life-=dt;let first=this.wallFraction(b.x,b.y,x,y),hit=null;
      if(b.owner==='player'){for(const e of this.enemies){if(e.hp<=0)continue;const t=this.circleFraction(b.x,b.y,x,y,e.x,e.y,e.r+5);if(t<first){first=t;hit=e}}}
      else{const t=this.circleFraction(b.x,b.y,x,y,p.x,p.y,p.r+5);if(t<first){first=t;hit=p}}
      if(first!==Infinity){b.x+=(x-b.x)*first;b.y+=(y-b.y)*first;b.life=0;if(hit===p&&p.invuln<=0){p.hp=Math.max(0,p.hp-b.damage);p.invuln=.55;this.shake=.2;this.burst(p.x,p.y,'#ff6b31',12);this.hooks.onHud?.(this);if(p.hp<=0){this.finish(false);return}}else if(hit)this.hitEnemy(hit,b);continue}
      b.x=x;b.y=y;if(x<0||x>900||y<0||y>520)b.life=0;
    }
    this.bullets=this.bullets.filter(b=>b.life>0);for(const t of this.particles){t.x+=t.vx*dt;t.y+=t.vy*dt;t.life-=dt}this.particles=this.particles.filter(t=>t.life>0);
  }
  draw(){const c=this.ctx;c.clearRect(0,0,900,520);c.save();if(this.shake)c.translate((Math.random()-.5)*7,(Math.random()-.5)*7);
    const g=c.createLinearGradient(0,0,900,520);g.addColorStop(0,this.config.id==='mocoFight'?'#123740':'#2d3c47');g.addColorStop(1,'#0f1723');c.fillStyle=g;c.fillRect(0,0,900,520);
    c.strokeStyle='#ffffff0c';c.lineWidth=1;for(let x=0;x<900;x+=40){c.beginPath();c.moveTo(x,0);c.lineTo(x,520);c.stroke()}for(let y=0;y<520;y+=40){c.beginPath();c.moveTo(0,y);c.lineTo(900,y);c.stroke()}
    c.fillStyle='#364551';c.fillRect(0,0,900,18);c.fillRect(0,502,900,18);c.fillRect(0,0,18,520);c.fillRect(882,0,18,520);c.strokeStyle='#ffcf7244';c.strokeRect(25,25,850,470);
    for(const w of this.walls){c.fillStyle='#101722';c.fillRect(w.x+6,w.y+7,w.w,w.h);c.fillStyle='#50616a';c.fillRect(w.x,w.y,w.w,w.h);c.fillStyle='#75818a';c.fillRect(w.x,w.y,w.w,9);c.strokeStyle='#b5a581';c.lineWidth=2;c.strokeRect(w.x,w.y,w.w,w.h);c.strokeStyle='#27333a';for(let x=w.x+18;x<w.x+w.w;x+=25){c.beginPath();c.moveTo(x,w.y+15);c.lineTo(x,w.y+w.h-12);c.stroke()}}
    for(const r of this.relays){c.save();c.translate(r.x,r.y);c.rotate(Math.PI/4);c.fillStyle=r.done?'#335d62':'#1d515a';c.fillRect(-16,-16,32,32);c.strokeStyle=r.done?'#829393':'#8be5e2';c.lineWidth=4;c.strokeRect(-16,-16,32,32);c.restore();this.label(c,r.x,r.y-35,r.done?'OFFLINE':'RELAY · E',r.done?'#aab8bc':'#8be5e2')}
    c.save();c.translate(this.exit.x,this.exit.y);c.strokeStyle=this.exit.open?'#8be5e2':'#8b6d61';c.lineWidth=6;c.strokeRect(-23,-45,45,90);c.fillStyle=this.exit.open?'#8be5e244':'#121923';c.fillRect(-21,-42,41,84);c.restore();this.label(c,this.exit.x,this.exit.y-60,this.exit.open?'EXIT · E':'LOCKED',this.exit.open?'#8be5e2':'#ac9b94');
    for(const b of this.bullets){c.fillStyle=b.owner==='player'?'#ffe4a4':'#ff7457';c.beginPath();c.arc(b.x,b.y,5,0,Math.PI*2);c.fill()}
    for(const e of this.enemies){if(e.hp<=0)continue;this.drawFighter(c,e,e.type,e.facing);if(Number.isFinite(e.hp)){c.fillStyle='#141d2c';c.fillRect(e.x-26,e.y-e.r-25,52,5);c.fillStyle='#ff6b31';c.fillRect(e.x-26,e.y-e.r-25,52*e.hp/e.maxHp,5)}}
    const p=this.player,target=this.touchAim?this.nearest():this.pointer,angle=target?Math.atan2(target.y-p.y,target.x-p.x):0;this.drawFighter(c,p,'player',angle);
    for(const t of this.particles){c.globalAlpha=Math.min(1,t.life*2);c.fillStyle=t.color;c.fillRect(t.x,t.y,4,4)}c.globalAlpha=1;
    if(this.messageTime>0){c.fillStyle='#101722dd';c.fillRect(230,24,440,43);c.strokeStyle='#ffcf72';c.strokeRect(230,24,440,43);this.label(c,450,51,this.message,'#f4f0e9')}
    c.restore();}
  drawFighter(c,actor,type,angle){
    c.save();c.translate(actor.x,actor.y);
    c.fillStyle='#070d15a9';c.beginPath();c.ellipse(3,7,type==='drone'?29:23,type==='drone'?17:15,0,0,Math.PI*2);c.fill();
    c.rotate(angle);
    if(type==='drone'){
      const pulse=.7+.3*Math.sin(this.elapsed*8);c.fillStyle='#29313b';c.strokeStyle='#d07456';c.lineWidth=3;
      for(const y of [-20,20])for(const x of [-17,17]){c.fillStyle='#394551';c.beginPath();c.arc(x,y,8,0,Math.PI*2);c.fill();c.stroke();c.strokeStyle='#d39b73';c.beginPath();c.moveTo(x-7,y);c.lineTo(x+7,y);c.stroke()}
      c.fillStyle='#75483f';c.beginPath();c.moveTo(-24,0);c.lineTo(-13,-15);c.lineTo(15,-15);c.lineTo(27,0);c.lineTo(15,15);c.lineTo(-13,15);c.closePath();c.fill();c.strokeStyle='#efb082';c.stroke();c.fillStyle='#212934';c.fillRect(-13,-8,22,16);c.fillStyle=`rgba(139,229,226,${pulse})`;c.beginPath();c.arc(7,0,6,0,Math.PI*2);c.fill();c.fillStyle='#16202b';c.fillRect(21,-4,15,8);
    }else{
      const player=type==='player',moco=type==='moco',captain=type==='captain';
      const cloth=player?'#da7950':moco?'#6b5e9e':captain?'#9a5942':'#545c61',armor=player?'#426476':moco?'#1c7e87':captain?'#693d33':'#343e48',trim=player?'#8be5e2':moco?'#65e9d9':captain?'#f6b676':'#dc7c65';
      // Boots, legs, rucksack and outstretched arms establish a readable top-down silhouette.
      c.fillStyle='#22252a';c.fillRect(-20,-13,12,9);c.fillRect(-20,4,12,9);c.fillStyle=cloth;c.fillRect(-17,-13,11,10);c.fillRect(-17,3,11,10);
      c.fillStyle=armor;c.fillRect(-14,-15,16,30);c.fillStyle='#1b2834';c.fillRect(-12,-11,5,22);c.fillStyle=trim;c.fillRect(-11,-8,3,16);
      c.fillStyle=cloth;c.beginPath();c.moveTo(-4,-17);c.lineTo(12,-13);c.lineTo(17,-8);c.lineTo(14,8);c.lineTo(11,14);c.lineTo(-4,17);c.closePath();c.fill();c.strokeStyle='#0c1520';c.lineWidth=2;c.stroke();
      c.fillStyle=armor;c.fillRect(-1,-11,11,22);c.fillStyle=trim;c.fillRect(5,-10,2,20);c.fillStyle=cloth;c.fillRect(2,-20,13,7);c.fillRect(2,13,13,7);c.fillStyle='#252b32';c.fillRect(13,-19,8,7);c.fillRect(13,12,8,7);
      c.fillStyle=moco?'#20252e':'#1f2831';c.fillRect(12,-5,26,10);c.fillStyle=player?'#bdc5bd':'#8497a0';c.fillRect(22,-3,21,6);c.fillStyle=trim;c.fillRect(15,-1,5,2);
      c.fillStyle=moco?'#202a35':'#d1a57d';c.beginPath();c.arc(7,0,9,0,Math.PI*2);c.fill();c.strokeStyle='#16202a';c.stroke();
      if(moco){c.strokeStyle='#47d5cb';c.lineWidth=4;c.beginPath();c.arc(5,0,10,.55,Math.PI*1.45);c.stroke();c.fillStyle='#9cf6ef';c.fillRect(8,-4,6,8)}
      else{c.fillStyle=player?'#c6b193':captain?'#976c4d':'#69737a';c.beginPath();c.arc(8,0,8,0,Math.PI*2);c.fill();c.strokeStyle=trim;c.lineWidth=2;c.beginPath();c.arc(8,0,8,Math.PI*.72,Math.PI*1.28);c.stroke();c.fillStyle=captain?'#ffb56f':'#1b272f';c.fillRect(11,-4,6,8)}
      if(player){c.strokeStyle='#8be5e2';c.lineWidth=2;c.beginPath();c.arc(0,0,22,0,Math.PI*2);c.stroke()}
      if(actor.stun>0){c.strokeStyle='#8be5e2';c.lineWidth=3;c.beginPath();c.arc(0,0,25,0,Math.PI*2);c.stroke()}
    }
    c.restore();
  }
  label(c,x,y,s,color){c.font='800 13px Arial';c.textAlign='center';c.fillStyle='#0c111acc';const w=Math.min(430,c.measureText(s).width+18);c.fillRect(x-w/2,y-15,w,21);c.fillStyle=color;c.fillText(s,x,y)}
  destroy(){this.running=false;cancelAnimationFrame(this.frame);for(const un of this.unsubs)un();this.unsubs=[]}
};
