/**
 * QUEEN STORE — Eid Al-Adha Campaign
 * script.js — Firebase Realtime Database version
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase,
  ref,
  runTransaction,
  get,
  set,
  onValue
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

/* =====================================================
   FIREBASE CONFIG
   ===================================================== */
const firebaseConfig = {
  apiKey:            "AIzaSyCTd9eUnlNIC1Lr7IGvz8JiluSZ-K0UqPI",
  authDomain:        "queenstore-d8c04.firebaseapp.com",
  databaseURL:       "https://queenstore-d8c04-default-rtdb.firebaseio.com",
  projectId:         "queenstore-d8c04",
  storageBucket:     "queenstore-d8c04.firebasestorage.app",
  messagingSenderId: "110100260814",
  appId:             "1:110100260814:web:ef738f9092d8b30b486d9f"
};

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

/* =====================================================
   COUPON POOL — 30 unique codes
   ===================================================== */
const COUPONS = [
  'QUEEN-EID01','QUEEN-EID02','QUEEN-EID03','QUEEN-EID04','QUEEN-EID05',
  'QUEEN-EID06','QUEEN-EID07','QUEEN-EID08','QUEEN-EID09','QUEEN-EID10',
  'QUEEN-EID11','QUEEN-EID12','QUEEN-EID13','QUEEN-EID14','QUEEN-EID15',
  'QUEEN-EID16','QUEEN-EID17','QUEEN-EID18','QUEEN-EID19','QUEEN-EID20',
  'QUEEN-EID21','QUEEN-EID22','QUEEN-EID23','QUEEN-EID24','QUEEN-EID25',
  'QUEEN-EID26','QUEEN-EID27','QUEEN-EID28','QUEEN-EID29','QUEEN-EID30'
];
const TOTAL = COUPONS.length; // 30

/* =====================================================
   LOCAL STORAGE KEY (device memory only)
   ===================================================== */
const LOCAL_KEY = 'queen_store_eid_adha_1446_claimed';

/* =====================================================
   DOM
   ===================================================== */
const claimBtn      = document.getElementById('claim-btn');
const btnText       = document.getElementById('btn-text');
const couponBox     = document.getElementById('coupon-box');
const couponDisplay = document.getElementById('coupon-code-display');
const messageArea   = document.getElementById('message-area');
const remainingEl   = document.getElementById('remaining-count');
const counterBar    = document.getElementById('counter-bar');

/* =====================================================
   INIT — Firebase listener for live counter
   ===================================================== */
async function init() {
  // 1. Initialize DB structure on first run
  await initDB();

  // 2. Live counter listener
  const nextIndexRef = ref(db, 'campaign/nextIndex');
  onValue(nextIndexRef, (snapshot) => {
    const nextIndex = snapshot.val() ?? 0;
    const remaining = Math.max(0, TOTAL - nextIndex);
    updateCounterUI(remaining);
  });

  // 3. Check if this device already claimed
  const claimed = localStorage.getItem(LOCAL_KEY);
  if (claimed) {
    showExistingCoupon(claimed);
    return;
  }

  // 4. Check live remaining
  const snap = await get(ref(db, 'campaign/nextIndex'));
  const nextIndex = snap.val() ?? 0;
  const remaining = TOTAL - nextIndex;

  if (remaining <= 0) {
    showSoldOutState();
  } else {
    enableButton();
  }
}

/* =====================================================
   INIT DB — write structure only if not exists
   ===================================================== */
async function initDB() {
  const snap = await get(ref(db, 'campaign/initialized'));
  if (snap.val()) return; // already initialized

  await set(ref(db, 'campaign'), {
    initialized: true,
    nextIndex: 0,
    totalCoupons: TOTAL
  });
}

/* =====================================================
   CLAIM COUPON
   Uses Firebase Transaction to prevent duplicates
   ===================================================== */
