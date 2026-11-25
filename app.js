document.addEventListener('DOMContentLoaded', () => {
  const track = document.getElementById('sections-track');
  const sections = Array.from(document.querySelectorAll('.lp-section'));
  const railLabelEl = document.getElementById('rail-section-name');
  const railNodes = Array.from(document.querySelectorAll('.rail-node'));
  const lastSectionEl = document.getElementById('opona');

  let activeSection = 0;
  let isLocked = false;
  let heroMixTarget = 1.0;

  const svgCache = new Map();

  async function loadCleanSvg(url) {
    if (svgCache.has(url)) return svgCache.get(url);
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const text = await res.text();
      const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
      const svg = doc.querySelector('svg');
      if (!svg) return null;

      svg.removeAttribute('width');
      svg.removeAttribute('height');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

      svg.querySelectorAll('[fill]').forEach((el) => {
        const val = el.getAttribute('fill');
        if (val && val.toLowerCase() !== 'none') {
          el.setAttribute('fill', 'currentColor');
        }
      });
      svg.querySelectorAll('[stroke]').forEach((el) => {
        const val = el.getAttribute('stroke');
        if (val && val.toLowerCase() !== 'none') {
          el.setAttribute('stroke', 'currentColor');
        }
      });
      if (!svg.querySelector('[fill], [stroke]')) {
        svg.setAttribute('fill', 'currentColor');
      }

      const serialized = svg.outerHTML;
      svgCache.set(url, serialized);
      return serialized;
    } catch {
      return null;
    }
  }

  document.querySelectorAll('[data-inline-svg]').forEach(async (el) => {
    const markup = await loadCleanSvg(el.dataset.inlineSvg);
    if (markup) el.innerHTML = markup;
  });

  // Fixed on load: com-logo.svg in Top-Left & Bottom-Right; random die in Top-Right & Bottom-Left
  const DICE_POOL = [
    './assets/svg/com-d12.svg',
    './assets/svg/com-d4.svg',
    './assets/svg/com-d6.svg',
    './assets/svg/com-d8.svg',
    './assets/svg/com-d10.svg',
    './assets/svg/com-d20.svg'
  ];

  async function initCornerSvgs() {
    const fileA = './assets/svg/com-logo.svg';
    const fileB = DICE_POOL[Math.floor(Math.random() * DICE_POOL.length)];

    const [svgA, svgB] = await Promise.all([loadCleanSvg(fileA), loadCleanSvg(fileB)]);

    document.querySelectorAll('[data-corner-slot="A"]').forEach((slot) => {
      if (svgA) slot.innerHTML = svgA;
    });
    document.querySelectorAll('[data-corner-slot="B"]').forEach((slot) => {
      if (svgB) slot.innerHTML = svgB;
    });
  }

  initCornerSvgs();

  const DODECA_STATES = [
    { x: -0.34, y: 0.14, scale: 1.32 },
    { x: -0.26, y: 0.08, scale: 1.36 },
    { x: -0.19, y: 0.05, scale: 1.41 },
    { x: -0.12, y: 0.02, scale: 1.46 },
    { x: -0.06, y: 0.00, scale: 1.52 },
    { x: -0.02, y: -0.02, scale: 1.58 },
    { x: 0.00,  y: -0.04, scale: 1.65 },
    { x: 0.00,  y: -0.06, scale: 1.72 }
  ];
  let targetPose = { ...DODECA_STATES[0] };

  const mobileQuery = window.matchMedia('(max-width: 960px)');
  const isMobileFlow = () => mobileQuery.matches;

  function navigateTo(index) {
    const clamped = Math.max(0, Math.min(sections.length - 1, index));
    if (isMobileFlow()) {
      const targetEl = sections[clamped];
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }
    if (isLocked) return;

    isLocked = true;
    activeSection = clamped;
    heroMixTarget = activeSection === 0 ? 1.0 : 0.0;
    targetPose = { ...DODECA_STATES[activeSection] };

    track.style.transform = `translate3d(0, -${activeSection * 100}dvh, 0)`;

    document.body.classList.toggle('is-hero', activeSection === 0);
    document.body.classList.toggle('is-opona', activeSection === sections.length - 1);

    const railText = sections[activeSection]?.dataset.railLabel || '';
    if (railText) {
      railLabelEl.textContent = railText;
    }

    railNodes.forEach((node) => {
      const nodeTarget = Number(node.dataset.goto);
      const isCurrent = nodeTarget === activeSection;
      node.classList.toggle('is-active', isCurrent);
      if (isCurrent) {
        node.setAttribute('aria-current', 'step');
      } else {
        node.removeAttribute('aria-current');
      }
    });

    window.setTimeout(() => {
      isLocked = false;
    }, 760);
  }

   // Sync topbar visibility & 3D dodecahedron state during native scroll on mobile/tablet
   if ('IntersectionObserver' in window) {
     const sectionObserver = new IntersectionObserver(
       (entries) => {
         if (!isMobileFlow()) return;
         entries.forEach((entry) => {
           if (entry.isIntersecting) {
             const idx = Number(entry.target.dataset.index || 0);
             activeSection = idx;
             heroMixTarget = idx === 0 ? 1.0 : 0.0;
             targetPose = { ...DODECA_STATES[idx] };
             document.body.classList.toggle('is-hero', idx === 0);
             document.body.classList.toggle('is-opona', idx === sections.length - 1);
           }
         });
       },
       { threshold: 0.35 }
     );
     sections.forEach((sec) => sectionObserver.observe(sec));
   }
     mobileQuery.addEventListener('change', (e) => {
     if (e.matches) {
       track.style.transform = '';
     } else {
       navigateTo(activeSection);
     }
   });

  window.addEventListener('wheel', (e) => {
    if (isMobileFlow()) return;
    if (Math.abs(e.deltaY) < 25) return;

    if (activeSection === sections.length - 1 && lastSectionEl) {
      const canScrollDown =
        lastSectionEl.scrollTop + lastSectionEl.clientHeight < lastSectionEl.scrollHeight - 4;
      const canScrollUp = lastSectionEl.scrollTop > 4;
      if (e.deltaY > 0 && canScrollDown) return;
      if (e.deltaY < 0 && canScrollUp) return;
    }

    e.preventDefault();
    if (isLocked) return;

    if (e.deltaY > 0) {
      navigateTo(activeSection + 1);
    } else {
      navigateTo(activeSection - 1);
    }
  }, { passive: false });

  let touchStartY = null;
  window.addEventListener('touchstart', (e) => {
    if (isMobileFlow()) return;
    touchStartY = e.touches[0]?.clientY ?? null;
  }, { passive: true });

  window.addEventListener('touchend', (e) => {
    if (isMobileFlow()) return;
    if (touchStartY === null) return;
    const endY = e.changedTouches[0]?.clientY ?? touchStartY;
    const diff = touchStartY - endY;
    touchStartY = null;

    if (Math.abs(diff) < 45) return;
    if (diff > 0) {
      navigateTo(activeSection + 1);
    } else {
      navigateTo(activeSection - 1);
    }
  }, { passive: true });

  window.addEventListener('keydown', (e) => {
    if (isMobileFlow()) return;
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault();
      navigateTo(activeSection + 1);
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      navigateTo(activeSection - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      navigateTo(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      navigateTo(sections.length - 1);
    }
  });

  document.querySelectorAll('[data-goto]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const idx = Number(btn.dataset.goto);
      if (!Number.isNaN(idx)) {
        navigateTo(idx);
      }
    });
  });

  const nextCueBtn = document.getElementById('next-section-cue');
  if (nextCueBtn) {
    nextCueBtn.addEventListener('click', () => {
      navigateTo(activeSection + 1);
    });
  }

  const painItems = Array.from(document.querySelectorAll('#pain-accordion .pain-item'));

  painItems.forEach((item) => {
    const trigger = item.querySelector('.pain-trigger');
    trigger.addEventListener('click', () => {
      const wasOpen = item.classList.contains('is-open');

      painItems.forEach((other) => {
        other.classList.remove('is-open');
        other.querySelector('.pain-trigger').setAttribute('aria-expanded', 'false');
      });

      if (!wasOpen) {
        item.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });
  });

  const QUOTES = [
    '„Rozhodují jiní, ale já nesu faktickou odpovědnost.“',
    '„Všechno musím nakonec stejně rozhodnout sám.“',
    '„Na poradách se mluví hodiny, ale výstup nikdo nedrží.“',
    '„Dohodneme se, ale za měsíc je všechno při starém.“',
    '„Operativa nám bere energii na jakoukoli změnu.“'
  ];

  const QUOTE_CASES = ['clot', 'one', 'loop', 'scatter', 'fog'];

  let quoteIndex = 0;
  const quoteTextEl = document.getElementById('quote-text');
  const quoteDotsEl = document.getElementById('quote-dots');
  const painFlowCanvas = document.getElementById('viz-pain-flow');

  function renderQuoteDots() {
    quoteDotsEl.innerHTML = '';
    QUOTES.forEach((_, idx) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'quote-dot' + (idx === quoteIndex ? ' is-active' : '');
      dot.setAttribute('aria-label', `Citát ${idx + 1}`);
      dot.addEventListener('click', () => setQuote(idx));
      quoteDotsEl.appendChild(dot);
    });
  }

  function setQuote(idx) {
    quoteIndex = (idx + QUOTES.length) % QUOTES.length;
    quoteTextEl.style.opacity = '0';
    window.setTimeout(() => {
      quoteTextEl.textContent = QUOTES[quoteIndex];
      quoteTextEl.style.opacity = '1';
    }, 120);
    if (painFlowCanvas && window.CoMViz) {
      painFlowCanvas.dataset.case = QUOTE_CASES[quoteIndex] || 'clot';
      window.CoMViz.refresh(painFlowCanvas);
    }
    renderQuoteDots();
  }

  document.getElementById('quote-prev').addEventListener('click', () => setQuote(quoteIndex - 1));
  document.getElementById('quote-next').addEventListener('click', () => setQuote(quoteIndex + 1));
  renderQuoteDots();

  const contactForm = document.getElementById('contact-form');
  const contactField = document.getElementById('contact-field');
  const contactStatus = document.getElementById('contact-status');
  const focusContactBtn = document.getElementById('focus-contact-btn');

  if (focusContactBtn && contactField) {
    focusContactBtn.addEventListener('click', () => {
      contactField.focus();
    });
  }

  if (contactForm && contactField && contactStatus) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!contactField.value.trim()) return;
      contactField.value = '';
      contactStatus.hidden = false;
      window.setTimeout(() => {
        contactStatus.hidden = true;
      }, 4000);
    });
  }

  const canvas = document.getElementById('dodecahedron-canvas');
  if (canvas) {
    const gl = canvas.getContext('webgl2', {
      antialias: false,
      powerPreference: 'high-performance'
    });

    if (gl) {
      const VERTEX_SHADER = `#version 300 es
        in vec2 a_position;
        out vec2 v_uv;
        void main() {
          v_uv = a_position * 0.5 + 0.5;
          gl_Position = vec4(a_position, 0.0, 1.0);
        }
      `;

      const FRAGMENT_SHADER = `#version 300 es
        precision highp float;

        in vec2 v_uv;
        out vec4 fragColor;

        uniform float u_time;
        uniform vec2 u_resolution;
        uniform float u_heroMix;
        uniform vec2 u_offset;
        uniform float u_scale;

        const float PHI = 1.61803398875;

        mat2 rot(float a) {
          float s = sin(a);
          float c = cos(a);
          return mat2(c, -s, s, c);
        }

        vec3 oklchToSrgb(float L, float C, float hDeg) {
          float h = radians(hDeg);
          float a = C * cos(h);
          float b = C * sin(h);

          float l_ = L + 0.3963377774 * a + 0.2158037573 * b;
          float m_ = L - 0.1055613458 * a - 0.0638541728 * b;
          float s_ = L - 0.0894841775 * a - 1.2914855480 * b;

          float l = l_ * l_ * l_;
          float m = m_ * m_ * m_;
          float s = s_ * s_ * s_;

          vec3 rgb = vec3(
            +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
            -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
            -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
          );
          return clamp(rgb, 0.0, 1.0);
        }

        float sdDodecahedron(vec3 p, float r) {
          vec3 n1 = normalize(vec3(0.0, 1.0, PHI));
          vec3 n2 = normalize(vec3(1.0, PHI, 0.0));
          vec3 n3 = normalize(vec3(PHI, 0.0, 1.0));

          p = abs(p);
          float d = dot(p, n1);
          d = max(d, dot(p, n2));
          d = max(d, dot(p, n3));
          d = max(d, dot(p, vec3(-n1.x, n1.y, n1.z)));
          d = max(d, dot(p, vec3(n2.x, -n2.y, n2.z)));
          d = max(d, dot(p, vec3(n3.x, n3.y, -n3.z)));
          return (d - r) - 0.065;
        }

        float mapScene(vec3 p) {
          p.xz *= rot(u_time * 0.032 + 0.45);
          p.xy *= rot(u_time * 0.021 - 0.25);
          p.yz *= rot(sin(u_time * 0.028) * 0.28);
          return sdDodecahedron(p, 1.05 * u_scale);
        }

        vec3 calcNormal(vec3 p) {
          vec2 e = vec2(0.006, 0.0);
          return normalize(vec3(
            mapScene(p + e.xyy) - mapScene(p - e.xyy),
            mapScene(p + e.yxy) - mapScene(p - e.yxy),
            mapScene(p + e.yyx) - mapScene(p - e.yyx)
          ));
        }

        float staticGaussNoise(vec2 p) {
          float n1 = fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
          float n2 = fract(sin(dot(p + 19.37, vec2(269.5, 183.3))) * 24634.6345);
          float n3 = fract(sin(dot(p + 41.13, vec2(419.2, 371.9))) * 59182.1294);
          return ((n1 + n2 + n3) / 3.0) - 0.5;
        }

        void main() {
          vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);

          vec3 ro = vec3(-u_offset * 1.15, 3.8);
          vec3 rd = normalize(vec3(uv - u_offset * 0.45, -1.35));

          float t = 0.0;
          float minDist = 100.0;
          bool hit = false;

          for (int i = 0; i < 44; i++) {
            vec3 p = ro + rd * t;
            float d = mapScene(p);
            minDist = min(minDist, d);
            if (d < 0.005) {
              hit = true;
              break;
            }
            if (t > 8.0) break;
            t += d * 0.9;
          }

          // OKLCH color stops (Hue 26deg crimson for Hero, Chroma 0.0 for Subsections)
          vec3 heroRim       = oklchToSrgb(0.72, 0.19, 26.0);
          vec3 heroHighlight = oklchToSrgb(0.54, 0.17, 25.0);
          vec3 heroMid       = oklchToSrgb(0.32, 0.11, 24.0);
          vec3 heroShadow    = oklchToSrgb(0.10, 0.03, 22.0);

          // Controlled metallic silver-grey stops for sections 2..8 so text stays crisp
          vec3 monoRim       = oklchToSrgb(0.52, 0.0, 0.0);
          vec3 monoHighlight = oklchToSrgb(0.38, 0.0, 0.0);
          vec3 monoMid       = oklchToSrgb(0.22, 0.0, 0.0);
          vec3 monoShadow    = oklchToSrgb(0.08, 0.0, 0.0);

          float halo = exp(-max(minDist, 0.0) * 2.8) * 0.52;
          vec3 col = mix(monoMid, heroMid, u_heroMix) * halo;

          if (hit) {
            vec3 p = ro + rd * t;
            vec3 n = calcNormal(p);
            vec3 viewDir = -rd;

            vec3 keyDir = normalize(vec3(-0.55, 0.80, 0.60));
            vec3 fillDir = normalize(vec3(0.85, -0.30, 0.50));

            vec3 halfKey = normalize(keyDir + viewDir);
            vec3 halfFill = normalize(fillDir + viewDir);

            float diffKey = max(dot(n, keyDir), 0.0);
            float diffFill = max(dot(n, fillDir), 0.0);
            float specKey = pow(max(dot(n, halfKey), 0.0), 22.0);
            float specFill = pow(max(dot(n, halfFill), 0.0), 12.0);
            float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 2.2);

            float facetTone = clamp(diffKey * 0.62 + diffFill * 0.28, 0.0, 1.0);
            float specTone  = clamp(specKey * 0.85 + specFill * 0.45 + fresnel * 0.75, 0.0, 1.0);

            vec3 heroSurface = mix(heroShadow, heroMid, smoothstep(0.05, 0.65, facetTone));
            heroSurface = mix(heroSurface, heroHighlight, smoothstep(0.55, 0.95, facetTone));
            heroSurface += heroRim * specTone * 0.85;

            vec3 monoSurface = mix(monoShadow, monoMid, smoothstep(0.05, 0.65, facetTone));
            monoSurface = mix(monoSurface, monoHighlight, smoothstep(0.55, 0.95, facetTone));
            monoSurface += monoRim * specTone * 0.80;

            col = mix(monoSurface, heroSurface, u_heroMix);
          }

          // Gentle gamma lift without washing out dark background contrast
          col = pow(max(col, 0.0), vec3(0.88));

          // Triangular dithering + static monochromatic Gaussian noise to eliminate banding
          float grainA = staticGaussNoise(gl_FragCoord.xy);
          float grainB = staticGaussNoise(gl_FragCoord.xy + vec2(37.0, 91.0));
          float dither = (grainA + grainB) * 0.085;
          col = clamp(col + dither, 0.0, 1.0);

          fragColor = vec4(col, 1.0);
        }
      `;

      function compileShader(type, source) {
        const shader = gl.createShader(type);
        if (!shader) return null;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          gl.deleteShader(shader);
          return null;
        }
        return shader;
      }

      const vs = compileShader(gl.VERTEX_SHADER, VERTEX_SHADER);
      const fs = compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);

      if (vs && fs) {
        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);

        if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
          const buffer = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
          gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
            gl.STATIC_DRAW
          );

          const posLoc = gl.getAttribLocation(program, 'a_position');
          const timeLoc = gl.getUniformLocation(program, 'u_time');
          const resLoc = gl.getUniformLocation(program, 'u_resolution');
          const heroMixLoc = gl.getUniformLocation(program, 'u_heroMix');
          const offsetLoc = gl.getUniformLocation(program, 'u_offset');
          const scaleLoc = gl.getUniformLocation(program, 'u_scale');

          let heroMixCurrent = 1.0;
          let currentPose = { ...DODECA_STATES[0] };
          const startTime = performance.now();

          function resize() {
            const renderScale = 0.28;
            const w = Math.max(160, Math.floor(window.innerWidth * renderScale));
            const h = Math.max(120, Math.floor(window.innerHeight * renderScale));
            if (canvas.width !== w || canvas.height !== h) {
              canvas.width = w;
              canvas.height = h;
            }
          }

          resize();
          window.addEventListener('resize', resize);

          function render(now) {
            heroMixCurrent += (heroMixTarget - heroMixCurrent) * 0.035;
            currentPose.x += (targetPose.x - currentPose.x) * 0.028;
            currentPose.y += (targetPose.y - currentPose.y) * 0.028;
            currentPose.scale += (targetPose.scale - currentPose.scale) * 0.028;

            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.useProgram(program);
            gl.enableVertexAttribArray(posLoc);
            gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

            gl.uniform1f(timeLoc, (now - startTime) * 0.001);
            gl.uniform2f(resLoc, canvas.width, canvas.height);
            gl.uniform1f(heroMixLoc, heroMixCurrent);
            gl.uniform2f(offsetLoc, currentPose.x, currentPose.y);
            gl.uniform1f(scaleLoc, currentPose.scale);

            gl.drawArrays(gl.TRIANGLES, 0, 6);
            requestAnimationFrame(render);
          }

          requestAnimationFrame(render);
        }
      }
    }
  }
  /* ------------------------------------------------------------------------
     6. FLOW & PCD CANVAS VISUALIZATIONS (RESPONSIVE)
     ------------------------------------------------------------------------ */
  (function initComVisualizations() {
    const RED = '223,23,23';   // --color-red (#DF1717)
    const RED_L = '246,86,86'; // --color-red-l (#F65656)
    const CREAM = '235,231,224';
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function rng(seed) {
      let s = seed >>> 0;
      return function () {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
      };
    }

    function glow(cx, x, y, r, rgb, a) {
      const g = cx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')');
      g.addColorStop(1, 'rgba(' + rgb + ',0)');
      cx.fillStyle = g;
      cx.beginPath();
      cx.arc(x, y, r, 0, 6.283);
      cx.fill();
    }

    function flowPrep(W, H, cv) {
      const mode = (cv && cv.dataset.case) || 'free';
      const hz = W >= H * 1.15;
      const R = rng(23);
      const sc = Math.max(0.7, Math.min(1.6, Math.min(W, H) / 420));
      function P(u, v) {
        return hz ? [W * (0.05 + u * 0.9), H * (0.14 + v * 0.72)] : [W * (0.12 + v * 0.76), H * (0.05 + u * 0.9)];
      }
      const N = { M: [0.04, 0.5], R: [0.27, 0.5], V0: [0.52, 0.16], V1: [0.52, 0.5], V2: [0.52, 0.84] };
      const tv = [0.04, 0.22, 0.4, 0.6, 0.78, 0.96];
      tv.forEach((v, i) => {
        N['T' + i] = [0.8, v];
        N['O' + i] = [1.04, v];
      });
      const E = [];
      const EI = {};
      function edge(a, b) {
        const A = N[a], B = N[b], um = (A[0] + B[0]) / 2, pts = [];
        let len = 0;
        for (let i = 0; i <= 24; i++) {
          const s = i / 24, m = 1 - s;
          const u = m * m * m * A[0] + 3 * m * m * s * um + 3 * m * s * s * um + s * s * s * B[0];
          const v = m * m * m * A[1] + 3 * m * m * s * A[1] + 3 * m * s * s * B[1] + s * s * s * B[1];
          const p = P(u, v);
          if (i) len += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
          pts.push(p);
        }
        EI[a + '-' + b] = E.length;
        E.push({ a, b, pts, len });
      }
      edge('M', 'R');
      ['V0', 'V1', 'V2'].forEach((v) => edge('R', v));
      const VT = { V0: [0, 1, 2], V1: [2, 3], V2: [3, 4, 5] };
      Object.keys(VT).forEach((v) => VT[v].forEach((t) => edge(v, 'T' + t)));
      for (let i = 0; i < 6; i++) edge('T' + i, 'O' + i);

      function at(e, s) {
        const f = Math.max(0, Math.min(0.9999, s)) * 24;
        const i = Math.floor(f), k = f - i, a = e.pts[i], b = e.pts[i + 1];
        return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
      }

      const st = {
        nl: !!(cv && cv.dataset.labels === '0'),
        mode, hz, sc, P, N, E, EI, at, R,
        ps: [], clotS: 0.62, stallS: 0.6, clk: 0, last: null,
        speed: Math.max(W, H) / 5200
      };
      st.good = [EI['M-R'], EI['R-V1'], EI['V1-T3'], EI['T3-O3']];

      function route() {
        const v = ['V0', 'V1', 'V2'][Math.floor(R() * 3)];
        const ts = VT[v];
        const t = ts[Math.floor(R() * ts.length)];
        return [EI['M-R'], EI['R-' + v], EI[v + '-T' + t], EI['T' + t + '-O' + t]];
      }

      st.newHot = function (h) {
        let c;
        do { c = Math.floor(R() * E.length); } while (st.good.indexOf(c) > -1);
        h.e = c; h.s = 0.3 + R() * 0.4; h.age = 0; h.life = 2200 + R() * 2600;
        return h;
      };
      st.bursts = [];
      st.hot = mode === 'fog' ? [0, 1, 2].map(() => { const h = st.newHot({}); h.age = R() * h.life; return h; }) : [];
      st.spawn = function (p, warm) {
        p.good = mode === 'fog' && R() < 0.34;
        p.r = p.good ? st.good.slice() : route();
        p.k = 0; p.s = warm ? R() : 0; p.sp = 0.7 + R() * 0.6; p.q = R(); p.st = 'go'; p.life = 0;
        p.pass = mode === 'clot' ? R() < 0.18 : mode === 'loop' ? R() < 0.2 : mode === 'one' ? R() < 0.12 : mode === 'scatter' ? R() < 0.14 : mode === 'stall' ? R() < 0.1 : mode === 'astray' ? R() < 0.12 : true;
        p.derail = mode === 'fog' && !p.good && R() < 0.75;
        p.dk = 1 + Math.floor(R() * 3);
        p.ds = 0.15 + R() * 0.7;
        if (warm) p.k = Math.floor(R() * 4);
      };

      for (let j = 0; j < 150; j++) { const p = {}; st.spawn(p, true); st.ps.push(p); }
      for (let w = 0; w < 260; w++) flowStep(st, 33);
      return st;
    }

    function flowStep(st, dt) {
      st.clk += dt;
      const R = st.R, E = st.E, m = st.mode;
      st.hot.forEach((h) => { h.age += dt; if (h.age > h.life) st.newHot(h); });
      st.bursts.forEach((b) => { b.age += dt; });
      st.bursts = st.bursts.filter((b) => b.age < b.life);

      st.ps.forEach((p) => {
        if (p.st === 'off') {
          p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.992; p.vy = p.vy * 0.992 + (p.g || 0) * dt; p.life -= dt;
          if (p.life < 0) st.spawn(p);
          return;
        }
        if (p.st === 'stuck' || p.st === 'orbit') {
          p.life -= dt;
          if (p.st === 'orbit') p.ang += dt * 0.0024 * p.sp;
          if (p.life < 0) {
            if (m === 'one' && p.st === 'orbit' && R() < 0.42) {
              const c = st.P(st.N.R[0], st.N.R[1]), rr = (16 + p.q * 38) * st.sc;
              const x = c[0] + Math.cos(p.ang) * rr, y = c[1] + Math.sin(p.ang) * rr * 0.8;
              const ox = Math.cos(p.ang), oy = Math.sin(p.ang);
              p.st = 'off'; p.x = x; p.y = y;
              if (R() < 0.5) {
                p.vx = ox * st.speed * 0.5; p.vy = oy * st.speed * 0.3 - st.speed * 0.2; p.g = st.speed * 0.0016; p.life = p.L0 = 1400 + R() * 900;
              } else {
                st.bursts.push({ x, y, age: 0, life: 650 });
                p.vx = ox * st.speed * 1.6; p.vy = oy * st.speed * 1.6; p.g = 0; p.life = p.L0 = 320 + R() * 220;
              }
              return;
            }
            st.spawn(p);
          }
          return;
        }
        const e = E[p.r[p.k]];
        let mult = 1;
        const s0 = p.s;
        if (m === 'one' && p.k === 0) mult = 1 - 0.35 * p.s;
        p.s += dt * st.speed * p.sp * mult / e.len;

        if (m === 'fog' && !p.good) {
          if (p.derail && p.k === p.dk && p.s >= p.ds) {
            const a = st.at(e, p.s), b = st.at(e, Math.min(1, p.s + 0.03));
            const dx = b[0] - a[0], dy = b[1] - a[1];
            const an = Math.atan2(dy, dx) + (R() < 0.5 ? -1 : 1) * (0.55 + R() * 0.9);
            const v = st.speed * p.sp * 1.1;
            p.st = 'off'; p.x = a[0]; p.y = a[1]; p.vx = Math.cos(an) * v; p.vy = Math.sin(an) * v; p.life = p.L0 = 900 + R() * 1100;
            return;
          }
          for (let hi = 0; hi < st.hot.length; hi++) {
            const h = st.hot[hi];
            if (p.r[p.k] === h.e && s0 < h.s && p.s >= h.s && R() < 0.75) {
              p.s = h.s - p.q * 0.05; p.st = 'stuck'; p.life = 700 + R() * 1500;
              return;
            }
          }
        }
        if (m === 'stall' && p.k === 2 && !p.pass) {
          const sp2 = st.stallS - p.q * 0.18;
          if (p.s >= sp2) { p.s = sp2; p.st = 'stuck'; p.life = 1600 + R() * 3000; return; }
        }
        if (m === 'clot' && p.k === 0 && !p.pass) {
          const stop = st.clotS - p.q * 0.16;
          if (p.s >= stop) { p.s = stop; p.st = 'stuck'; p.life = 1500 + R() * 3500; return; }
        }
        if (p.s >= 1) {
          p.s = 0; p.k++;
          if (m === 'one' && p.k === 1 && !p.pass) { p.st = 'orbit'; p.ang = R() * 6.28; p.life = 2200 + R() * 3200; p.c = 'R'; return; }
          if (m === 'astray' && p.k === 2 && !p.pass) {
            const nk = E[p.r[1]].b, nd = st.N[nk], dv = nk === 'V0' ? -1 : nk === 'V2' ? 1 : -0.55;
            const a0 = st.P(nd[0], nd[1]), a1 = st.P(nd[0] + 0.025, nd[1] + dv * 0.05);
            const ang = Math.atan2(a1[1] - a0[1], a1[0] - a0[0]) + (p.q - 0.5) * 0.07;
            const v3 = st.speed * p.sp * 1.15;
            p.st = 'off'; p.x = a0[0]; p.y = a0[1]; p.vx = Math.cos(ang) * v3; p.vy = Math.sin(ang) * v3; p.g = 0; p.life = p.L0 = 2600 + R() * 900;
            return;
          }
          if (m === 'scatter' && p.k === 2 && !p.pass) {
            const c0 = st.P(st.N[E[p.r[1]].b][0], st.N[E[p.r[1]].b][1]);
            const an2 = R() * 6.283, v2 = st.speed * (0.18 + R() * 0.32);
            p.st = 'off'; p.x = c0[0] + Math.cos(an2) * 6 * st.sc; p.y = c0[1] + Math.sin(an2) * 6 * st.sc;
            p.vx = Math.cos(an2) * v2; p.vy = Math.sin(an2) * v2; p.g = 0; p.life = p.L0 = 1500 + R() * 1600;
            return;
          }
          if (m === 'loop' && p.k === 2 && !p.pass) { p.st = 'orbit'; p.ang = R() * 6.28; p.life = 2500 + R() * 3000; p.c = E[p.r[1]].b; return; }
          if (p.k >= p.r.length) st.spawn(p);
        }
      });
    }

    function flow(cx, W, H, t, st) {
      const dt = st.last == null ? 0 : Math.min(80, Math.max(0, t - st.last));
      st.last = t;
      if (dt) flowStep(st, dt);
      cx.clearRect(0, 0, W, H);
      const sc = st.sc, m = st.mode, E = st.E, N = st.N, P = st.P, pul = 0.5 + 0.5 * Math.sin(st.clk * 0.003);
      function np(k) { return P(N[k][0], N[k][1]); }

      if (m === 'clot') { const c = st.at(E[0], st.clotS); glow(cx, c[0], c[1], 140 * sc * (1 + 0.08 * pul), RED, 0.18); }
      if (m === 'loop') { const v = np('V1'); glow(cx, v[0], v[1], 260 * sc, RED, 0.10); }
      if (m === 'one') { const r = np('R'); glow(cx, r[0], r[1], 240 * sc * (1 + 0.1 * pul), RED, 0.17); }
      if (m === 'fog') { st.hot.forEach((h) => { const q = st.at(E[h.e], h.s), k = Math.sin(Math.PI * Math.min(1, h.age / h.life)); glow(cx, q[0], q[1], 130 * sc, RED, 0.13 * k); }); }
      if (m === 'free') { const f = np('V1'); glow(cx, f[0], f[1], 260 * sc, RED, 0.06); }
      if (m === 'astray') { ['V0', 'V1', 'V2'].forEach((k) => { const v = np(k); glow(cx, v[0], v[1], 120 * sc, RED, 0.07); }); }
      if (m === 'scatter') { ['V0', 'V1', 'V2'].forEach((k) => { const v = np(k); glow(cx, v[0], v[1], 150 * sc * (1 + 0.08 * pul), RED, 0.09); }); }
      if (m === 'stall') { const sv = st.at(E[st.EI['V1-T3']], st.stallS); glow(cx, sv[0], sv[1], 300 * sc * (1 + 0.06 * pul), RED, 0.11); }

      function weak(e) {
        if (m === 'clot') return e !== E[0];
        if (m === 'loop') return e.a.charAt(0) === 'V' || e.a.charAt(0) === 'T';
        if (m === 'one') return e !== E[0];
        if (m === 'scatter') return e.a.charAt(0) === 'V' || e.a.charAt(0) === 'T';
        if (m === 'stall') return e.a.charAt(0) === 'T';
        if (m === 'astray') return e.a.charAt(0) === 'V' || e.a.charAt(0) === 'T';
        return false;
      }

      cx.lineCap = 'round';
      E.forEach((e, ei) => {
        const wk = weak(e), thick = (m === 'one' && e === E[0]) || (m === 'fog' && st.good.indexOf(ei) > -1);
        cx.strokeStyle = 'rgba(' + CREAM + ',' + (wk ? 0.08 : thick ? 0.3 : 0.2) + ')';
        cx.lineWidth = (thick ? 2.4 : 1) * Math.max(1, sc * 0.9);
        cx.beginPath();
        e.pts.forEach((p, i) => (i ? cx.lineTo(p[0], p[1]) : cx.moveTo(p[0], p[1])));
        cx.stroke();
      });

      if (m === 'clot') {
        cx.strokeStyle = 'rgba(' + RED + ',0.35)';
        cx.lineWidth = 2.4 * sc;
        cx.beginPath();
        const e0 = E[0];
        for (let i = 0; i <= 24 * st.clotS; i++) {
          const p = e0.pts[i];
          i ? cx.lineTo(p[0], p[1]) : cx.moveTo(p[0], p[1]);
        }
        cx.stroke();
      }

      Object.keys(N).forEach((k) => {
        if (k.charAt(0) === 'O') return;
        const p = np(k), r = (k === 'M' || k === 'R' ? 4.2 : 3.2) * sc;
        const dim = (m === 'clot' && k !== 'M') || ((m === 'loop' || m === 'scatter' || m === 'stall' || m === 'astray') && k.charAt(0) === 'T') || (m === 'one' && k !== 'M' && k !== 'R');
        cx.fillStyle = '#070505';
        cx.strokeStyle = 'rgba(' + CREAM + ',' + (dim ? 0.18 : 0.5) + ')';
        cx.lineWidth = 1.2;
        cx.beginPath();
        cx.arc(p[0], p[1], r, 0, 6.283);
        cx.fill();
        cx.stroke();
      });

      cx.save();
      cx.globalCompositeOperation = 'lighter';
      st.ps.forEach((p) => {
        let pos;
        const e = E[p.r[p.k]];
        if (p.st === 'off') {
          pos = [p.x, p.y];
        } else if (p.st === 'orbit') {
          const c = np(p.c), rr = (m === 'one' ? 16 + p.q * 38 : 14 + p.q * 16) * sc;
          pos = [c[0] + Math.cos(p.ang) * rr, c[1] + Math.sin(p.ang) * rr * 0.8];
        } else {
          if (!e) return;
          pos = st.at(e, p.s);
          if (p.st === 'stuck') {
            pos = [pos[0] + Math.sin(st.clk * 0.01 + p.q * 50) * 1.2 * sc, pos[1] + Math.cos(st.clk * 0.012 + p.q * 30) * 1.2 * sc];
          }
        }
        const down = (m === 'clot' && p.k > 0) || (m === 'loop' && p.k > 1 && p.st === 'go') || (m === 'one' && p.k > 0 && p.st === 'go') || (m === 'scatter' && p.k > 1 && p.st === 'go') || (m === 'stall' && p.k > 2 && p.st === 'go');
        const a = down ? 0.42 : p.st === 'off' ? (m === 'astray' ? 0.9 * Math.min(1, 2.2 * Math.max(0, p.life / p.L0)) : 0.85 * Math.max(0, p.life / p.L0)) : 0.9;
        if (p.st === 'off') {
          const vl = Math.hypot(p.vx, p.vy) || 1, tl = (m === 'astray' ? 34 : 18) * sc;
          cx.strokeStyle = 'rgba(' + RED_L + ',' + (a * (m === 'astray' ? 0.55 : 0.35)).toFixed(3) + ')';
          cx.lineWidth = 1.2 * sc;
          cx.beginPath();
          cx.moveTo(pos[0], pos[1]);
          cx.lineTo(pos[0] - (p.vx / vl) * tl, pos[1] - (p.vy / vl) * tl);
          cx.stroke();
        }
        cx.fillStyle = 'rgba(' + RED + ',' + (a * 0.16).toFixed(3) + ')';
        cx.beginPath();
        cx.arc(pos[0], pos[1], 5.5 * sc, 0, 6.283);
        cx.fill();
        cx.strokeStyle = 'rgba(' + RED_L + ',' + a.toFixed(3) + ')';
        cx.beginPath();
        cx.arc(pos[0], pos[1], 1.6 * sc, 0, 6.283);
        cx.fill();
      });
      cx.restore();

      st.bursts.forEach((b) => {
        const k = b.age / b.life, rr = (3 + 16 * k) * sc, a = (1 - k) * 0.5;
        cx.fillStyle = 'rgba(' + RED + ',' + a.toFixed(3) + ')';
        cx.lineWidth = 1;
        cx.beginPath();
        cx.arc(b.x, b.y, rr, 0, 6.283);
        cx.stroke();
        for (let j = 0; j < 4; j++) {
          const an = j * 1.571 + b.x * 0.01, r1 = rr * 0.6, r2 = rr * 1.25;
          cx.beginPath();
          cx.moveTo(b.x + Math.cos(an) * r1, b.y + Math.sin(an) * r1);
          cx.lineTo(b.x + Math.cos(an) * r2, b.y + Math.sin(an) * r2);
          cx.stroke();
        }
      });

      if (m === 'fog') {
        st.hot.forEach((h) => {
          const q = st.at(E[h.e], Math.min(1, h.s + 0.02)), k = Math.sin(Math.PI * Math.min(1, h.age / h.life));
          if (k < 0.05) return;
          cx.save();
          cx.globalAlpha = k;
          cx.shadowColor = 'rgba(' + RED + ',0.9)';
          cx.shadowBlur = 12 * sc;
          cx.fillStyle = '#120707';
          cx.strokeStyle = 'rgba(' + CREAM + ',0.5)';
          cx.lineWidth = 1.2;
          cx.beginPath();
          cx.arc(q[0], q[1], 4.5 * sc, 0, 6.283);
          cx.fill();
          cx.stroke();
          cx.restore();
        });
      }

      if (m === 'clot') {
        const c2 = st.at(E[0], st.clotS + 0.02);
        cx.save();
        cx.shadowColor = 'rgba(' + RED + ',0.9)';
        cx.shadowBlur = 18 * sc;
        cx.fillStyle = '#120707';
        cx.strokeStyle = 'rgba(' + CREAM + ',0.55)';
        cx.lineWidth = 1.4;
        cx.beginPath();
        cx.arc(c2[0], c2[1], 7 * sc, 0, 6.283);
        cx.fill();
        cx.stroke();
        cx.restore();
      }

      if (st.nl) return;
      cx.fillStyle = 'rgba(' + CREAM + ',0.5)';
      cx.font = Math.round(11 * Math.max(1, sc * 0.85)) + 'px "Geist Mono", ui-monospace, monospace';
      const q = m === 'one' ? ' ?' : '';
      const L = [['M', 'MAJITEL'], ['R', 'ŘEDITEL'], ['V2', 'VEDENÍ' + q], ['T5', 'TÝM' + q]];
      L.forEach((l) => {
        const p = np(l[0]);
        if (st.hz) {
          cx.textAlign = 'center';
          cx.fillText(l[1], p[0], p[1] + (m === 'one' && l[0] === 'R' ? -58 : l[0] === 'V2' ? 40 : 22) * sc);
        } else {
          cx.textAlign = 'left';
          cx.fillText(l[1], p[0] + (m === 'one' && l[0] === 'R' ? 62 : 14) * sc, p[1] + 4);
        }
      });
    }

    const LIB = { flow: { d: flow, p: flowPrep } };
    let items = [];

    function setup(cv) {
      const k = cv.dataset.viz, lib = LIB[k];
      if (!lib) return;
      const it = { cv, cx: cv.getContext('2d'), lib, W: 1, H: 1, s: null, on: true, t0: 4200 };
      function size() {
        const r = cv.getBoundingClientRect();
        const q = Math.min(window.devicePixelRatio || 1, 1.5);
        it.W = Math.max(2, Math.round(r.width * q));
        it.H = Math.max(2, Math.round(r.height * q));
        cv.width = it.W;
        cv.height = it.H;
        it.s = lib.p ? lib.p(it.W, it.H, cv) : null;
        it.lib.d(it.cx, it.W, it.H, it.t0, it.s);
      }
      it.size = size;
      if ('ResizeObserver' in window) new ResizeObserver(size).observe(cv);
      else window.addEventListener('resize', size);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver((es) => { it.on = es[0].isIntersecting; }, { threshold: 0.05 }).observe(cv);
      }
      size();
      items.push(it);
    }

    function scan() {
      document.querySelectorAll('canvas.viz').forEach((cv) => {
        if (cv.dataset.vizOn) return;
        cv.dataset.vizOn = '1';
        setup(cv);
      });
    }

    window.CoMViz = {
      scan,
      refresh(cv) {
        items.forEach((it) => { if (it.cv === cv) it.size(); });
      }
    };

    scan();
    if (reduceMotion) return;

    let last = 0;
    (function loop(t) {
      if (t - last > 33) {
        last = t;
        items = items.filter((it) => it.cv.isConnected);
        items.forEach((it) => {
          if (!it.on) return;
          it.t0 += 33;
          it.lib.d(it.cx, it.W, it.H, it.t0, it.s);
        });
      }
      requestAnimationFrame(loop);
    })(0);
  })();
});
