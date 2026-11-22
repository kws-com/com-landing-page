/* ==========================================================================
   COURT OF MORAVIA — SCROLL TAKEOVER, INTERACTIONS & 3D METALLIC DODECAHEDRON
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  /* ------------------------------------------------------------------------
     1. FULL-VIEWPORT SCROLL TAKEOVER & CHROME SYNC
     ------------------------------------------------------------------------ */
  const track = document.getElementById('sections-track');
  const sections = Array.from(document.querySelectorAll('.lp-section'));
  const railSectionName = document.getElementById('rail-section-name');
  const railDots = Array.from(document.querySelectorAll('.rail-dot'));

  let currentIndex = 0;
  let isAnimating = false;
  const LOCK_DURATION = 900;

  // Target 3D dodecahedron positions per section (easy-ease interpolated in render loop)
  const DODECA_POSES = [
    { x: 0.35,  y: 0.45,  z: 0.0,  scale: 1.55, rotSpeed: 0.0025 }, // 0: Hero (Red glow top-center)
    { x: -1.15, y: 0.15,  z: -0.6, scale: 1.25, rotSpeed: 0.0014 }, // 1: Bolest
    { x: 0.95,  y: -0.25, z: -0.8, scale: 1.15, rotSpeed: 0.0012 }, // 2: Tok moci
    { x: -0.65, y: -0.35, z: -0.5, scale: 1.30, rotSpeed: 0.0015 }, // 3: Překážky
    { x: 1.10,  y: 0.30,  z: -0.7, scale: 1.20, rotSpeed: 0.0013 }, // 4: Vize
    { x: -0.85, y: 0.25,  z: -0.6, scale: 1.25, rotSpeed: 0.0014 }, // 5: Tři cesty
    { x: 0.75,  y: -0.15, z: -0.5, scale: 1.35, rotSpeed: 0.0016 }, // 6: Kontakt
    { x: 0.0,   y: -0.45, z: -1.0, scale: 1.10, rotSpeed: 0.0010 }  // 7: Tým
  ];

  let targetPose = { ...DODECA_POSES[0], isHero: 1.0 };

  function goToSection(index) {
    const clamped = Math.max(0, Math.min(sections.length - 1, index));
    if (clamped === currentIndex && !isAnimating) return;

    currentIndex = clamped;
    isAnimating = true;

    // Move track by exact 100dvh multiples
    track.style.transform = `translate3d(0, -${currentIndex * 100}dvh, 0)`;

    // Toggle Hero / Team body state classes for Topbar, Footer, Rails & Shader
    document.body.classList.toggle('is-hero', currentIndex === 0);
    document.body.classList.toggle('is-team', currentIndex === sections.length - 1);

    // Update left rail label & right rail dots (sections 1..6)
    const activeSection = sections[currentIndex];
    const railName = activeSection.dataset.railName || '';
    if (railName) {
      railSectionName.textContent = railName;
    }

    railDots.forEach((dot) => {
      const targetIdx = Number(dot.dataset.goto);
      dot.classList.toggle('is-active', targetIdx === currentIndex);
    });

    // Update 3D dodecahedron target state
    const pose = DODECA_POSES[currentIndex] || DODECA_POSES[1];
    targetPose = {
      ...pose,
      isHero: currentIndex === 0 ? 1.0 : 0.0
    };

    setTimeout(() => {
      isAnimating = false;
    }, LOCK_DURATION);
  }

  // Wheel navigation with trackpad delta threshold
  let wheelAccumulator = 0;
  let wheelResetTimer = null;

  window.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (isAnimating) return;

    wheelAccumulator += e.deltaY;
    clearTimeout(wheelResetTimer);
    wheelResetTimer = setTimeout(() => {
      wheelAccumulator = 0;
    }, 120);

    if (Math.abs(wheelAccumulator) > 35) {
      const direction = wheelAccumulator > 0 ? 1 : -1;
      wheelAccumulator = 0;
      goToSection(currentIndex + direction);
    }
  }, { passive: false });

  // Keyboard navigation
  window.addEventListener('keydown', (e) => {
    if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault();
      goToSection(currentIndex + 1);
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      goToSection(currentIndex - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      goToSection(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      goToSection(sections.length - 1);
    }
  });

  // Touch swipe navigation
  let touchStartY = 0;
  window.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('touchend', (e) => {
    if (isAnimating) return;
    const deltaY = touchStartY - e.changedTouches[0].clientY;
    if (Math.abs(deltaY) > 45) {
      goToSection(currentIndex + (deltaY > 0 ? 1 : -1));
    }
  }, { passive: true });

  // Direct navigation triggers (CTA pills, rail dots, footer links)
  document.querySelectorAll('[data-goto]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const targetIdx = Number(el.dataset.goto);
      if (!Number.isNaN(targetIdx)) {
        goToSection(targetIdx);
      }
    });
  });

  /* ------------------------------------------------------------------------
     2. ACCORDION INTERACTION ("KDE VÁS TO NEJVÍC BOLÍ?")
     ------------------------------------------------------------------------ */
  const accordionItems = Array.from(document.querySelectorAll('#pain-accordion .accordion-item'));

  accordionItems.forEach((item) => {
    const trigger = item.querySelector('.accordion-trigger');
    trigger.addEventListener('click', () => {
      const wasOpen = item.classList.contains('is-open');

      // Close all items in this section first
      accordionItems.forEach((other) => {
        other.classList.remove('is-open');
        other.querySelector('.accordion-trigger').setAttribute('aria-expanded', 'false');
      });

      // Toggle clicked item open if it wasn't already open
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
    '„Všechno nakonec skončí na mém stole, jinak se věci nepohnou.“',
    '„Na poradách strávíme hodiny, ale ven odchází každý s jiným zadáním.“',
    '„Máme skvělé lidi, ale mezi odděleními vázne důvěra a tah na branku.“'
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
    setTimeout(() => {
      quoteTextEl.textContent = QUOTES[quoteIndex];
      quoteTextEl.style.opacity = '1';
    }, 140);
    renderQuoteDots();
  }

  document.getElementById('quote-prev').addEventListener('click', () => setQuote(quoteIndex - 1));
  document.getElementById('quote-next').addEventListener('click', () => setQuote(quoteIndex + 1));
  renderQuoteDots();

  /* ------------------------------------------------------------------------
     4. LEAD FORM FEEDBACK
     ------------------------------------------------------------------------ */
  const leadForm = document.getElementById('lead-form');
  if (leadForm) {
    leadForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('lead-input');
      const submitBtn = document.getElementById('lead-submit');
      if (input.value.trim()) {
        submitBtn.textContent = 'ODESLÁNO ✓';
        input.value = '';
        setTimeout(() => {
          submitBtn.textContent = 'OZVĚTE SE MI';
        }, 3000);
      }
    });
  }

  /* ------------------------------------------------------------------------
     5. THREE.JS METALLIC ROUNDED DODECAHEDRON + DYNAMIC LIGHTING
     ------------------------------------------------------------------------ */
  const canvas = document.getElementById('dodecahedron-canvas');
  if (window.THREE && canvas) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 5.2;

    // Subdivided & spherically smoothed Dodecahedron for softly rounded metallic bevels
    const rawGeo = new THREE.DodecahedronGeometry(1.45, 2);
    const posAttr = rawGeo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < posAttr.count; i++) {
      v.fromBufferAttribute(posAttr, i);
      const len = v.length();
      // Blend faceted dodecahedron vertices toward sphere for soft rounded edges
      const roundedLen = THREE.MathUtils.lerp(len, 1.48, 0.38);
      v.normalize().multiplyScalar(roundedLen);
      posAttr.setXYZ(i, v.x, v.y, v.z);
    }
    rawGeo.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0x3a3a3a,
      metalness: 0.92,
      roughness: 0.24
    });

    const dodecaMesh = new THREE.Mesh(rawGeo, material);
    scene.add(dodecaMesh);

    // Key light: switches smoothly between crimson red (Hero) and faint white (Other sections)
    const keyLight = new THREE.PointLight(0xdf1717, 6.5, 18);
    keyLight.position.set(0.4, 2.2, 2.8);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0x910606, 3.5, 16);
    rimLight.position.set(-2.5, -1.5, 1.8);
    scene.add(rimLight);

    const ambientLight = new THREE.AmbientLight(0x141414, 0.7);
    scene.add(ambientLight);

    // Color interpolation targets
    const heroKeyColor = new THREE.Color(0xdf1717);
    const subKeyColor  = new THREE.Color(0xd8d8d8);
    const heroRimColor = new THREE.Color(0x910606);
    const subRimColor  = new THREE.Color(0x555555);

    const currentPose = { ...targetPose };

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    function animate() {
      requestAnimationFrame(animate);

      // Easy-ease interpolation of position, scale, and hero lighting blend
      const ease = 0.035;
      currentPose.x += (targetPose.x - currentPose.x) * ease;
      currentPose.y += (targetPose.y - currentPose.y) * ease;
      currentPose.z += (targetPose.z - currentPose.z) * ease;
      currentPose.scale += (targetPose.scale - currentPose.scale) * ease;
      currentPose.rotSpeed += (targetPose.rotSpeed - currentPose.rotSpeed) * ease;
      currentPose.isHero += (targetPose.isHero - currentPose.isHero) * ease;

      dodecaMesh.position.set(currentPose.x, currentPose.y, currentPose.z);
      dodecaMesh.scale.setScalar(currentPose.scale);

      dodecaMesh.rotation.x += currentPose.rotSpeed * 0.75;
      dodecaMesh.rotation.y += currentPose.rotSpeed;

      // Interpolate light colors and intensities between Hero (red) and Subsections (faint white)
      keyLight.color.lerpColors(subKeyColor, heroKeyColor, currentPose.isHero);
      rimLight.color.lerpColors(subRimColor, heroRimColor, currentPose.isHero);
      keyLight.intensity = THREE.MathUtils.lerp(1.6, 6.8, currentPose.isHero);
      rimLight.intensity = THREE.MathUtils.lerp(0.8, 3.5, currentPose.isHero);

      renderer.render(scene, camera);
    }

    animate();
  }
});
