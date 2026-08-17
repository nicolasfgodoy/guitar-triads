// ─── EXTENSÃO DE TRÍADES PARA O CIFRA CLUB ──────────────────────────────────────

// ─── Configurações globais e Estado da Extensão ──────────────────────────────────
let extConfig = {
  showSidebar: true,
  playSound: true
};

let extState = {
  detectedChords: [],
  selectedChord: null,
  extension: 'triad',
  voicing: 'R35',
  stringGroup: [5, 4, 3], // 1,2,3 cordas (em termos de array interno)
  activeRegions: [{ start: 0, end: 24 }],
  currentPositions: []
};

// ─── Constantes e Teoria (Importadas do app original) ──────────────────────────
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLAT_NAMES = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const STRING_TUNING = [4, 9, 2, 7, 11, 4]; // E A D G B E
const STRING_MIDI_BASE = [40, 45, 50, 55, 59, 64]; // Midi base para Cordas 6->1
const STRING_LABELS = { 0:'E', 1:'A', 2:'D', 3:'G', 4:'B', 5:'e' };

const FLAT_TO_SHARP = { 'Db':'C#','Eb':'D#','Gb':'F#','Ab':'G#','Bb':'A#' };

const EXT_DEFS = {
  triad:  { label:'Tríade',         notes: (r,q) => triadeNotes(r,q),        useExt: false },
  maj7:   { label:'Maj7',           notes: (r,q) => maj7Notes(r,q),           useExt: true, extLabel:'7M' },
  '7':    { label:'7',              notes: (r,q) => dom7Notes(r,q),           useExt: true, extLabel:'b7' },
  m7:     { label:'m7',             notes: (r,q) => m7Notes(r,q),             useExt: true, extLabel:'b7' },
  m7b5:   { label:'m7(b5)',         notes: (r,q) => m7b5Notes(r,q),           useExt: true, extLabel:'b7' },
  dim7:   { label:'dim7',           notes: (r,q) => dim7Notes(r,q),           useExt: true, extLabel:'bb7' },
  sus2:   { label:'Sus2',           notes: (r,q) => sus2Notes(r,q),           useExt: false, susLabel:'2' },
  sus4:   { label:'Sus4',           notes: (r,q) => sus4Notes(r,q),           useExt: false, susLabel:'4' }
};

// ─── AUDIO ENGINE (Guitar Synth) ──────────────────────────────────────────────
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playGuitarSynthNote(midiNote, delay = 0, duration = 1.3) {
  if (!extConfig.playSound) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime + delay;
    const freq = 440 * Math.pow(2, (midiNote - 69) / 12);

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filterNode = ctx.createBiquadFilter();

    osc1.connect(filterNode);
    osc2.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.type = 'triangle';
    osc2.type = 'sawtooth';
    osc1.frequency.value = freq;
    osc2.frequency.value = freq + 0.8;

    const gainOsc1 = ctx.createGain();
    const gainOsc2 = ctx.createGain();
    gainOsc1.gain.value = 0.8;
    gainOsc2.gain.value = 0.12;

    osc1.disconnect(filterNode);
    osc2.disconnect(filterNode);
    osc1.connect(gainOsc1);
    osc2.connect(gainOsc2);
    gainOsc1.connect(filterNode);
    gainOsc2.connect(filterNode);

    filterNode.type = 'lowpass';
    filterNode.frequency.setValueAtTime(freq * 4, now);
    filterNode.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.25);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.08, now + 0.25);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
  } catch (e) {
    console.error('Falha no Synth de Áudio da Extensão:', e);
  }
}

function playChordVoicing(notes) {
  const sortedNotes = [...notes].sort((a, b) => a.string - b.string);
  sortedNotes.forEach((note, idx) => {
    const midiNote = STRING_MIDI_BASE[note.string] + note.fret;
    const delay = idx * 0.045; // dedilhado
    playGuitarSynthNote(midiNote, delay, 1.4);
  });
}

