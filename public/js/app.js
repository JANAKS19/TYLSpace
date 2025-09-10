(() => {
  const STATUS = ['pending','shot','selected'];
  function uid(prefix='s'){ return prefix + Date.now().toString(36) + Math.floor(Math.random()*999).toString(36); }

  let data = { videos: [] };
  let currentVideo = null;
  let currentFrame = null;
  let selectedId = null;

  // Elements
  const timeline = document.getElementById('timeline');
  const sentenceForm = document.getElementById('sentenceForm');
  const sentenceText = document.getElementById('sentenceText');
  const camera = document.getElementById('camera');
  const lens = document.getElementById('lens');
  const shot = document.getElementById('shot');
  const footageInput = document.getElementById('footageInput');
  const btnAddFootage = document.getElementById('btnAddFootage');
  const footageList = document.getElementById('footageList');
  const btnAddSentence = document.getElementById('btnAddSentence');
  const btnDelete = document.getElementById('btnDelete');
  const btnSave = document.getElementById('btnSave');

  // ------------------ Load Data ------------------
  async function loadData() {
    try {
      const res = await fetch("/data"); // Node.js backend route
      data = await res.json();
    } catch (e) {
      console.error("Failed to load data from server", e);
      data = { videos: [] };
    }
  }

  // ------------------ Rendering ------------------
  function renderTimeline(){
    timeline.innerHTML = '';
    if (!currentFrame) return;

    currentFrame.sentences.forEach(s => {
      const el = document.createElement('div');
      el.className = 'card' + (s.sentenceId===selectedId ? ' selected' : '');
      el.dataset.id = s.sentenceId;
      el.innerHTML = `<div>${escapeHtml(s.text)}</div>`;
      el.addEventListener('click', () => selectSentence(s.sentenceId));
      timeline.appendChild(el);
    });
  }

  function renderDetails(){
    if (!currentFrame) return;
    const s = currentFrame.sentences.find(x => x.sentenceId === selectedId);
    if(!s){
      sentenceText.value = '';
      camera.value = '';
      lens.value = '';
      shot.value = '';
      footageList.innerHTML = '';
      return;
    }
    sentenceText.value = s.text || '';
    camera.value = s.cameraModule || '';
    lens.value = s.lensModule || '';
    shot.value = s.shot || '';
    renderFootage(s);
  }

  function renderFootage(s){
    footageList.innerHTML = '';
    (s.footage || []).forEach(f => {
      const item = document.createElement('div');
      item.className = 'footage-item';

      const dot = document.createElement('div');
      dot.className = 'status-dot status-' + f.status;
      dot.title = 'Click to change status';
      dot.style.cursor = 'pointer';
      dot.addEventListener('click', () => {
        const idx = STATUS.indexOf(f.status);
        f.status = STATUS[(idx+1)%STATUS.length];
        renderAll();
      });

      const label = document.createElement('div');
      label.className = 'footage-label';
      label.textContent = f.id;

      const remove = document.createElement('button');
      remove.textContent = '✕';
      remove.style.marginLeft = '8px';
      remove.addEventListener('click', () => {
        s.footage = s.footage.filter(x => x.id !== f.id);
        renderAll();
      });

      item.appendChild(dot);
      item.appendChild(label);
      item.appendChild(remove);
      footageList.appendChild(item);
    });
  }

  // ------------------ Actions ------------------
  function selectSentence(id){
    saveCurrentSentence(); // Save current before switching
    selectedId = id;
    renderAll();
    const el = timeline.querySelector(`[data-id="${id}"]`);
    if(el) el.scrollIntoView({behavior:'smooth', inline:'center'});
  }

  function addSentence(){
    saveCurrentSentence();
    if (!currentFrame) { alert("No frame loaded"); return; }
    const newS = {
      sentenceId: uid(),
      text: 'New sentence',
      cameraModule: '',
      lensModule: '',
      shot: '',
      footage: []
    };
    currentFrame.sentences.push(newS);
    selectedId = newS.sentenceId;
    renderAll();
    const el = timeline.querySelector(`[data-id="${selectedId}"]`);
    if(el) el.scrollIntoView({behavior:'smooth', inline:'center'});
  }

  function deleteSentence(){
    if(!selectedId || !currentFrame) return;
    currentFrame.sentences = currentFrame.sentences.filter(s=>s.sentenceId!==selectedId);
    selectedId = currentFrame.sentences.length ? currentFrame.sentences[0].sentenceId : null;
    renderAll();
  }

  function addFootageToSelected(){
    const val = (footageInput.value||'').trim();
    if(!val) return;
    const s = currentFrame.sentences.find(x=>x.sentenceId===selectedId);
    if(!s){ alert('Select a sentence first'); return; }
    s.footage = s.footage || [];
    if(!s.footage.find(f=>f.id===val)) s.footage.push({id: val, status:'pending'});
    footageInput.value = '';
    renderAll();
  }

  // ------------------ Save helpers ------------------
 // ------------------ Save helpers ------------------
function saveCurrentSentence(){
  if(currentFrame && selectedId){
    const s = currentFrame.sentences.find(x => x.sentenceId === selectedId);
    if(s){
      s.text = sentenceText.value.trim();
      s.cameraModule = camera.value.trim();
      s.lensModule = lens.value.trim();
      s.shot = shot.value.trim();

      // Add footage from input if not empty
      const val = (footageInput.value||'').trim();
      if(val && !s.footage.find(f => f.id === val)){
        s.footage = s.footage || [];
        s.footage.push({id: val, status:'pending'});
        footageInput.value = ''; // clear input after adding
      }
    }
  }
}


  async function saveAllAndRedirect(){
    saveCurrentSentence(); // ensure last edits are saved
    try {
      const res = await fetch('/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if(!res.ok){
        throw new Error('Server responded with error');
      }

      location.href = 'list.html';
    } catch(e) {
      console.error('Failed to save data', e);
      alert('Failed to save data on server.');
    }
  }

  // ------------------ Form Submit ------------------
  sentenceForm.addEventListener('submit', e => {
    e.preventDefault();
    saveAllAndRedirect();
  });

  // ------------------ Buttons ------------------
  btnAddFootage.addEventListener('click', addFootageToSelected);
  btnAddSentence.addEventListener('click', addSentence);
  btnDelete.addEventListener('click', () => {
    if(confirm('Delete selected sentence?')) deleteSentence();
  });
  btnSave.addEventListener('click', saveAllAndRedirect);

  // ------------------ Utilities ------------------
  function escapeHtml(s){
    return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function renderAll(){
    renderTimeline();
    renderDetails();
  }

  // ------------------ Init ------------------
  async function init(){
    await loadData();
    const params = new URLSearchParams(location.search);
    const videoId = params.get('video');
    const frameNum = params.get('frame');

    currentVideo = data.videos.find(v=>v.id==videoId);
    if(!currentVideo){ location.href='list.html'; return; }

    if(frameNum) currentFrame = currentVideo.frames.find(f=>f.frameNumber==frameNum);
    else currentFrame = currentVideo.frames[0];

    if(!currentFrame){ location.href='list.html'; return; }

    selectedId = currentFrame.sentences.length ? currentFrame.sentences[0].sentenceId : null;
    renderAll();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
