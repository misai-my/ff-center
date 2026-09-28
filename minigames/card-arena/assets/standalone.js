// Hosted at ff-center/minigames/card-arena; shared art is two levels up.
const configuredBase = window.FF_ARENA_ASSET_BASE || new URLSearchParams(location.search).get('assetBase');
const imageCandidates = new Map();
(window.FF_CHARACTERS || []).forEach(card => {
  const filename = String(card.local_image_path || '').split('/').pop() || String(card.name).toLowerCase().replace(/\s+/g,'-')+'.png';
  const bases = configuredBase ? [configuredBase] : ['../../assets/img/characters/'];
  const urls = [...new Set(bases.map(base => new URL(filename,new URL(base.endsWith('/')?base:base+'/',document.baseURI)).href).concat(card.image_url || []).filter(Boolean))];
  urls.forEach(url => imageCandidates.set(url,urls));
  card.local_image_path=urls[0];
});
(window.FF_PETS || []).forEach(card => {card.local_image_path=card.image_url || 'assets/loadout.svg';});
const resolvedImages=new Map();
document.addEventListener('error',event=>{
 const img=event.target;if(img.tagName!=='IMG')return;
 const choices=imageCandidates.get(img.src)||[];
 const index=choices.indexOf(img.src);
 if(index>=0&&index+1<choices.length){img.src=choices[index+1];return;}
 if(!img.dataset.fallback){img.dataset.fallback='1';img.src=new URL('assets/character-placeholder.svg',document.baseURI).href;}
},true);
document.addEventListener('load',event=>{
 const img=event.target;if(img.tagName!=='IMG')return;
 const choices=imageCandidates.get(img.src);if(!choices)return;
 if(resolvedImages.get(choices[0])===img.src)return;
 resolvedImages.set(choices[0],img.src);
 (window.FF_CHARACTERS||[]).forEach(card=>{if(choices.includes(card.local_image_path))card.local_image_path=img.src;});
},true);