// ─── Helpers de Teoria ──────────────────────────────────────────────────────────
function noteToIndex(note) {
  let i = NOTE_NAMES.indexOf(note);
  if (i===-1) i = FLAT_NAMES.indexOf(note);
  return i;
}
function indexToNote(idx, useFlat=false) {
  return (useFlat ? FLAT_NAMES : NOTE_NAMES)[((idx%12)+12)%12];
}

function n(sem, func, useFlat=false) { return { sem: ((sem%12)+12)%12, func, useFlat }; }

function triadeNotes(root, quality) {
  if (quality==='m')   return [n(root,'R'), n(root+3,'b3',true), n(root+7,'5')];
  if (quality==='dim') return [n(root,'R'), n(root+3,'b3',true), n(root+6,'b5',true)];
  return [n(root,'R'), n(root+4,'3'), n(root+7,'5')];
}
function maj7Notes(root, quality) {
  const base = triadeNotes(root, quality);
  base.push(n(root+11,'7M'));
  return base;
}
function dom7Notes(root, quality) {
  const base = triadeNotes(root, quality);
  base.push(n(root+10,'b7',true));
  return base;
}
function m7Notes(root, quality) {
  return [n(root,'R'), n(root+3,'b3',true), n(root+7,'5'), n(root+10,'b7',true)];
}
function m7b5Notes(root, quality) {
  return [n(root,'R'), n(root+3,'b3',true), n(root+6,'b5',true), n(root+10,'b7',true)];
}
function dim7Notes(root, quality) {
  return [n(root,'R'), n(root+3,'b3',true), n(root+6,'b5',true), n(root+9,'bb7',true)];
}
function sus2Notes(root, quality) {
  return [n(root,'R'), n(root+2,'2'), n(root+7,'5')];
}
function sus4Notes(root, quality) {
  return [n(root,'R'), n(root+5,'4'), n(root+7,'5')];
}

function noteColor(func) {
  if (func==='R') return '#c94a3a';
  if (func==='3'||func==='b3') return '#4a8a9a';
  if (func==='5'||func==='b5') return '#6a7a5a';
  if (func==='7M'||func==='b7'||func==='bb7') return '#9a6a9a';
  if (func==='2'||func==='4'||func==='6') return '#8a8a4a';
  return '#8a8078';
}

function getNoteAtFret(stringIndex, fret) {
  return (STRING_TUNING[stringIndex] + fret) % 12;
}

const VOICING_DEFS = {
  R35:  { label:'R-3-5',  pick: pool => pickByFuncs(pool, ['R','3','b3','5','b5']) },
  R37:  { label:'R-3-7',  pick: pool => pickByFuncs(pool, ['R','3','b3','7M','b7','bb7']) },
  R57:  { label:'R-5-7',  pick: pool => pickByFuncs(pool, ['R','5','b5','7M','b7','bb7']) },
  '357':{ label:'3-5-7',  pick: pool => pickByFuncs(pool, ['3','b3','5','b5','7M','b7','bb7']) }
};

function pickByFuncs(pool, funcs) {
  const out = [];
  for (const f of funcs) {
    const match = pool.find(p => p.func === f);
    if (match && !out.find(o => o.func === match.func)) out.push(match);
    if (out.length === 3) break;
  }
  return out.length === 3 ? out : null;
}

