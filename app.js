/* ==========================================================================
   COURT OF MORAVIA — SCROLL TAKEOVER, INTERACTIONS & DODECAHEDRON SHADER
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  /* ------------------------------------------------------------------------
     1. FULL-VIEWPORT SCROLL TAKEOVER & CHROME SYNC
     ------------------------------------------------------------------------ */
  const track = document.getElementById('sections-track');
  const sections = Array.from(document.querySelectorAll('.lp-section'));
  const railLabelEl = document.getElementById('rail-section-name');
  const railNodes = Array.from(document.querySelectorAll('.rail-node'));
  const lastSectionEl = document.getElementById('opona');

  let activeSection = 0;
  let isLocked = false;
  let heroMixTarget = 1.0;

  function navigateTo(index) {
    const clamped = Math.max(0, Math.min(sections.length - 1, index));
    if (isLocked) return;

    isLocked = true;
    activeSection = clamped;
    heroMixTarget = activeSection === 0 ? 1.0 : 0.0;

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

  // Wheel navigation with internal scroll support on Section 8
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

  // Touch swipe navigation
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

  // Keyboard navigation
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

  // Direct navigation triggers
  document.querySelectorAll('[data-goto]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const idx = Number(btn.dataset.goto);
      if (!Number.isNaN(idx)) {
        navigateTo(idx);
      }
    });
  });

  // Footer down-arrow cue
  const nextCueBtn = document.getElementById('next-section-cue');
  if (nextCueBtn) {
    nextCueBtn.addEventListener('click', () => {
      navigateTo(activeSection + 1);
    });
  }

  /* ------------------------------------------------------------------------
     2. ACCORDIONS ("KDE VÁS TO NEJVÍC BOLÍ?")
     ------------------------------------------------------------------------ */
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

  /* ------------------------------------------------------------------------
     3. QUOTE CAROUSEL ("BOLEST VZNIKÁ, KDYŽ MOC FIRMOU NEPROUDÍ")
     ------------------------------------------------------------------------ */
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

  /* ------------------------------------------------------------------------
     4. CALLBACK FORM & FOCUS TRIGGER
     ------------------------------------------------------------------------ */
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

  /* ------------------------------------------------------------------------
     5. WEBGL2 3D DODECAHEDRON SHADER BACKGROUND
     ------------------------------------------------------------------------ */
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

        const float PHI = 1.61803398875;

        mat2 rot(float a) {
          float s = sin(a);
          float c = cos(a);
          return mat2(c, -s, s, c);
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
          return d - r;
        }

        float mapScene(vec3 p) {
          p.xz *= rot(u_time * 0.14);
          p.xy *= rot(u_time * 0.09);
          p.yz *= rot(sin(u_time * 0.12) * 0.35);
          return sdDodecahedron(p, 1.18);
        }

        vec3 calcNormal(vec3 p) {
          vec2 e = vec2(0.002, 0.0);
          return normalize(vec3(
            mapScene(p + e.xyy) - mapScene(p - e.xyy),
            mapScene(p + e.yxy) - mapScene(p - e.yxy),
            mapScene(p + e.yyx) - mapScene(p - e.yyx)
          ));
        }

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        void main() {
          vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);

          vec2 offset = mix(vec2(0.0, 0.0), vec2(0.22, 0.04), u_heroMix);
          vec3 ro = vec3(offset, 3.6);
          vec3 rd = normalize(vec3(uv - offset * 0.35, -1.45));

          float t = 0.0;
          float minDist = 100.0;
          bool hit = false;

          for (int i = 0; i < 64; i++) {
            vec3 p = ro + rd * t;
            float d = mapScene(p);
            minDist = min(minDist, d);
            if (d < 0.002) {
              hit = true;
              break;
            }
            if (t > 8.0) break;
            t += d * 0.85;
          }

          float aura = exp(-minDist * 2.4) * 0.55 + exp(-length(uv - offset * 0.5) * 1.4) * 0.25;

          vec3 heroRed = vec3(0.875, 0.090, 0.090);
          vec3 heroDeep = vec3(0.320, 0.025, 0.025);
          vec3 monoLight = vec3(0.24, 0.24, 0.24);
          vec3 monoDark = vec3(0.06, 0.06, 0.06);

          vec3 col = mix(monoDark, heroDeep, u_heroMix) * aura;

          if (hit) {
            vec3 p = ro + rd * t;
            vec3 n = calcNormal(p);
            vec3 lightDir1 = normalize(vec3(0.7, 0.8, 0.6));
            vec3 lightDir2 = normalize(vec3(-0.8, -0.4, 0.4));

            float diff1 = max(dot(n, lightDir1), 0.0);
            float diff2 = max(dot(n, lightDir2), 0.0);
            float fresnel = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
            float edge = clamp(fresnel * 1.15 + diff1 * 0.45, 0.0, 1.0);

            vec3 heroSurface = heroDeep * 0.6 + heroRed * (diff1 * 0.65 + fresnel * 0.85) + vec3(0.15, 0.02, 0.02) * diff2;
            vec3 monoSurface = monoDark * 0.5 + monoLight * (diff1 * 0.45 + fresnel * 0.65) + vec3(0.05) * diff2;

            col = mix(monoSurface, heroSurface, u_heroMix);
            col += mix(vec3(0.08), heroRed * 0.35, u_heroMix) * edge * 0.35;
          }

          float brightness = mix(0.42, 0.95, u_heroMix);
          col *= brightness;

          float grain = (hash(gl_FragCoord.xy + fract(u_time) * 100.0) - 0.5) * 0.025;
          col = max(col + grain, 0.0);

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

          let heroMixCurrent = 1.0;
          const startTime = performance.now();

          function resize() {
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            const w = Math.floor(window.innerWidth * dpr);
            const h = Math.floor(window.innerHeight * dpr);
            if (canvas.width !== w || canvas.height !== h) {
              canvas.width = w;
              canvas.height = h;
            }
          }

          resize();
          window.addEventListener('resize', resize);

          function render(now) {
            heroMixCurrent += (heroMixTarget - heroMixCurrent) * 0.08;

            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.useProgram(program);
            gl.enableVertexAttribArray(posLoc);
            gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

            gl.uniform1f(timeLoc, (now - startTime) * 0.001);
            gl.uniform2f(resLoc, canvas.width, canvas.height);
            gl.uniform1f(heroMixLoc, heroMixCurrent);

            gl.drawArrays(gl.TRIANGLES, 0, 6);
            requestAnimationFrame(render);
          }

          requestAnimationFrame(render);
        }
      }
    }
  }
});
