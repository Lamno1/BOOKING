import * as THREE from './three.module.min.js';

const qs = s => document.querySelector(s);
const qsa = s => [...document.querySelectorAll(s)];

// ═══════════════════════════ STATE & BOOKING LOGIC ═══════════════════════════
let selected = qs('.room-card.selected') || qs('.room-card');
let base = selected ? +selected.dataset.price : 2490000;

const money = n => '\u20ab' + Math.round(n).toLocaleString('vi-VN');

const nights = () => {
  const checkinInput = qs('#checkin');
  const checkoutInput = qs('#checkout');
  if (!checkinInput || !checkoutInput) return 1;
  const a = new Date(checkinInput.value);
  const b = new Date(checkoutInput.value);
  const diff = Math.ceil((b - a) / (1000 * 60 * 60 * 24));
  return Math.max(1, isNaN(diff) ? 1 : diff);
};

function update() {
  if (!selected) return;
  const n = nights();
  const checkinInput = qs('#checkin');
  const checkoutInput = qs('#checkout');
  const guestsInput = qs('#guests');

  const a = checkinInput ? new Date(checkinInput.value) : new Date();
  const b = checkoutInput ? new Date(checkoutInput.value) : new Date();
  const guestsVal = guestsInput ? guestsInput.value : '2';

  const addons = qsa('[data-addon]:checked').reduce((sum, el) => sum + (+el.dataset.addon || 0), 0);
  const roomTotal = base * n;
  const grandTotal = roomTotal + addons;

  const roomNameEl = qs('#summary-room');
  const roomImgEl = qs('#summary-img');
  const roomDatesEl = qs('#summary-dates');
  const nightsEl = qs('#nights');
  const roomTotalEl = qs('#room-total');
  const addonTotalEl = qs('#addon-total');
  const totalEl = qs('#total');

  if (roomNameEl) roomNameEl.textContent = selected.dataset.name || 'Ocean View Apartment';
  if (roomImgEl && selected.dataset.img) roomImgEl.src = selected.dataset.img;
  if (roomDatesEl) {
    const startStr = a.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const endStr = b.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    roomDatesEl.textContent = `${startStr} – ${endStr} · ${guestsVal} adults`;
  }
  if (nightsEl) nightsEl.textContent = `${n} night${n > 1 ? 's' : ''}`;
  if (roomTotalEl) roomTotalEl.textContent = money(roomTotal);
  if (addonTotalEl) addonTotalEl.textContent = money(addons);
  if (totalEl) totalEl.textContent = money(grandTotal);
}

// ═══════════════════════════ BOOKING DRAWER CONTROLS ═══════════════════════════
const drawer = qs('#summary') || qs('.booking-drawer');
const backdrop = qs('#drawer-backdrop');

function openDrawer() {
  if (drawer) {
    drawer.classList.add('open');
    drawer.classList.remove('hidden');
  }
  if (backdrop) {
    backdrop.classList.add('open');
  }
}

function closeDrawer() {
  if (drawer) {
    drawer.classList.remove('open');
  }
  if (backdrop) {
    backdrop.classList.remove('open');
  }
}

// Open drawer when clicking any room card, choose room, or view details
qsa('.room-card').forEach(card => {
  card.addEventListener('click', (e) => {
    if (e.target.closest('.view-details-link')) {
      e.preventDefault();
    }
    qsa('.room-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selected = card;
    base = +card.dataset.price || 2490000;
    update();
    openDrawer();
  });
});

// Close drawer controls
qs('#close-summary')?.addEventListener('click', closeDrawer);
backdrop?.addEventListener('click', closeDrawer);
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeDrawer();
    close360Modal();
  }
});

// Input change listeners
qsa('input, select').forEach(el => el.addEventListener('change', update));

// Confirm reservation toast
qs('#confirm')?.addEventListener('click', () => {
  const toast = qs('#toast');
  if (toast) {
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
  }
  closeDrawer();
});

// Room Carousel Navigation Arrows
const carousel = qs('#room-carousel');
qs('#room-prev')?.addEventListener('click', () => {
  carousel?.scrollBy({ left: -360, behavior: 'smooth' });
});
qs('#room-next')?.addEventListener('click', () => {
  carousel?.scrollBy({ left: 360, behavior: 'smooth' });
});

// Open Maps Button (Beachfront Route)
qs('#btn-open-maps')?.addEventListener('click', () => {
  window.open('https://maps.google.com/?q=The+Song+Vung+Tau+Yuki+Boutique+Apartment+Bai+Sau', '_blank');
});

// Cinematic Bridge Scroll link
qs('#bridge-scroll-link')?.addEventListener('click', (e) => {
  e.preventDefault();
  qs('#rooms')?.scrollIntoView({ behavior: 'smooth' });
});

// ═══════════════════════════ HERO THREE.JS & SCENE FOCUS ═══════════════════════════
let heroRenderer, heroScene, heroCamera, heroRoot, heroHemiLight, heroDustGroup, heroDustMat;
let targetCamera = { x: 0, y: 0, z: 5, lookX: 0, lookY: 0 };
let currentCamera = { x: 0, y: 0, z: 5, lookX: 0, lookY: 0 };
let activeFocusSpot = null;
let timeName = 'day';