async function claimCoupon() {
  // Double-check localStorage
  const alreadyClaimed = localStorage.getItem(LOCAL_KEY);
  if (alreadyClaimed) {
    showExistingCoupon(alreadyClaimed);
    return;
  }

  // Disable button immediately to prevent double-click
  claimBtn.disabled = true;
  btnText.textContent = 'جارٍ الحجز...';

  try {
    const nextIndexRef = ref(db, 'campaign/nextIndex');

    let assignedCode = null;

    // Atomic transaction — safe against concurrent users
    const result = await runTransaction(nextIndexRef, (currentIndex) => {
      if (currentIndex === null) currentIndex = 0;
      if (currentIndex >= TOTAL) return; // abort — no coupons left
      return currentIndex + 1;
    });

    if (!result.committed) {
      // All coupons taken
      showSoldOutState();
      return;
    }

    // result.snapshot.val() is the NEW value after increment
    const usedIndex = result.snapshot.val() - 1;
    assignedCode = COUPONS[usedIndex];

    // Save to localStorage
    localStorage.setItem(LOCAL_KEY, assignedCode);

    // Show coupon
    showCoupon(assignedCode);
    launchConfetti();
    playEidSound();

  } catch (err) {
    console.error('Firebase error:', err);
    showMessage('حدث خطأ، حاول مرة أخرى', 'warning');
    claimBtn.disabled = false;
    btnText.textContent = 'احصل على كود الخصم';
  }
}

/* =====================================================
   UI HELPERS
   ===================================================== */
function enableButton() {
  claimBtn.disabled = false;
  btnText.textContent = 'احصل على كود الخصم';
}

function updateCounterUI(remaining) {
  remainingEl.textContent = remaining;
  const pct = (remaining / TOTAL) * 100;
  counterBar.style.width = pct + '%';

  if (remaining <= 5) {
    remainingEl.style.color = '#f87171';
    counterBar.style.background = 'linear-gradient(90deg,#991b1b,#f87171)';
  } else if (remaining <= 10) {
    remainingEl.style.color = '#fb923c';
    counterBar.style.background = 'linear-gradient(90deg,#9a3412,#fb923c)';
  } else {
    remainingEl.style.color = '';
    counterBar.style.background = '';
  }
}

function showCoupon(code) {
  couponDisplay.textContent = code;
  couponBox.style.display = 'block';
  couponBox.style.animation = 'none';
  void couponBox.offsetWidth;
  couponBox.style.animation = '';
  messageArea.style.display = 'none';
  claimBtn.disabled = true;
  btnText.textContent = 'تم الحصول على الكود ✓';
}

function showExistingCoupon(code) {
  couponDisplay.textContent = code;
  couponBox.style.display = 'block';
  claimBtn.disabled = true;
  btnText.textContent = 'تم الحصول على الكود ✓';
  showMessage('لقد حصلت على كودك بالفعل 🎉', 'info');
}

function showSoldOutState() {
  claimBtn.disabled = true;
  btnText.textContent = 'نفدت الكوبونات';
  couponBox.style.display = 'none';
  showMessage('🌙 حظ أوفر بالعيد القادم 🌙', 'warning');
  updateCounterUI(0);
}

function showMessage(text, type) {
  messageArea.textContent = text;
  messageArea.className = `message-area ${type}`;
  messageArea.style.display = 'block';
  messageArea.style.animation = 'none';
  void messageArea.offsetWidth;
  messageArea.style.animation = '';
}

/* =====================================================
   COPY COUPON
   ===================================================== */
function copyCoupon() {
  const code = couponDisplay.textContent;
  const copyText = document.getElementById('copy-text');
  if (!code || code === 'QUEEN-XXXX') return;

  const done = () => {
    copyText.textContent = '✅ تم النسخ!';
    setTimeout(() => { copyText.textContent = '📋 نسخ الكود'; }, 2000);
  };

  if (navigator.clipboard) {
    navigator.clipboard.writeText(code).then(done);
  } else {
    const el = document.createElement('textarea');
    el.value = code;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    done();
  }
}

/* =====================================================
   EID SOUND — Web Audio API
   ===================================================== */
function playEidSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [
      { freq: 523.25, start: 0,    dur: 0.18 },
      { freq: 659.25, start: 0.2,  dur: 0.18 },
      { freq: 783.99, start: 0.4,  dur: 0.18 },
      { freq: 1046.5, start: 0.6,  dur: 0.35 },
      { freq: 783.99, start: 1.0,  dur: 0.18 },
      { freq: 1046.5, start: 1.25, dur: 0.5  },
    ];
    notes.forEach(({ freq, start, dur }) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + start + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.05);
    });
  } catch (e) {}
}

/* =====================================================
   CONFETTI
   ===================================================== */