// ─── Encontrar voicings ─────────────────────────────────────────────────────────
function findVoicingPositions(chord) {
  if (!chord) return [];
  const def = EXT_DEFS[extState.extension] || EXT_DEFS.triad;
  const fullPool = def.notes(chord.root, chord.quality);
  const [s1, s2, s3] = extState.stringGroup;

  let voicingPool;
  if (extState.extension === 'triad') {
    voicingPool = fullPool.slice(0, 3);
  } else {
    const vdef = VOICING_DEFS[extState.voicing] || VOICING_DEFS.R35;
    voicingPool = vdef.pick(fullPool) || fullPool.slice(0, 3);
  }

  const positions = [];
  const noteValues = voicingPool.map(p => p.sem);

  for (const reg of extState.activeRegions) {
    const rStart = reg.start;
    const rEnd = reg.end;

    for (let inv = 0; inv < 3; inv++) {
      const bassIdx = inv % voicingPool.length;
      const midIdx  = (inv+1) % voicingPool.length;
      const topIdx  = (inv+2) % voicingPool.length;

      const bassNote = noteValues[bassIdx];
      const midNote  = noteValues[midIdx];
      const topNote  = noteValues[topIdx];

      for (let f3 = rStart; f3 <= rEnd; f3++) {
        if (getNoteAtFret(s3, f3) !== bassNote) continue;
        const f2mn = Math.max(0, f3-4), f2mx = Math.min(rEnd, f3+4);
        for (let f2 = f2mn; f2 <= f2mx; f2++) {
          if (getNoteAtFret(s2, f2) !== midNote) continue;
          const f1mn = Math.max(0, f2-4), f1mx = Math.min(rEnd, f2+4);
          for (let f1 = f1mn; f1 <= f1mx; f1++) {
            if (getNoteAtFret(s1, f1) !== topNote) continue;
            const hi = Math.max(f1,f2,f3), lo = Math.min(f1,f2,f3);
            if (hi-lo > 4) continue;
            
            const displayStart = Math.max(0, lo-1);
            const dup = positions.some(p => 
              p.inversion === inv && 
              p.frets[0] === f1 && 
              p.frets[1] === f2 && 
              p.frets[2] === f3
            );
            if (dup) continue;

            positions.push({
              inversion: inv,
              inversionName: ['Pos. Fundamental','1ª Inversão','2ª Inversão'][inv],
              strings: extState.stringGroup,
              frets: [f1,f2,f3],
              notes: [
                { string:s1, fret:f1, ...voicingPool[topIdx] },
                { string:s2, fret:f2, ...voicingPool[midIdx] },
                { string:s3, fret:f3, ...voicingPool[bassIdx] },
              ],
              displayStart,
            });
          }
        }
      }
    }
  }

  return positions.sort((a,b) => {
    if (a.inversion !== b.inversion) return a.inversion - b.inversion;
    return Math.min(...a.frets) - Math.min(...b.frets);
  });
}

// ─── Renderizador de SVG (Fretboard) ──────────────────────────────────────────
function renderFretboardSVG(position) {
  const W=150, H=190, sx=25, sy=12, ss=20, fs=26, nf=5;
  const tw=ss*5, th=fs*nf;
  let svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;

  for (let f=0; f<=nf; f++) {
    const y=sy+f*fs;
    svg += `<line x1="${sx}" y1="${y}" x2="${sx+tw}" y2="${y}" stroke="${f===0?'#7a6a58':'#2e2a26'}" stroke-width="${f===0?4:1.5}"/>`;
  }
  for (let s=0; s<6; s++) {
    const x=sx+s*ss;
    svg += `<line x1="${x}" y1="${sy}" x2="${x}" y2="${sy+th}" stroke="#4a443a" stroke-width="${1+(5-s)*0.3}"/>`;
  }
  for (let i=0; i<=nf; i++) {
    const fn=position.displayStart+i;
    if (fn>0&&fn<=24) svg += `<text x="${sx-6}" y="${sy+i*fs+3}" font-family="monospace" font-size="8" fill="#8a8078" text-anchor="end">${fn}</text>`;
  }

  for (const note of position.notes) {
    const cx=sx+note.string*ss;
    const cy=sy+(note.fret-position.displayStart)*fs;
    const col = noteColor(note.func);
    const noteName = indexToNote(note.sem, note.useFlat);
    
    svg += `<circle cx="${cx}" cy="${cy}" r="9" fill="${col}"/>`;
    svg += `<text x="${cx}" y="${cy-2}" font-family="monospace" font-size="7" font-weight="600" fill="#fff" text-anchor="middle">${note.func}</text>`;
    svg += `<text x="${cx}" y="${cy+6}" font-family="monospace" font-size="6" fill="#fff" text-anchor="middle">${noteName}</text>`;
  }

  const iy=sy+th+12;
  for (let s=0; s<6; s++) {
    const cx=sx+s*ss;
    const pn=position.notes.find(n=>n.string===s);
    if (pn) {
      svg += `<circle cx="${cx}" cy="${iy-2}" r="3" fill="${noteColor(pn.func)}"/>`;
    } else {
      svg += `<text x="${cx}" y="${iy}" font-family="monospace" font-size="9" fill="#3a322a" text-anchor="middle">×</text>`;
    }
  }
  svg += '</svg>';
  return svg;
}