const spotFoci = {
  living: {
    cam: { x: -0.65, y: -0.15, z: 4.3, lookX: -0.4, lookY: -0.1 },
    photoClass: 'focus-living',
    tag: 'FOCUSED ZONE',
    title: 'Living Lounge & Ocean Terrace',
    desc: 'Bespoke Scandinavian furnishings oriented toward panoramic ocean horizons with soft sea breezes.'
  },
  ocean: {
    cam: { x: 0.25, y: 0.35, z: 3.8, lookX: 0.15, lookY: 0.2 },
    photoClass: 'focus-ocean',
    tag: 'FOCUSED HORIZON',
    title: 'Panoramic Ocean Horizon',
    desc: 'Unobstructed 180° views overlooking the East Sea and the expansive coastline of Bãi Sau.'
  },
  balcony: {
    cam: { x: -0.05, y: 0.1, z: 3.9, lookX: -0.02, lookY: 0.05 },
    photoClass: 'focus-balcony',
    tag: 'FOCUSED VISTA',
    title: 'Private Coastal Balcony',
    desc: 'Seamless indoor-outdoor living with glass balustrades framing morning sunrises and evening twilight.'
  },
  bathroom: {
    cam: { x: 0.85, y: -0.1, z: 4.2, lookX: 0.5, lookY: -0.08 },
    photoClass: 'focus-bathroom',
    tag: 'FOCUSED AMENITY',
    title: 'Luxury Rain Ensuite',
    desc: 'Designer stone finishes, walk-in rain shower, premium organic botanical toiletries and plush linens.'
  }
};

function initHero() {
  const canvas = qs('#hero-canvas');
  if (!canvas) return;

  let gl;
  try {
    gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  } catch (err) {}
  if (!gl) return;

  heroRenderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  heroRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

  heroScene = new THREE.Scene();
  heroCamera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
  heroCamera.position.set(0, 0, 5);

  heroRoot = new THREE.Group();
  heroScene.add(heroRoot);

  // Soft ambient lighting for atmosphere
  heroHemiLight = new THREE.HemisphereLight(0xfff8ee, 0x386b8c, 1.3);
  heroScene.add(heroHemiLight);

  // Floating ambient sunlight dust motes
  heroDustGroup = new THREE.Group();
  heroDustMat = new THREE.MeshBasicMaterial({
    color: 0xf5db99,
    transparent: true,
    opacity: 0.65
  });

  const particleCount = 48;
  for (let i = 0; i < particleCount; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 6), heroDustMat);
    p.position.set(
      (Math.random() - 0.5) * 8.5,
      (Math.random() - 0.5) * 4.2,
      (Math.random() - 0.5) * 4.2
    );
    p.userData.phase = Math.random() * Math.PI * 2;
    p.userData.speed = 0.0006 + Math.random() * 0.0008;
    heroDustGroup.add(p);
  }
  heroRoot.add(heroDustGroup);

  let mouseX = 0, mouseY = 0, currentMouseX = 0, currentMouseY = 0;
  let isHidden = false;

  window.addEventListener('pointermove', (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5);
    mouseY = (e.clientY / window.innerHeight - 0.5);
  });

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      heroRenderer.setSize(rect.width, rect.height, false);
      heroCamera.aspect = rect.width / rect.height;
      heroCamera.updateProjectionMatrix();
    }
  };

  window.addEventListener('resize', resize);
  if (typeof IntersectionObserver !== 'undefined') {
    new IntersectionObserver(entries => {
      isHidden = !entries[0].isIntersecting;
    }).observe(canvas);
  }

  function loop(time) {
    requestAnimationFrame(loop);
    if (isHidden || document.hidden) return;

    currentMouseX += (mouseX * 0.35 - currentMouseX) * 0.04;
    currentMouseY += (mouseY * 0.2 - currentMouseY) * 0.04;

    // Smooth camera tweening towards target focal position
    currentCamera.x += (targetCamera.x + currentMouseX * 0.3 - currentCamera.x) * 0.05;
    currentCamera.y += (targetCamera.y - currentMouseY * 0.2 - currentCamera.y) * 0.05;
    currentCamera.z += (targetCamera.z - currentCamera.z) * 0.05;

    currentCamera.lookX += (targetCamera.lookX - currentCamera.lookX) * 0.05;
    currentCamera.lookY += (targetCamera.lookY - currentCamera.lookY) * 0.05;

    heroCamera.position.set(currentCamera.x, currentCamera.y, currentCamera.z);
    heroCamera.lookAt(currentCamera.lookX, currentCamera.lookY, 0);

    heroDustGroup.children.forEach(p => {
      p.position.y += Math.sin(time * 0.001 + p.userData.phase) * p.userData.speed;
      p.position.x += Math.cos(time * 0.0008 + p.userData.phase) * (p.userData.speed * 0.5);
    });

    heroRenderer.render(heroScene, heroCamera);
  }

  resize();
  loop(0);
}

initHero();

// ═══════════════════════════ HOTSPOTS SCENE FOCUS & PARALLAX ═══════════════════════════
const heroPhoto = qs('#hero-photo');
const focusCard = qs('#hero-focus-card');
const focusTag = qs('#focus-card-tag');
const focusTitle = qs('#focus-card-title');
const focusDesc = qs('#focus-card-desc');