const confettiCanvas = document.getElementById('confetti-canvas');
const confettiCtx    = confettiCanvas.getContext('2d');
let confettiParticles = [];
let confettiAnimId    = null;

const GOLD_COLORS = ['#D4A843','#F0C870','#FDE89A','#B8891C','#FFFFFF','#FFD700','#FFA500'];

function resizeConfetti() {
  confettiCanvas.width  = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
resizeConfetti();
window.addEventListener('resize', resizeConfetti);

function launchConfetti() {
  for (let i = 0; i < 120; i++) {
    confettiParticles.push({
      x:       confettiCanvas.width * 0.5 + (Math.random() - 0.5) * 200,
      y:       confettiCanvas.height * 0.3,
      vx:      (Math.random() - 0.5) * 12,
      vy:      Math.random() * -14 - 4,
      ay:      0.2,
      size:    Math.random() * 7 + 3,
      color:   GOLD_COLORS[Math.floor(Math.random() * GOLD_COLORS.length)],
      shape:   Math.random() < 0.5 ? 'rect' : 'circle',
      angle:   Math.random() * Math.PI * 2,
      spin:    (Math.random() - 0.5) * 0.3,
      alpha:   1,
      life:    0,
      maxLife: Math.random() * 120 + 80
    });
  }
  if (!confettiAnimId) animateConfetti();
}

function animateConfetti() {
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  confettiParticles = confettiParticles.filter(p => p.life < p.maxLife);
  confettiParticles.forEach(p => {
    p.vy += p.ay; p.x += p.vx; p.y += p.vy;
    p.angle += p.spin; p.life++;
    p.alpha = 1 - p.life / p.maxLife;
    confettiCtx.save();
    confettiCtx.translate(p.x, p.y);
    confettiCtx.rotate(p.angle);
    confettiCtx.globalAlpha = p.alpha;
    confettiCtx.fillStyle = p.color;
    if (p.shape === 'rect') {
      confettiCtx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    } else {
      confettiCtx.beginPath();
      confettiCtx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      confettiCtx.fill();
    }
    confettiCtx.restore();
  });
  if (confettiParticles.length > 0) {
    confettiAnimId = requestAnimationFrame(animateConfetti);
  } else {
    confettiAnimId = null;
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }
}

/* =====================================================
   PARTICLE BACKGROUND
   ===================================================== */
const particlesCanvas = document.getElementById('particles-canvas');
const pCtx            = particlesCanvas.getContext('2d');
let bgParticles = [];

function resizeParticles() {
  particlesCanvas.width  = window.innerWidth;
  particlesCanvas.height = window.innerHeight;
}
resizeParticles();
window.addEventListener('resize', resizeParticles);

for (let i = 0; i < 55; i++) {
  bgParticles.push({
    x:     Math.random() * particlesCanvas.width,
    y:     Math.random() * particlesCanvas.height,
    r:     Math.random() * 2 + 0.5,
    alpha: Math.random() * 0.5 + 0.1,
    speed: Math.random() * 0.4 + 0.1,
    angle: Math.random() * Math.PI * 2,
    drift: (Math.random() - 0.5) * 0.015
  });
}

function animateParticles() {
  pCtx.clearRect(0, 0, particlesCanvas.width, particlesCanvas.height);
  bgParticles.forEach(p => {
    p.angle += p.drift;
    p.x += Math.cos(p.angle) * p.speed;
    p.y -= p.speed * 0.6;
    if (p.y < -10) p.y = particlesCanvas.height + 10;
    if (p.x < -10) p.x = particlesCanvas.width + 10;
    if (p.x > particlesCanvas.width + 10) p.x = -10;
    p.alpha += (Math.random() - 0.5) * 0.02;
    p.alpha = Math.max(0.05, Math.min(0.65, p.alpha));
    pCtx.beginPath();
    pCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    const grad = pCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
    grad.addColorStop(0, `rgba(240,200,112,${p.alpha})`);
    grad.addColorStop(1, `rgba(212,168,67,0)`);
    pCtx.fillStyle = grad;
    pCtx.fill();
  });
  requestAnimationFrame(animateParticles);
}

animateParticles();

/* =====================================================
   EXPOSE globals needed by onclick attributes
   ===================================================== */
window.claimCoupon = claimCoupon;
window.copyCoupon  = copyCoupon;

/* =====================================================
   START
   ===================================================== */
init();
