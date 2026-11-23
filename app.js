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

  function navigateTo(index) {
    const clamped = Math.max(0, Math.min(sections.length - 1, index));
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

  window.addEventListener('wheel', (e) => {
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
    touchStartY = e.touches[0]?.clientY ?? null;
  }, { passive: true });

  window.addEventListener('touchend', (e) => {
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

  let quoteIndex = 0;
  const quoteTextEl = document.getElementById('quote-text');
  const quoteDotsEl = document.getElementById('quote-dots');

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
});