function triggerSceneFocus(spotName) {
  const conf = spotFoci[spotName];
  if (!conf) return;

  activeFocusSpot = spotName;

  // Tween Three.js camera towards spot coordinates
  targetCamera = { ...conf.cam };

  // Update photo parallax focus class
  if (heroPhoto) {
    heroPhoto.className = 'hero-photo ' + conf.photoClass;
  }

  // Update hotspots active & dimmed classes
  qsa('.hotspot').forEach(spot => {
    const isThis = spot.dataset.spot === spotName;
    spot.classList.toggle('focused', isThis);
    spot.classList.toggle('dimmed', !isThis);
  });

  // Display floating focus card
  if (focusCard && focusTitle && focusDesc) {
    focusCard.hidden = false;
    if (focusTag) focusTag.textContent = conf.tag;
    focusTitle.textContent = conf.title;
    focusDesc.textContent = conf.desc;

    // Position focus card relative to the active hotspot
    const activeHotspotEl = qs(`.hotspot[data-spot="${spotName}"]`);
    if (activeHotspotEl) {
      const topPct = parseFloat(activeHotspotEl.style.top) || 40;
      const leftPct = parseFloat(activeHotspotEl.style.left) || 40;
      focusCard.style.top = Math.min(topPct + 7, 65) + '%';
      focusCard.style.left = Math.max(Math.min(leftPct - 4, 60), 22) + '%';
    }
  }
}

function resetSceneFocus() {
  activeFocusSpot = null;
  targetCamera = { x: 0, y: 0, z: 5, lookX: 0, lookY: 0 };

  if (heroPhoto) {
    heroPhoto.className = 'hero-photo';
  }

  qsa('.hotspot').forEach(spot => {
    spot.classList.remove('focused', 'dimmed');
  });

  if (focusCard) {
    focusCard.hidden = true;
  }
}

// Hotspots click triggers in-scene focus & parallax
qsa('.hotspot').forEach(spot => {
  spot.addEventListener('click', (e) => {
    e.stopPropagation();
    const spotType = spot.dataset.spot;
    if (activeFocusSpot === spotType) {
      resetSceneFocus();
    } else {
      triggerSceneFocus(spotType);
    }
  });
});

// Focus card actions
qs('#focus-card-close')?.addEventListener('click', resetSceneFocus);
qs('#btn-focus-reset')?.addEventListener('click', resetSceneFocus);
qs('#btn-focus-360')?.addEventListener('click', () => {
  const sceneMap = {
    living: 'living_room',
    ocean: 'balcony',
    balcony: 'balcony',
    bathroom: 'bathroom'
  };
  openImmersiveModal('360', sceneMap[activeFocusSpot] || 'living_room');
});

// Click on hero background clears focus
qs('#property-experience')?.addEventListener('click', (e) => {
  if (!e.target.closest('.hotspot') && !e.target.closest('#hero-focus-card') && !e.target.closest('.hero-top-bar') && !e.target.closest('.hero-bottom') && !e.target.closest('.hero-right')) {
    if (activeFocusSpot) resetSceneFocus();
  }
});

// ═══════════════════════════ DAY / SUNSET / NIGHT AMBIENCE ═══════════════════════════
const ambiencePresets = {
  day: {
    hemiSky: 0xfffbf2,
    hemiGround: 0x386b8c,
    hemiIntensity: 1.3,
    dustColor: 0xf5db99,
    photoFilter: 'brightness(1.02) saturate(1.06) contrast(1.02)',
    sphereColor: 0x48768e
  },
  sunset: {
    hemiSky: 0xff6a35,
    hemiGround: 0x321438,
    hemiIntensity: 1.6,
    dustColor: 0xff8a42,
    photoFilter: 'brightness(0.95) saturate(1.48) sepia(0.3) hue-rotate(-14deg) contrast(1.06)',
    sphereColor: 0xc86a4b
  },
  night: {
    hemiSky: 0x182c44,
    hemiGround: 0xff9933,
    hemiIntensity: 0.95,
    dustColor: 0x88c4ff,
    photoFilter: 'brightness(0.58) saturate(0.92) hue-rotate(185deg) contrast(1.22)',
    sphereColor: 0x0f2138
  }
};

function applyAmbience(timeKey) {
  timeName = timeKey || 'day';
  const preset = ambiencePresets[timeName] || ambiencePresets.day;

  // Set attribute on experience section for CSS overlays
  const expSection = qs('#property-experience');
  if (expSection) {
    expSection.dataset.ambience = timeName;
  }

  // Update button active states
  qsa('[data-time]').forEach(b => {
    const isActive = b.dataset.time === timeName;
    b.classList.toggle('active', isActive);
    b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });

  // Update hero photo filter
  if (heroPhoto) {
    heroPhoto.style.filter = preset.photoFilter;
  }

  // Update Three.js hemisphere light and particles in hero
  if (heroHemiLight) {
    heroHemiLight.color.set(preset.hemiSky);
    heroHemiLight.groundColor.set(preset.hemiGround);
    heroHemiLight.intensity = preset.hemiIntensity;
  }
  if (heroDustMat) {
    heroDustMat.color.set(preset.dustColor);
  }

  // Update 360 viewer sphere color if modal is open
  if (expSphere) {
    expSphere.material.color.set(preset.sphereColor);
  }
}