// ─── Leitura e Parse dos Acordes do Cifra Club ────────────────────────────────
function parseCifraChord(name) {
  let text = name.trim()
    .replace(/°/g,'dim').replace(/º/g,'dim')
    .replace(/Ø/g,'m7b5').replace(/ø/g,'m7b5');

  const m = text.match(/^([A-G][#b]?)(.*?)(?:\/[A-G][#b]?)?$/);
  if (!m) return null;
  
  let root = m[1]; const tail = m[2];
  if (FLAT_TO_SHARP[root]) root = FLAT_TO_SHARP[root];
  const ri = noteToIndex(root);
  if (ri===-1) return null;

  let quality = '';
  if (/dim/.test(tail)) { quality='dim'; }
  else if (/^m/.test(tail)&&!/maj/i.test(tail)) { quality='m'; }

  let ext = 'triad';
  if (/maj7|M7|7M/.test(tail)) ext = 'maj7';
  else if (/m7b5/.test(tail)) ext = 'm7b5';
  else if (/dim7/.test(tail)) ext = 'dim7';
  else if (/m7/.test(tail)) ext = 'm7';
  else if (/7/.test(tail)) ext = '7';
  else if (/sus2/.test(tail)) ext = 'sus2';
  else if (/sus4/.test(tail)) ext = 'sus4';

  return { root: ri, quality, ext, fullName: name, originalName: name };
}

function scanPageChords() {
  const chordsFound = new Set();
  const list = [];
  
  // O Cifra Club engloba acordes em tags <b> ou em links com data-chord
  const selectors = ['pre b', 'span.cifra-chord-link', '.cifra_container b'];
  
  selectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      const chordText = el.textContent.trim();
      if (chordText && chordText.length <= 10 && /^[A-G]/.test(chordText)) {
        chordsFound.add(chordText);
      }
    });
  });

  chordsFound.forEach(c => {
    const parsed = parseCifraChord(c);
    if (parsed) list.push(parsed);
  });

  extState.detectedChords = list;
  return list;
}

