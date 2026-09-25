// card-arena/ and ff-center/ are sibling folders in the hosting project.
// Preserve filenames from the original character dataset (including punctuation).
const characterImageRoot = new URL('../ff-center/assets/img/characters/', document.baseURI);
(window.FF_CHARACTERS || []).forEach(card => {
  const original = String(card.local_image_path || '');
  const filename = original.split('/').pop() || (String(card.name).toLowerCase().replace(/\s+/g, '-') + '.png');
  card.local_image_path = new URL(filename, characterImageRoot).href;
});
(window.FF_PETS || []).forEach(card => {
  card.local_image_path = card.image_url || 'assets/loadout.svg';
});
document.addEventListener('error', event => {
  if (event.target.tagName === 'IMG' && !event.target.dataset.fallback) {
    event.target.dataset.fallback = '1';
    event.target.src = new URL('assets/loadout.svg', document.baseURI).href;
  }
}, true);