qsa('[data-time]').forEach(btn => {
  btn.addEventListener('click', () => {
    applyAmbience(btn.dataset.time);
  });
});

// ═══════════════════════════ DISTINCT IMMERSIVE MODES (MODAL) ═══════════════════════════
const modal = qs('#experience-modal');
const stage = qs('#experience-stage');
const expCanvas = qs('#experience-canvas');
const modeTag = qs('#mode-indicator-tag');
const expKicker = qs('#experience-kicker');
const expTitle = qs('#experience-title');
const sceneNav = qs('#scene-nav');
const walkNavBar = qs('#walk-nav-bar');
const modalGallery = qs('#modal-gallery-container');
const modalVideo = qs('#modal-video-container');

let activeMode = '360';
let sceneName = 'living_room';
let yaw = 0;
let fov = 72;
let isDragging = false;
let lastPointerX = 0;
let lastPointerY = 0;
let walkIndex = 0;
let autoWalkTimer = null;
let isVideoPlaying = false;
let videoProgress = 16;
let videoTimer = null;

const walkSteps = [
  { scene: 'living_room', title: 'Step 1: Living Lounge & Coastal Foyer', desc: 'Welcome into the light-filled suite overlooking Vũng Tàu harbor.' },
  { scene: 'balcony', title: 'Step 2: Private Ocean Balcony', desc: 'Step out onto the terrace with panoramic Bãi Sau shoreline horizons.' },
  { scene: 'bedroom', title: 'Step 3: Master Sanctuary Bedroom', desc: 'King plush bed positioned for morning sunlight and calming waves.' },
  { scene: 'bedroom2', title: 'Step 4: Second Bedroom Retreat', desc: 'Quiet second bedroom for flexible guest stays.' },
  { scene: 'bathroom', title: 'Step 4: Luxury Rain Ensuite', desc: 'Spa-grade rain shower with organic bath amenities and stone tiles.' },
  { scene: 'kitchen', title: 'Step 5: Coastal Chef Kitchen', desc: 'Induction cooking, stone island and curated local coffee ritual.' },
  { scene: 'dining', title: 'Step 6: Sunset Dining Nook', desc: 'A warm dining setting framed by the ocean horizon.' },
  { scene: 'entry', title: 'Step 7: Entry & Exit Foyer', desc: 'Return to the foyer, or exit the immersive tour.' }
];

const labels = {
  living_room: 'Living Lounge · Yuki Boutique Apartment',
  balcony: 'Ocean Balcony · Panoramic Vista over Bãi Sau',
  bedroom: 'Master Bedroom · Luxury King Bed & Sea View',
  bedroom2: 'Second Bedroom - Flexible Guest Retreat',
  bathroom: 'Rain Ensuite · Spa Shower & Botanical Amenities'
};