// ─── UI: Criação da Sidebar no Cifra Club ──────────────────────────────────────
function createExtensionSidebar() {
  // Evita duplicatas
  if (document.getElementById('ot-triads-sidebar')) return;

  const sidebar = document.createElement('div');
  sidebar.id = 'ot-triads-sidebar';
  sidebar.className = 'ot-sidebar';

  const header = `
    <div class="ot-sidebar-header">
      <h3>🎸 Tríades nos Acordes</h3>
      <span class="ot-close-btn" id="ot-close-sidebar">✕</span>
    </div>
  `;

  const chordSelectorSection = `
    <div class="ot-section">
      <label>Acordes da Cifra (Clique para ver tríades)</label>
      <div class="ot-chord-chips" id="ot-chords-list"></div>
    </div>
  `;

  const configSection = `
    <div class="ot-section ot-config-grid">
      <div>
        <label>Extensão</label>
        <select id="ot-select-ext">
          <option value="triad">Tríade</option>
          <option value="maj7">Maj7</option>
          <option value="7">7 (Dominante)</option>
          <option value="m7">m7</option>
          <option value="m7b5">m7(b5)</option>
          <option value="dim7">dim7</option>
          <option value="sus2">Sus2</option>
          <option value="sus4">Sus4</option>
        </select>
      </div>
      <div>
        <label>Voicing</label>
        <select id="ot-select-voicing" disabled>
          <option value="R35">R-3-5</option>
          <option value="R37">R-3-7</option>
          <option value="R57">R-5-7</option>
          <option value="357">3-5-7</option>
        </select>
      </div>
      <div>
        <label>Conj. Cordas</label>
        <select id="ot-select-strings">
          <option value="1,2,3">1 - 2 - 3</option>
          <option value="2,3,4">2 - 3 - 4</option>
          <option value="3,4,5">3 - 4 - 5</option>
          <option value="4,5,6">4 - 5 - 6</option>
        </select>
      </div>
      <div>
        <label>Braço da Guitarra</label>
        <select id="ot-select-region">
          <option value="0,24">Todas as Casas</option>
          <option value="1,5">Casas 1 a 5</option>
          <option value="5,9">Casas 5 a 9</option>
          <option value="8,12">Casas 8 a 12</option>
          <option value="12,17">Casas 12 a 17</option>
        </select>
      </div>
    </div>
  `;

  const resultsSection = `
    <div class="ot-section" style="flex:1; display:flex; flex-direction:column; overflow:hidden;">
      <label id="ot-results-label">Shapes de Tríades</label>
      <div class="ot-results-grid" id="ot-shapes-container">
        <div style="color:var(--ot-text-muted); text-align:center; padding:20px; font-size:0.9rem;">
          Selecione um acorde acima para ver as tríades correspondentes.
        </div>
      </div>
    </div>
  `;

  sidebar.innerHTML = header + chordSelectorSection + configSection + resultsSection;
  document.body.appendChild(sidebar);

  // Event Listeners dos Controles
  document.getElementById('ot-close-sidebar').addEventListener('click', () => {
    sidebar.classList.add('ot-hidden');
  });

  document.getElementById('ot-select-ext').addEventListener('change', (e) => {
    extState.extension = e.target.value;
    const showVoicing = extState.extension !== 'triad';
    document.getElementById('ot-select-voicing').disabled = !showVoicing;
    renderSidebarTriads();
  });

  document.getElementById('ot-select-voicing').addEventListener('change', (e) => {
    extState.voicing = e.target.value;
    renderSidebarTriads();
  });

  document.getElementById('ot-select-strings').addEventListener('change', (e) => {
    const nums = e.target.value.split(',').map(Number);
    extState.stringGroup = [6-nums[0], 6-nums[1], 6-nums[2]];
    renderSidebarTriads();
  });

  document.getElementById('ot-select-region').addEventListener('change', (e) => {
    const [start, end] = e.target.value.split(',').map(Number);
    extState.activeRegions = [{ start, end }];
    renderSidebarTriads();
  });

  renderChordsList();
}

function renderChordsList() {
  const container = document.getElementById('ot-chords-list');
  if (!container) return;

  if (extState.detectedChords.length === 0) {
    container.innerHTML = `<span style="font-size:0.8rem;color:var(--ot-text-muted);">Nenhum acorde detectado nesta página.</span>`;
    return;
  }

  container.innerHTML = extState.detectedChords.map((chord, idx) => {
    return `<button class="ot-chord-chip" data-idx="${idx}">${chord.fullName}</button>`;
  }).join('');

  container.querySelectorAll('.ot-chord-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.ot-chord-chip').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      
      const chord = extState.detectedChords[+btn.dataset.idx];
      extState.selectedChord = chord;
      
      // Auto-configura a extensão do acorde clicado se disponível
      if (chord.ext && chord.ext !== extState.extension) {
        extState.extension = chord.ext;
        const extSelect = document.getElementById('ot-select-ext');
        if (extSelect) {
          extSelect.value = chord.ext;
          document.getElementById('ot-select-voicing').disabled = (chord.ext === 'triad');
        }
      }
      
      renderSidebarTriads();
    });
  });

  // Autoseleciona o primeiro acorde
  const firstChip = container.querySelector('.ot-chord-chip');
  if (firstChip) firstChip.click();
}

