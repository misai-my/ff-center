'use strict';
/* Visual assets are optional: gameplay retains vector fallbacks while images load. */
window.BreakpointArt=(()=>{
 const paths={ground:'assets/yard-ground.webp',props:'assets/props-atlas.webp',fighters:'assets/fighters-atlas.webp',drone:'assets/hunter-drone.webp'};
 const images={};for(const [key,path] of Object.entries(paths)){const img=new Image();img.src=path;images[key]=img}
 const ready=key=>images[key]?.complete&&images[key].naturalWidth>0;
 const fighterCell={player:0,guard:1,captain:2,moco:3};
 const propCell={crate:0,cover:1,terminal:2,gate:3,trader:4,beacon:5};
 function ground(c,sector=0){if(!ready('ground'))return false;c.drawImage(images.ground,0,0,900,520);if(sector===1){c.fillStyle='#57372b30';c.fillRect(0,0,900,520)}if(sector===2||sector==='mocoFight'){c.fillStyle='#063f4b66';c.fillRect(0,0,900,520)}if(sector==='droneFight'){c.fillStyle='#1a293c55';c.fillRect(0,0,900,520)}return true}
 function prop(c,key,x,y,w,h){if(!ready('props'))return false;const index=propCell[key];if(index===undefined)return false;const image=images.props,sw=image.naturalWidth/3,sh=image.naturalHeight/2;c.drawImage(image,(index%3)*sw,Math.floor(index/3)*sh,sw,sh,x-w/2,y-h/2,w,h);return true}
 function actor(c,unit,type,angle,elapsed=0){const image=type==='drone'?images.drone:images.fighters;if(!ready(type==='drone'?'drone':'fighters'))return false;c.save();c.translate(unit.x,unit.y);c.fillStyle='#030b13a3';c.beginPath();c.ellipse(1,10,type==='drone'?32:24,type==='drone'?19:13,0,0,Math.PI*2);c.fill();c.rotate(angle||0);const bob=Math.sin(elapsed*9+(unit.phase||0))*(type==='drone'?2:1);if(type==='drone')c.drawImage(image,-40,-29+bob,80,58);else{const index=fighterCell[type]??0,sw=image.naturalWidth/2,sh=image.naturalHeight/2;c.drawImage(image,(index%2)*sw,Math.floor(index/2)*sh,sw,sh,-38,-30+bob,76,60)}c.restore();return true}
 function light(c,x,y,color,r=62){const g=c.createRadialGradient(x,y,4,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2)}
 return{ground,prop,actor,light,ready};
})();