const galleryPhotos = [
  { cat: 'living', title: 'Living Lounge & Ocean View', src: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=600&q=80' },
  { cat: 'living', title: 'Coastal Balcony Horizon', src: 'hotel-balcony-ocean.jpg' },
  { cat: 'bedroom', title: 'Master Bedroom Sanctuary', src: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=600&q=80' },
  { cat: 'bedroom', title: 'Rain Ensuite & Stone Vanity', src: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80' },
  { cat: 'amenities', title: 'Rooftop Infinity Pool Over Sea', src: 'resort-pool-ocean.jpg' },
  { cat: 'amenities', title: 'Bãi Sau Beachfront Coastline', src: 'beach-ocean-coast.jpg' }
];

let expRenderer, expScene, expCamera, expSphere;
let immersiveWorld;
const sharedMaterials={wood:new THREE.MeshStandardMaterial({color:0xb8875d,roughness:.72}),wall:new THREE.MeshStandardMaterial({color:0xe8dfd2,roughness:.9}),dark:new THREE.MeshStandardMaterial({color:0x26343b,roughness:.5}),brass:new THREE.MeshStandardMaterial({color:0xb8894b,metalness:.65,roughness:.3}),tile:new THREE.MeshStandardMaterial({color:0x9eb8b8,roughness:.6}),fabric:new THREE.MeshStandardMaterial({color:0xc98f78,roughness:.95}),glass:new THREE.MeshPhysicalMaterial({color:0x8fc6d6,transparent:true,opacity:.28,roughness:.08,transmission:.15})};
const roomGraph={living_room:{title:'Living Lounge · Yuki Boutique Apartment',camera:[0,0,6],next:['kitchen','balcony']},kitchen:{title:'Coastal Chef Kitchen',camera:[.4,0,5.8],next:['living_room','dining']},dining:{title:'Sunset Dining Nook',camera:[0,0,5.4],next:['kitchen','balcony']},balcony:{title:'Ocean Balcony · Panoramic Vista',camera:[0,.1,5.5],next:['living_room','entry']},bedroom:{title:'Master Bedroom · Luxury King Bed',camera:[0,0,5.6],next:['bathroom','entry']},bathroom:{title:'Rain Ensuite · Spa Shower',camera:[0,0,4.8],next:['bedroom','entry']},entry:{title:'Entry & Hallway Foyer',camera:[0,0,6.2],next:['living_room','kitchen','bedroom2']},bedroom2:{title:'Secondary Bedroom · Twin Coastal Retreat',camera:[0,0,5.2],next:['entry']}};
const roomScenes={}; let activeRoomGroup;
const rb=(g,n,sz,pos,mat)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(...sz),mat);m.name=n;m.position.set(...pos);g.add(m)};
function buildRoomScenes(){const base=(id,mat=sharedMaterials.wall)=>{const g=new THREE.Group();g.name='room-'+id;rb(g,'floor',[10,.18,10],[0,-2.5,0],sharedMaterials.wood);rb(g,'back-wall',[10,6,.2],[0,.5,-5],sharedMaterials.wall);rb(g,'accent',[.2,4,5],[-5,0,0],mat);return g};let g;
g=base('living_room');rb(g,'sofa',[3.8,1.2,1.4],[-1,-1.4,-1.8],sharedMaterials.dark);rb(g,'coffee-table',[1.5,.25,.9],[1,-1.8,-1],sharedMaterials.wood);roomScenes.living_room=g;
g=base('kitchen',sharedMaterials.tile);rb(g,'counter',[4,.9,.8],[1,-1.6,-3.8],sharedMaterials.wall);rb(g,'island',[2.4,.8,1],[0,-1.8,-1.8],sharedMaterials.wood);rb(g,'fridge',[.9,2,.8],[3,-1.4,-3.8],sharedMaterials.dark);roomScenes.kitchen=g;
g=base('dining');rb(g,'table',[2.8,.2,1.2],[0,-1.5,-1.5],sharedMaterials.wood);[-1.1,1.1].forEach(x=>rb(g,'chair',[.45,1,.45],[x,-2,-1.5],sharedMaterials.fabric));roomScenes.dining=g;
g=base('balcony',sharedMaterials.glass);rb(g,'bench',[3,.55,.7],[-1,-1.9,-1],sharedMaterials.wood);rb(g,'railing',[8,1,.12],[0,-1.3,-4.2],sharedMaterials.glass);roomScenes.balcony=g;
g=base('bedroom');rb(g,'bed',[3.4,.65,2.4],[0,-1.6,-1.5],sharedMaterials.fabric);rb(g,'headboard',[3.4,2,.2],[0,-.7,-2.7],sharedMaterials.wood);roomScenes.bedroom=g; g=base('bedroom2');rb(g,'twin-bed-left',[1.35,.55,2.2],[-1.55,-1.65,-1.4],sharedMaterials.fabric);rb(g,'twin-bed-right',[1.35,.55,2.2],[1.55,-1.65,-1.4],sharedMaterials.fabric);rb(g,'shared-nightstand',[.55,.7,.55],[0,-1.55,-1.4],sharedMaterials.wood);rb(g,'study-desk',[2.1,.75,.65],[0,-1.7,-3.65],sharedMaterials.dark);rb(g,'wardrobe',[1.5,2.2,.7],[-3.8,-1.35,-3.8],sharedMaterials.wood);roomScenes.bedroom2=g;
g=base('bathroom',sharedMaterials.tile);rb(g,'vanity',[2.6,.8,.6],[-1,-1.7,-3.8],sharedMaterials.wood);rb(g,'shower',[2.2,2.3,1.8],[1,-1.2,-2],sharedMaterials.glass);roomScenes.bathroom=g;
g=base('entry');rb(g,'console',[2.4,.8,.5],[-1,-1.7,-3.8],sharedMaterials.wood);rb(g,'bench',[2,.6,.6],[1,-1.8,-1],sharedMaterials.dark);roomScenes.entry=g;
immersiveWorld=new THREE.Group();immersiveWorld.name='seven-room-world';Object.values(roomScenes).forEach(r=>{r.visible=false;immersiveWorld.add(r)});expScene.add(immersiveWorld);activeRoomGroup=roomScenes.living_room;activeRoomGroup.visible=true}


if (expCanvas && stage) {
  try {
    expRenderer = new THREE.WebGLRenderer({ canvas: expCanvas, antialias: true });
    expScene = new THREE.Scene();
    expScene.background = new THREE.Color(0x9bb9bf);
    expScene.add(new THREE.HemisphereLight(0xf4eadc, 0x40515a, 1.8));
    const keyLight = new THREE.DirectionalLight(0xffe3bf, 1.4);
    keyLight.position.set(3, 6, 4);
    expScene.add(keyLight);
    expCamera = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);
    expCamera.position.set(0, 0, 6); expCamera.lookAt(0, -1.2, -1.5);
    expSphere = new THREE.Mesh(new THREE.SphereGeometry(15, 48, 32), new THREE.MeshBasicMaterial({ color: ambiencePresets.day.sphereColor, side: THREE.BackSide, transparent: true, opacity: 0.04 }));
    expScene.add(expSphere);
    buildRoomScenes();
  } catch (e) {
    console.warn('WebGL init in modal deferred:', e);
  }

  function resizeModal() {
    if (!stage || !expRenderer || !expCamera) return;
    const b = stage.getBoundingClientRect();
    if (b.width > 0 && b.height > 0) { expRenderer.setSize(b.width, b.height, false); expCamera.aspect = b.width / b.height; expCamera.updateProjectionMatrix(); }
  }
  function renderModal() {
    if (modal && !modal.hidden && expRenderer && expScene && expCamera) { requestAnimationFrame(renderModal); expRenderer.render(expScene, expCamera); }
  }
  function updateModalScene(name) { const nextScene=roomGraph[name]?name:'living_room'; sceneName=nextScene; const node=roomGraph[sceneName]; if(stage){stage.classList.add('scene-transition');setTimeout(()=>stage.classList.remove('scene-transition'),700);} if(activeRoomGroup)activeRoomGroup.visible=false; activeRoomGroup=roomScenes[sceneName]; if(activeRoomGroup)activeRoomGroup.visible=true; if(expCamera){expCamera.position.set(...node.camera); expCamera.lookAt(0, -1.2, -1.5);} if(expTitle)expTitle.textContent=node.title; qsa('.scene-nav button').forEach(btn=>btn.classList.toggle('active',btn.dataset.scene===sceneName)); }

  function switchImmersiveMode(mode, targetScene = 'living_room') {
    activeMode = mode;

    // Reset auto-walk if leaving walk mode
    if (autoWalkTimer && mode !== 'walk') {
      clearInterval(autoWalkTimer);
      autoWalkTimer = null;
      qs('#walk-auto')?.classList.remove('active');
    }

    // Update active tab buttons in bottom media bar
    qsa('.view-tab').forEach(b => b.classList.toggle('active', b.dataset.media === mode));

    if (mode === '360') {
      if (modeTag) modeTag.textContent = '360° Panorama';
      if (expKicker) expKicker.textContent = 'IMMERSIVE 360° VIEWER';
      if (sceneNav) sceneNav.hidden = false;
      if (walkNavBar) walkNavBar.hidden = true;
      if (stage) stage.hidden = false;
      if (modalGallery) modalGallery.hidden = true;
      if (modalVideo) modalVideo.hidden = true;
      qs('#stage-guidance').textContent = 'IMMERSIVE 360° VIEW · Drag to look around · Scroll to zoom';
      updateModalScene(targetScene);
      setTimeout(resizeModal, 20);
    } else if (mode === 'walk') {
      if (modeTag) modeTag.textContent = 'Virtual Walkthrough';
      if (expKicker) expKicker.textContent = 'GUIDED ARCHITECTURAL TOUR';
      if (sceneNav) sceneNav.hidden = false;
      if (walkNavBar) walkNavBar.hidden = false;
      if (stage) stage.hidden = false;
      if (modalGallery) modalGallery.hidden = true;
      if (modalVideo) modalVideo.hidden = true;
      qs('#stage-guidance').textContent = 'VIRTUAL WALKTHROUGH · Step through each living space';
      setTourStep(walkIndex);
      setTimeout(resizeModal, 20);
    } else if (mode === 'gallery') {
      if (modeTag) modeTag.textContent = 'Suite Gallery';
      if (expKicker) expKicker.textContent = 'CURATED PHOTOGRAPHY';
      if (expTitle) expTitle.textContent = 'The Song Ocean View · Architectural Photography';
      if (sceneNav) sceneNav.hidden = true;
      if (walkNavBar) walkNavBar.hidden = true;
      if (stage) stage.hidden = true;
      if (modalGallery) modalGallery.hidden = false;
      if (modalVideo) modalVideo.hidden = true;
      renderGallery('all');
    } else if (mode === 'video') {
      if (modeTag) modeTag.textContent = '4K Video Showcase';
      if (expKicker) expKicker.textContent = 'CINEMATIC SUITE TOUR';
      if (expTitle) expTitle.textContent = 'Yuki Suite · 4K Drone & Interior Experience';
      if (sceneNav) sceneNav.hidden = true;
      if (walkNavBar) walkNavBar.hidden = true;
      if (stage) stage.hidden = true;
      if (modalGallery) modalGallery.hidden = true;
      if (modalVideo) modalVideo.hidden = false;
    }
  }

  function setTourStep(idx) {
    walkIndex = Math.max(0, Math.min(idx, walkSteps.length - 1));
    const step = walkSteps[walkIndex];
    updateModalScene(step.scene);

    const stepInd = qs('#walk-step-indicator');
    const stepBar = qs('#walk-progress-bar');
    const prevBtn = qs('#walk-prev');
    const nextBtn = qs('#walk-next');

    if (stepInd) stepInd.textContent = `Step ${walkIndex + 1} of ${walkSteps.length}: ${step.title.split(':')[1] || step.title}`;
    if (stepBar) stepBar.style.width = ((walkIndex + 1) / walkSteps.length * 100) + '%';
    if (prevBtn) prevBtn.disabled = walkIndex === 0;
    if (nextBtn) nextBtn.disabled = walkIndex === walkSteps.length - 1;

    // Glide camera rotation to create cinematic walkthrough motion
    yaw = (walkIndex * 0.4);
    if (expCamera) expCamera.rotation.y = yaw;
  }

  // Walkthrough navigation controls
  qs('#walk-prev')?.addEventListener('click', () => setTourStep(walkIndex - 1));
  qs('#walk-next')?.addEventListener('click', () => setTourStep(walkIndex + 1));
  qs('#walk-auto')?.addEventListener('click', () => {
    const btn = qs('#walk-auto');
    if (autoWalkTimer) {
      clearInterval(autoWalkTimer);
      autoWalkTimer = null;
      btn?.classList.remove('active');
    } else {
      btn?.classList.add('active');
      autoWalkTimer = setInterval(() => {
        const nextIdx = (walkIndex + 1) % walkSteps.length;
        setTourStep(nextIdx);
      }, 3500);
    }
  });

  // Modal Gallery Rendering & Filter
  function renderGallery(filter = 'all') {
    const grid = qs('#modal-gallery-grid');
    if (!grid) return;
    const items = filter === 'all' ? galleryPhotos : galleryPhotos.filter(p => p.cat === filter);
    grid.innerHTML = items.map(p => `
      <div class="modal-gallery-item">
        <img src="${p.src}" alt="${p.title}" loading="lazy">
        <div class="modal-gallery-caption">${p.title}</div>
      </div>
    `).join('');

    qsa('.gallery-filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
  }

  qsa('.gallery-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => renderGallery(btn.dataset.filter));
  });

  // Video Player Controls Simulator
  function toggleVideoPlayback() {
    isVideoPlaying = !isVideoPlaying;
    const playIcon = qs('#video-play-icon');
    const playCenter = qs('#video-play-center');
    if (isVideoPlaying) {
      if (playIcon) playIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
      if (playCenter) playCenter.style.opacity = '0.4';
      videoTimer = setInterval(() => {
        videoProgress = (videoProgress + 1);
        if (videoProgress > 100) videoProgress = 0;
        const fill = qs('#video-timeline-fill');
        const curr = qs('#video-current-time');
        if (fill) fill.style.width = videoProgress + '%';
        if (curr) {
          const secs = Math.round(videoProgress * 0.9);
          const m = Math.floor(secs / 60);
          const s = secs % 60;
          curr.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
        }
      }, 1000);
    } else {
      if (playIcon) playIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
      if (playCenter) playCenter.style.opacity = '1';
      if (videoTimer) clearInterval(videoTimer);
    }
  }

  qs('#video-play-center')?.addEventListener('click', toggleVideoPlayback);
  qs('#btn-video-audio')?.addEventListener('click', () => {
    const btn = qs('#btn-video-audio');
    btn?.classList.toggle('active');
    const span = btn?.querySelector('span');
    if (span) {
      span.textContent = btn?.classList.contains('active') ? 'Waves Audio: ON ♫' : 'Ocean Waves Sound';
    }
  });

  // First-person drag free-look + smooth WASD movement with room/furniture/glass/railing bounds.
  const keys = new Set();
  let moveX = 0, moveZ = 0, velX = 0, velZ = 0, pitch = 0, targetPitch = 0, targetFov = fov;
  window.addEventListener('keydown', e => keys.add(e.key.toLowerCase()));
  window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  const blocked = (x, z) => (immersiveWorld?.userData.colliders || []).some(c => Math.abs(x - c.x) < c.w && Math.abs(z - c.z) < c.d);
  function moveFrame() {
    if (expCamera) {
      moveX = (keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0);
      moveZ = (keys.has('s') ? 1 : 0) - (keys.has('w') ? 1 : 0);
      const len = Math.hypot(moveX, moveZ) || 1; moveX /= len; moveZ /= len;
      velX += (moveX * 0.035 - velX) * 0.16; velZ += (moveZ * 0.035 - velZ) * 0.16;
      const nx = expCamera.position.x + velX, nz = expCamera.position.z + velZ;
      if (nx > -7.25 && nx < 7.25 && nz > -7.0 && nz < 1.5 && !blocked(nx, nz)) { expCamera.position.x = nx; expCamera.position.z = nz; }
      yaw += (targetYaw - yaw) * 0.18; pitch += (targetPitch - pitch) * 0.18;
      expCamera.rotation.set(pitch, yaw, 0, 'YXZ');
      fov += (targetFov - fov) * 0.15; expCamera.fov = fov; expCamera.updateProjectionMatrix();
    }
    requestAnimationFrame(moveFrame);
  }
  let targetYaw = yaw; moveFrame();
  stage.addEventListener('pointerdown', e => { isDragging = true; lastPointerX = e.clientX; lastPointerY = e.clientY; stage.setPointerCapture?.(e.pointerId); });
  window.addEventListener('pointermove', e => { if (!isDragging) return; const dx = e.clientX - lastPointerX, dy = e.clientY - lastPointerY; lastPointerX = e.clientX; lastPointerY = e.clientY; targetYaw += dx * 0.004; targetPitch = Math.max(-1.15, Math.min(1.15, targetPitch + dy * 0.003)); });
  window.addEventListener('pointerup', () => { isDragging = false; });
  stage.addEventListener('wheel', e => { e.preventDefault(); targetFov = Math.max(38, Math.min(98, targetFov + e.deltaY * 0.05)); }, { passive: false });
  qs('#zoom-in')?.addEventListener('click', () => { targetFov = Math.max(38, targetFov - 8); });
  qs('#zoom-out')?.addEventListener('click', () => { targetFov = Math.min(98, targetFov + 8); });

  // Motion toggle button
  let motionReduced = false;
  qs('#motion-toggle')?.addEventListener('click', () => { motionReduced = !motionReduced; const btn = qs('#motion-toggle'); if (btn) btn.textContent = motionReduced ? 'Standard motion' : 'Reduced motion'; });
  function openImmersiveModal(mode = '360', scene = 'living_room') {
    if (!modal) return;
    modal.hidden = false;
    document.body.classList.add('experience-open');
    switchImmersiveMode(mode, scene);
    setTimeout(() => {
      resizeModal();
      renderModal();
    }, 40);
  }

  function close360Modal() {
    if (modal) modal.hidden = true;
    document.body.classList.remove('experience-open');
    if (autoWalkTimer) {
      clearInterval(autoWalkTimer);
      autoWalkTimer = null;
    }
    if (videoTimer) {
      clearInterval(videoTimer);
      videoTimer = null;
    }
  }

  qs('#experience-close')?.addEventListener('click', close360Modal);

  // Bottom Media Bar triggers distinct immersive modes
  qsa('.view-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const media = btn.dataset.media;
      if (media === '360') {
        openImmersiveModal('360', 'living_room');
      } else if (media === 'walk') {
        openImmersiveModal('walk', 'living_room');
      } else if (media === 'gallery') {
        openImmersiveModal('gallery');
      } else if (media === 'video') {
        openImmersiveModal('video');
      }
    });
  });

  // Scene Navigator buttons
  qsa('.scene-nav button').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.scene) {
        updateModalScene(btn.dataset.scene);
      }
    });
  });

  // Gallery Thumbnails Click opens modal 360 viewer for that scene
  qsa('.gallery-thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      qsa('.gallery-thumb').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
      const sc = thumb.dataset.scene;
      if (sc) {
        openImmersiveModal('360', sc);
      } else {
        openImmersiveModal('gallery');
      }
    });
  });

}

