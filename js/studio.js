// Arcadvocado's studio screen, as the games open with it: the avocado cabinet drops in and bounces, plays a
// 16-beat riff on its stick and buttons, then the name flies up and slams into it (flash, shake, crumbs, a squish),
// the sparks blink on and it holds the calm frame. Ported beat for beat from Shatterbelt's studio screen.
// Drawn at the art's own pixels on a small canvas, scaled up by a whole number of device pixels so it stays crisp.
// Reduced motion: no flash, no shake, straight to the calm frame. Click the logo to play it again. ?t=1.5 holds a moment.
(function () {
  "use strict";
  var canvas = document.getElementById("studio-logo");
  if (!canvas) return;
  var flashEl = document.getElementById("studio-flash");
  var ctx = canvas.getContext("2d");
  var W = canvas.width, H = canvas.height; // the canvas, in art pixels
  var AW = 203, AH = 164;                  // every layer is a whole-logo frame of this size

  // Timing (seconds), as in the game.
  var DROP = 0.2, LAND = 0.55, SETTLE = 0.95, POWER = 1.05, PLAY = 1.3, BEAT = 0.125, BEATS = 16;
  var END = PLAY + BEAT * BEATS; // 3.3: the slam
  var FALL = 300, SOLO_LOW = 21, BOUNCES = [12, 4];
  var POWER_FRAMES = [4, 5, 2], POWER_STEP = 0.05, CALM = 0;
  var STICK_POSES = [1, 0, 0, 1, 2, 2, 1, 0, 1, 2, 0, 0, 2, 1, 2, 1], UPRIGHT = 1;
  var CYAN_PRESSES = [1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 1, 1];
  var MAGENTA_PRESSES = [0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1];
  var SCREEN_FRAMES = [1, 2, 1, 3, 1, 2, 0, 3, 2, 1, 2, 3, 1, 2, 1, 3];
  var BURSTS = [3, 7, 11, 15];
  var NAME_TIME = 0.3, NAME_FROM = END - NAME_TIME, RISE_FROM = 200, RECOILS = [5, 1], RECOIL_TIME = 0.3;
  var BLINK = 0.36, BLINK_STEP = 0.06;
  var STRETCH = [-6, 10], STRETCH_TIME = 0.08, SQUASH = [14, -10], SQUASH_TIME = 0.16;
  var LAND_SHAKE = 3, LAND_SHAKE_TIME = 0.2, BOB = [2, -2], BOB_TIME = 0.06;
  var FLASHES = [0.75, 0.35], FLASH_STEP = 0.04, BURST_FLASH = 0.18;
  var SLAM_SHAKE = 6, SLAM_SHAKE_TIME = 0.35, JOLT = 2, JOLT_TIME = 0.1, SHAKE_STEP = 1 / 30;
  var SQUISH = [16, -12], SQUISH_TIME = 0.5, SQUISH_WOBBLES = 2.5;
  var FOOT = [101, 106];
  var CRUMB_TIME = 0.7, CRUMB_FALL = 520;
  var LIME = "rgb(144,234,84)", GREEN = "rgb(44,154,84)", MINT = "rgb(215,253,179)", CREAM = "rgb(255,240,182)";
  var CRUMB_COLOURS = [LIME, LIME, GREEN, MINT, CREAM, "rgb(224,64,204)", "rgb(66,224,232)"];

  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hold = parseFloat(new URLSearchParams(location.search).get("t"));

  // The crumbs: made once from a fixed seed, so every visit sees the same burst.
  var seed = 1501;
  function rand() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
  function range(a, b) { return a + (b - a) * rand(); }
  var crumbs = [];
  for (var c = 0; c < 30; c++) {
    var angle = range(-Math.PI * 0.95, -Math.PI * 0.05), speed = range(90, 260);
    crumbs.push({ x: range(-70, 70), vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      colour: CRUMB_COLOURS[Math.floor(rand() * CRUMB_COLOURS.length)], size: rand() < 0.7 ? 2 : 3 });
  }

  function has(list, i) { return list.indexOf(i) >= 0; }
  function beatAt(t) { return t < PLAY || t >= END ? -1 : Math.min(Math.floor((t - PLAY) / BEAT), BEATS - 1); }
  function halfSines(heights, dt, span) {
    var each = span / heights.length, i = Math.floor(dt / each);
    return i >= heights.length ? 0 : heights[i] * Math.sin(Math.PI * (dt % each) / each);
  }
  function wordmarkDrop(t) {
    if (t < NAME_FROM) return null;
    if (t < END) { var k = (t - NAME_FROM) / NAME_TIME; return RISE_FROM * (1 - k * k); }
    return halfSines(RECOILS, t - END, RECOIL_TIME);
  }
  function avocadoLift(t) {
    if (t < DROP) return null;
    if (t < LAND) { var k = (t - DROP) / (LAND - DROP); return FALL * (1 - k * k) - SOLO_LOW; }
    if (t < NAME_FROM) return halfSines(BOUNCES, t - LAND, SETTLE - LAND) - SOLO_LOW;
    return -Math.min(SOLO_LOW, wordmarkDrop(t));
  }
  function scaled(v, s) { return [Math.round(v[0] * s), Math.round(v[1] * s)]; }
  function squash(t) {
    if (t >= LAND - STRETCH_TIME && t < LAND) return scaled(STRETCH, 1 - (LAND - t) / STRETCH_TIME);
    if (t >= LAND && t < LAND + SQUASH_TIME) return scaled(SQUASH, Math.sin(Math.PI * (1 - (t - LAND) / SQUASH_TIME) * 0.5));
    var i = beatAt(t);
    if (i >= 0 && (t - PLAY) % BEAT < BOB_TIME) return scaled(BOB, has(BURSTS, i) ? 2 : 1);
    if (t >= END && t < END + SQUISH_TIME) {
      var k = (t - END) / SQUISH_TIME;
      return scaled(SQUISH, (1 - k) * Math.cos(2 * Math.PI * SQUISH_WOBBLES * k));
    }
    return [0, 0];
  }
  function shake(t) {
    if (still) return [0, 0];
    var reach = 0;
    if (t >= LAND && t < LAND + LAND_SHAKE_TIME) reach = LAND_SHAKE * (1 - (t - LAND) / LAND_SHAKE_TIME);
    var i = beatAt(t);
    if (has(BURSTS, i)) {
      var dt = (t - PLAY) % BEAT;
      if (dt < JOLT_TIME) reach = Math.max(reach, JOLT * (1 - dt / JOLT_TIME));
    }
    if (t >= END && t < END + SLAM_SHAKE_TIME) reach = Math.max(reach, SLAM_SHAKE * (1 - (t - END) / SLAM_SHAKE_TIME));
    reach = Math.round(reach);
    if (reach <= 0) return [0, 0];
    var step = Math.floor(t / SHAKE_STEP), r = Math.sin(step * 12.9898) * 43758.5453;
    var a = 2 * Math.PI * (r - Math.floor(r));
    return [Math.round(Math.cos(a) * reach), Math.round(Math.sin(a) * reach)];
  }
  function flash(t) {
    if (still) return 0;
    if (t >= END && t < END + FLASH_STEP * FLASHES.length) return FLASHES[Math.floor((t - END) / FLASH_STEP)];
    var i = beatAt(t);
    return has(BURSTS, i) && (t - PLAY) % BEAT < FLASH_STEP ? BURST_FLASH : 0;
  }
  function screenFrame(t) {
    if (t < POWER) return -1;
    var step = Math.floor((t - POWER) / POWER_STEP);
    if (step < POWER_FRAMES.length) return POWER_FRAMES[step];
    var i = beatAt(t);
    return i < 0 ? CALM : SCREEN_FRAMES[i];
  }
  function pressed(presses, t) {
    var i = beatAt(t);
    return i >= 0 && presses[i] === 1 && (t - PLAY) % BEAT < BEAT / 2;
  }
  function sparksShown(t) {
    if (t < END) return false;
    if (t < END + BLINK) return Math.floor((t - END) / BLINK_STEP) % 2 === 0;
    return true;
  }

  var names = ["avocado", "screen", "stick", "button_cyan", "button_magenta", "sparks", "wordmark"];
  var img = {};
  var base = canvas.getAttribute("data-art") || "img/studio/";

  function frame(sheet, i) { ctx.drawImage(img[sheet], AW * i, 0, AW, AH, 0, 0, AW, AH); }

  function draw(t) {
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var s = shake(t);
    var at = [Math.floor((W - AW) / 2) + s[0], Math.floor((H - AH) / 2) + s[1]];
    var lift = avocadoLift(t);
    if (lift !== null) {
      var st = squash(t), sx = (AW + st[0]) / AW, sy = (AH + st[1]) / AH;
      // Squashed about its foot: the foot stays put, the rest spreads.
      var ox = Math.round(at[0] + FOOT[0] - FOOT[0] * sx), oy = Math.round(at[1] - Math.round(lift) + FOOT[1] - FOOT[1] * sy);
      ctx.setTransform(sx, 0, 0, sy, ox, oy);
      ctx.drawImage(img.avocado, 0, 0);
      var f = screenFrame(t);
      if (f >= 0) frame("screen", f);
      frame("stick", beatAt(t) < 0 ? UPRIGHT : STICK_POSES[beatAt(t)]);
      frame("button_cyan", pressed(CYAN_PRESSES, t) ? 1 : 0);
      frame("button_magenta", pressed(MAGENTA_PRESSES, t) ? 1 : 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    if (sparksShown(t)) ctx.drawImage(img.sparks, at[0], at[1]);
    var drop = wordmarkDrop(t);
    if (drop !== null) ctx.drawImage(img.wordmark, at[0], at[1] + Math.round(drop));
    var dt = t - END;
    if (dt >= 0 && dt < CRUMB_TIME) {
      for (var i = 0; i < crumbs.length; i++) {
        var cr = crumbs[i];
        ctx.fillStyle = cr.colour;
        ctx.fillRect(Math.round(FOOT[0] + cr.x + cr.vx * dt) + at[0],
          Math.round(FOOT[1] + cr.vy * dt + CRUMB_FALL * dt * dt / 2) + at[1], cr.size, cr.size);
      }
    }
    if (flashEl) flashEl.style.opacity = flash(t);
  }

  // Whole device pixels per art pixel, as large as fits (at most 2.5 CSS pixels per art pixel).
  function fit() {
    var dpr = window.devicePixelRatio || 1;
    var room = Math.min(canvas.parentElement.clientWidth, W * 2.5);
    var k = Math.max(1, Math.floor(room * dpr / W));
    canvas.style.width = (W * k / dpr) + "px";
    canvas.style.height = (H * k / dpr) + "px";
  }

  var start = 0, running = false, plays = 0;
  function tick(now) {
    if (!running) return;
    var t = (now - start) / 1000;
    draw(Math.min(t, END + 1));
    if (t < END + 1) requestAnimationFrame(tick); else running = false;
  }
  function play() {
    if (still) { draw(END + 1); return; }
    if (running) return;
    running = true;
    var play = ++plays;
    requestAnimationFrame(function (now) { start = now; tick(now); });
    // Where frames stop coming (a page preview, a stalled tab), still end on the calm frame.
    setTimeout(function () { if (running && play === plays) { running = false; draw(END + 1); } }, (END + 2) * 1000);
  }

  var left = names.length;
  names.forEach(function (n) {
    var im = new Image();
    im.onload = function () {
      if (--left > 0) return;
      fit();
      if (!isNaN(hold)) draw(hold); else play();
    };
    im.src = base + "studio_" + n + ".png";
    img[n] = im;
  });
  window.addEventListener("resize", fit);
  canvas.addEventListener("click", play);
})();