function renderSidebarTriads() {
  const container = document.getElementById('ot-shapes-container');
  const label = document.getElementById('ot-results-label');
  if (!container || !extState.selectedChord) return;

  const positions = findVoicingPositions(extState.selectedChord);
  extState.currentPositions = positions;

  label.innerHTML = `Shapes para <b>${extState.selectedChord.fullName}</b> (${positions.length})`;

  if (positions.length === 0) {
    container.innerHTML = `
      <div style="color:var(--ot-text-muted); text-align:center; padding:20px; font-size:0.9rem;">
        Nenhum shape de tríade encontrado. Tente mudar o conjunto de cordas ou região do braço.
      </div>
    `;
    return;
  }

  container.innerHTML = positions.map((pos, idx) => {
    const strNames = pos.strings.map(s => STRING_LABELS[s]).join('-');
    const subtitle = `${pos.inversionName} · ${strNames}`;
    
    return `
      <div class="ot-voicing-card" data-idx="${idx}">
        <div class="ot-card-header">
          <div>
            <div class="ot-card-title">${extState.selectedChord.fullName}</div>
            <div class="ot-card-subtitle">${subtitle}</div>
          </div>
          <button class="ot-listen-btn">🔊 Ouvir</button>
        </div>
        <div class="ot-fretboard">${renderFretboardSVG(pos)}</div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.ot-voicing-card').forEach(card => {
    // Escuta clique no botão Ouvir
    const btn = card.querySelector('.ot-listen-btn');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pos = extState.currentPositions[+card.dataset.idx];
      if (pos) playChordVoicing(pos.notes);
    });

    // Escuta clique geral no card para ouvir
    card.addEventListener('click', () => {
      const pos = extState.currentPositions[+card.dataset.idx];
      if (pos) playChordVoicing(pos.notes);
    });
  });
}

// ─── Hover Tooltips Interativos diretamente nas Cifras ─────────────────────────
function initHoverTooltips() {
  const targets = document.querySelectorAll('pre b, span.cifra-chord-link, .cifra_container b');
  
  targets.forEach(target => {
    const text = target.textContent.trim();
    if (text && text.length <= 10 && /^[A-G]/.test(text)) {
      target.style.cursor = 'pointer';
      target.style.position = 'relative';
      target.classList.add('ot-highlighted-chord');
      
      // Ao clicar na cifra original do site, mostra/foca a sidebar da extensão
      target.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Abre sidebar se escondida
        const sidebar = document.getElementById('ot-triads-sidebar');
        if (sidebar) {
          sidebar.classList.remove('ot-hidden');
        }

        // Foca o acorde correspondente na lista
        const chips = document.querySelectorAll('.ot-chord-chip');
        for (const chip of chips) {
          if (chip.textContent.trim() === text) {
            chip.click();
            chip.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            break;
          }
        }
      });
    }
  });
}

// ─── Inicialização e Escuta de Configurações ──────────────────────────────────────
function initializeExtension() {
  // Carrega configurações iniciais
  chrome.storage?.local?.get(['showSidebar', 'playSound'], (result) => {
    if (result.showSidebar !== undefined) extConfig.showSidebar = result.showSidebar;
    if (result.playSound !== undefined) extConfig.playSound = result.playSound;

    applyLayout();
  });

  // Escuta mensagens do popup
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'updateConfig') {
      extConfig = { ...extConfig, ...message.config };
      applyLayout();
    }
  });

  scanPageChords();
  createExtensionSidebar();
  initHoverTooltips();
}

function applyLayout() {
  const sidebar = document.getElementById('ot-triads-sidebar');
  if (sidebar) {
    if (extConfig.showSidebar) {
      sidebar.classList.remove('ot-hidden');
    } else {
      sidebar.classList.add('ot-hidden');
    }
  }
}

// Inicializa quando a página estiver carregada
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initializeExtension();
} else {
  document.addEventListener('DOMContentLoaded', initializeExtension);
}