// ═══════════════════════════ INITIALIZATION ═══════════════════════════
update();
applyAmbience('day');


// Defensive interaction bridge: keep visible controls usable even if WebGL initialization fails.
document.addEventListener('click', (event) => {
  const media = event.target.closest?.('.view-tab');
  const modal = document.querySelector('#experience-modal');
  if (media && modal) {
    modal.hidden = false;
    document.body.classList.add('experience-open');
    const mode = media.dataset.media || '360';
    const tag = document.querySelector('#mode-indicator-tag');
    const guidance = document.querySelector('#stage-guidance');
    if (tag) tag.textContent = mode === 'walk' ? 'Virtual Walk' : mode === 'gallery' ? 'Gallery' : mode === 'video' ? 'Video' : '360 Mode';
    if (guidance) guidance.textContent = mode === '360' || mode === 'walk' ? 'IMMERSIVE ROOM VIEW · Drag to look around' : mode.toUpperCase();
  }
  if (event.target.closest?.('#experience-close, [data-tour-exit]')) {
    if (modal) modal.hidden = true;
    document.body.classList.remove('experience-open');
  }
  const sceneButton = event.target.closest?.('.scene-nav button');
  if (sceneButton) {
    const title = document.querySelector('#experience-title');
    if (title) title.textContent = sceneButton.textContent.trim();
    document.querySelectorAll('.scene-nav button').forEach((button) => button.classList.toggle('active', button === sceneButton));
  }
});

