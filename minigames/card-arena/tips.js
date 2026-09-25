const tipsPanel=document.getElementById('tipsPanel'),tipsBtn=document.getElementById('tipsBtn');
function toggleTips(open){tipsPanel.hidden=!open;tipsBtn.setAttribute('aria-expanded',String(open));if(open)updateTip();else tipsBtn.focus();}
function updateTip(){let tip='Build exactly six cards: one active, three different passives, one pet and one loadout.';
if(combat&&!combat.over){const p=combat.player;tip=p.hp<p.maxHp*.4?'Low HP: consider healing or a gloo wall before attacking.':p.energy<2?'Low energy: basic attacks cost nothing. Save energy for your next skill.':p.focus>0?'Focus ready: your next damaging action can convert it into extra damage.':!p.loadoutUsed?'Your loadout is still available. Time it around HP, cooldowns and enemy shield.':'Supply used: manage your remaining skills and gloo walls.';}
document.getElementById('liveTip').textContent=tip;}
tipsBtn.addEventListener('click',()=>toggleTips(tipsPanel.hidden));document.getElementById('closeTips').addEventListener('click',()=>toggleTips(false));document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!tipsPanel.hidden)toggleTips(false);});
setInterval(()=>{if(!tipsPanel.hidden)updateTip();},1000);