window.addEventListener('error', (event) => { const stage=document.querySelector('#experience-stage'); if(stage && !stage.dataset.runtimeError){ stage.dataset.runtimeError='1'; stage.insertAdjacentHTML('beforeend','<div class="runtime-notice">Interactive room preview · drag to look · choose a room above</div>'); } });

// Backend-first auth with explicit demo fallback.
(() => { const modal=qs('#auth-modal'); if(!modal)return; let role='guest'; const open=(r='guest')=>{role=r;modal.hidden=false;qs('#auth-email').value='';qs('#auth-password').value='';qs('#auth-error').textContent='';qs('#auth-state').hidden=true;qs('#auth-hint').textContent=r==='manager'?'Demo manager: manager@stayos.demo / manage':'Demo guest: guest@stayos.demo / stayos';}; const close=()=>modal.hidden=true; qs('.signin')?.addEventListener('click',e=>{e.preventDefault();open('guest')});qs('.btn-create-account')?.addEventListener('click',e=>{if(!e.currentTarget.closest('#auth-form'))open()});qs('#auth-close')?.addEventListener('click',close);qsa('.auth-tab').forEach(t=>t.addEventListener('click',()=>open(t.dataset.role)));qs('#auth-form')?.addEventListener('submit',async e=>{e.preventDefault();const email=qs('#auth-email').value.trim().toLowerCase(),password=qs('#auth-password').value;try{const r=await fetch('http://127.0.0.1:8080/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});if(!r.ok)throw new Error('invalid');const d=await r.json();localStorage.setItem('stayosToken',d.token);document.body.dataset.role=d.user.role;qs('#auth-state').textContent=`Signed in via backend as ${d.user.role}.`;qs('#auth-state').hidden=false;setTimeout(close,700);}catch(err){const valid=role==='manager'?email==='manager@stayos.demo'&&password==='manage':email==='guest@stayos.demo'&&password==='stayos';if(!valid){qs('#auth-error').textContent='Backend unavailable or credentials invalid.';return;}document.body.dataset.role=role;qs('#auth-state').textContent=`Demo mode: backend unavailable; signed in as ${role}.`;qs('#auth-state').hidden=false;setTimeout(close,700);}});})();


