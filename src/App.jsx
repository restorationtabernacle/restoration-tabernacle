import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

// ---------- 3D Hero: Dawn breaking over the cross ----------
function CrossScene({ onLightChange }) {
  const mountRef = useRef(null);
  const onLightChangeRef = useRef(onLightChange);
  onLightChangeRef.current = onLightChange;

    useEffect(() => {
    const mount = mountRef.current;
    const width = mount.clientWidth || mount.getBoundingClientRect().width || 300;
    const height = mount.clientHeight || mount.getBoundingClientRect().height || 300;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0.4, 8.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // ---- Ground / horizon plane, catches the rising light ----
    const groundGeo = new THREE.PlaneGeometry(40, 40, 1, 1);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x0d0a08, roughness: 1, metalness: 0 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2.6;
    scene.add(ground);

    // ---- Sky dome, a large sphere we shade via a shader-driven gradient using vertex colors ----
    const skyGeo = new THREE.SphereGeometry(30, 32, 32);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x05070f) },
        bottomColor: { value: new THREE.Color(0x140d08) },
        offset: { value: 4 },
        exponent: { value: 0.7 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide,
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);

    // ---- Sun: rises from one side of the horizon, arcs up, holds at midday height ----
    const sunGeo = new THREE.CircleGeometry(1.1, 48);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.95 });
    const sun = new THREE.Mesh(sunGeo, sunMat);
    sun.position.set(0, -3.2, -6);
    scene.add(sun);

    // Sun halo (soft glow disc, larger and dimmer, behind the sun)
    const haloGeo = new THREE.CircleGeometry(2.6, 48);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xffb066, transparent: true, opacity: 0.25 });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.set(0, -3.2, -6.2);
    scene.add(halo);

    const sunLight = new THREE.PointLight(0xffd9a0, 0, 30);
    sunLight.position.copy(sun.position);
    scene.add(sunLight);

    const ambient = new THREE.AmbientLight(0x1a1512, 0.4);
    scene.add(ambient);

    const rim = new THREE.PointLight(0x3a4a6b, 0.5, 20);
    rim.position.set(-4, 2, 3);
    scene.add(rim);

    // ---- Cross: rough-hewn, asymmetric timber look ----
    const crossGroup = new THREE.Group();
    scene.add(crossGroup);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x2b1e14, roughness: 0.95, metalness: 0.02 });

    function timberBox(w, h, d) {
      const geo = new THREE.BoxGeometry(w, h, d, 2, 2, 2);
      // slightly jitter vertices for a hand-hewn, imperfect look
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        pos.setXYZ(
          i,
          x + (Math.random() - 0.5) * 0.025,
          y,
          z + (Math.random() - 0.5) * 0.025
        );
      }
      geo.computeVertexNormals();
      return geo;
    }

    const upright = new THREE.Mesh(timberBox(0.5, 4.2, 0.4), woodMat);
    upright.position.set(0, -0.3, 0);
    crossGroup.add(upright);

    const crossbar = new THREE.Mesh(timberBox(2.4, 0.46, 0.4), woodMat);
    crossbar.position.set(0, 1.15, 0);
    crossGroup.add(crossbar);

    crossGroup.position.set(0, -1.1, -1.5);

    // ---- Birds: a few simple V-shapes drifting across the dawn sky ----
    const birdMat = new THREE.MeshBasicMaterial({ color: 0x1a1310, side: THREE.DoubleSide });
    function makeBird() {
      const shape = new THREE.Shape();
      shape.moveTo(-0.25, 0);
      shape.quadraticCurveTo(-0.1, 0.08, 0, 0);
      shape.quadraticCurveTo(0.1, 0.08, 0.25, 0);
      shape.quadraticCurveTo(0.1, 0.02, 0, 0.02);
      shape.quadraticCurveTo(-0.1, 0.02, -0.25, 0);
      const geo = new THREE.ShapeGeometry(shape);
      return new THREE.Mesh(geo, birdMat);
    }
    const birds = [];
    for (let i = 0; i < 5; i++) {
      const bird = makeBird();
      bird.position.set((Math.random() - 0.5) * 10, 2 + Math.random() * 2, -4 + Math.random() * 2);
      bird.scale.setScalar(0.5 + Math.random() * 0.4);
      scene.add(bird);
      birds.push({ mesh: bird, speed: 0.15 + Math.random() * 0.1, phase: Math.random() * 10 });
    }

    // ---- Drifting dust/light particles, catch the sunlight as it rises ----
    const particleCount = 140;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSeeds = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 9;
      particlePositions[i * 3 + 1] = Math.random() * 5 - 2;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 5 + 0.5;
      particleSeeds[i] = Math.random() * 10;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xffcf8a,
      size: 0.025,
      transparent: true,
      opacity: 0,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // ---- Ground fog: a soft plane hugging the horizon that thins as dawn rises ----
    const fogGeo = new THREE.PlaneGeometry(20, 3);
    const fogMat = new THREE.MeshBasicMaterial({ color: 0x2a2018, transparent: true, opacity: 0.35 });
    const fog = new THREE.Mesh(fogGeo, fogMat);
    fog.position.set(0, -1.6, -3);
    scene.add(fog);

    // ---- Animation: darkness to dawn, once, then holds at day ----
    // 0.00-1.00 dawn breaking immediately (sun rises, sky warms, light floods cross)
    // then holds at full day indefinitely (no fade back)
    const RISE_SECONDS = 8;
    let frameId;
    let startTime = performance.now();

    const skyTop = new THREE.Color();
    const skyBottom = new THREE.Color();
    const nightTop = new THREE.Color(0x05070f);
    const nightBottom = new THREE.Color(0x120c09);
    const dawnTop = new THREE.Color(0x2c3a5c);
    const dawnBottom = new THREE.Color(0xd97a3d);
    const dayTop = new THREE.Color(0x6fa3c9);
    const dayBottom = new THREE.Color(0xf3caa0);

    function easeInOutSine(x) {
      return -(Math.cos(Math.PI * x) - 1) / 2;
    }

    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      const runT = Math.min(elapsed / RISE_SECONDS, 1);

      // Light rises from the very first frame, easing in and settling at full day.
      // Sine easing keeps a gentle, even pace throughout — no fast middle section.
      let lightAmount = easeInOutSine(runT); // 0 = night, 1 = full day, holds at 1 forever after

      if (onLightChangeRef.current) onLightChangeRef.current(lightAmount);

      // Sun travels along an arc: starts low on the left horizon, rises and
      // curves up and slightly rightward, slowing as it nears midday height,
      // then holds there (does not continue on to set).
      // arcT 0 = just below horizon on the left; arcT 1 = midday, upper-center.
      const arcT = lightAmount;
      const startAngleDeg = 205; // low, to the left of center, just under the horizon
      const endAngleDeg = 80; // up and to the right of straight overhead, midday position
      const angleDeg = startAngleDeg + (endAngleDeg - startAngleDeg) * arcT;
      const angleRad = (angleDeg * Math.PI) / 180;
      const arcRadius = 6.4;
      const sunX = Math.cos(angleRad) * arcRadius;
      const sunY = Math.sin(angleRad) * arcRadius - 1.6;
      sun.position.x = sunX;
      sun.position.y = sunY;
      halo.position.x = sunX;
      halo.position.y = sunY;
      sunLight.position.x = sunX;
      sunLight.position.y = sunY;
      sunLight.intensity = lightAmount * 3.5;
      halo.material.opacity = 0.15 + lightAmount * 0.35;
      sun.material.opacity = 0.7 + lightAmount * 0.3;

      // sky gradient interpolation: night -> dawn -> day
      if (lightAmount < 0.5) {
        const t = lightAmount * 2;
        skyTop.copy(nightTop).lerp(dawnTop, t);
        skyBottom.copy(nightBottom).lerp(dawnBottom, t);
      } else {
        const t = (lightAmount - 0.5) * 2;
        skyTop.copy(dawnTop).lerp(dayTop, t);
        skyBottom.copy(dawnBottom).lerp(dayBottom, t);
      }
      skyMat.uniforms.topColor.value.copy(skyTop);
      skyMat.uniforms.bottomColor.value.copy(skyBottom);

      ambient.intensity = 0.15 + lightAmount * 0.55;
      rim.intensity = 0.5 - lightAmount * 0.3;

      // wood cross catches warm light as day breaks
      woodMat.color.setRGB(
        0.17 + lightAmount * 0.25,
        0.12 + lightAmount * 0.15,
        0.08 + lightAmount * 0.08
      );
      woodMat.roughness = 0.95 - lightAmount * 0.15;

      // ground brightens slightly with dawn
      groundMat.color.setRGB(0.05 + lightAmount * 0.06, 0.04 + lightAmount * 0.045, 0.03 + lightAmount * 0.03);

      // fog thins as light grows
      fog.material.opacity = 0.35 * (1 - lightAmount * 0.7);

      // particles fade in with the light, catching the glow
      particleMat.opacity = lightAmount * 0.55;
      particles.rotation.y = elapsed * 0.015;
      const posAttr = particleGeo.attributes.position;
      for (let i = 0; i < particleCount; i++) {
        const seed = particleSeeds[i];
        const baseY = posAttr.getY(i);
        posAttr.setY(i, baseY + Math.sin(elapsed * 0.3 + seed) * 0.0008);
      }
      posAttr.needsUpdate = true;

      // birds drift across, only really visible once there's light to see them by
      birds.forEach((b) => {
        b.mesh.position.x += b.speed * 0.016;
        if (b.mesh.position.x > 6) b.mesh.position.x = -6;
        b.mesh.position.y += Math.sin(elapsed * 1.5 + b.phase) * 0.0015;
        b.mesh.material.opacity = lightAmount * 0.8;
        b.mesh.material.transparent = true;
      });

      // gentle sway of the cross itself, like standing on quiet ground
      crossGroup.rotation.y = Math.sin(elapsed * 0.12) * 0.06;

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

        const handleResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(mount);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);


  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
}


// ---------- Logo mark (cross, wheat, open circle) ----------
function LogoMark({ size = 40, color = '#c9853d' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* open circle, broken where the cross crosses it */}
      <path
        d="M 100 40
           A 60 60 0 1 1 99 40"
        stroke={color}
        strokeWidth="7"
        fill="none"
        strokeLinecap="round"
      />
      {/* wheat sheaf, stylized as a curved stem with alternating leaf strokes */}
      <g stroke={color} strokeWidth="0" fill={color}>
        <path d="M 60 150 C 55 140, 52 128, 55 116 C 58 104, 66 94, 76 88
                 C 70 96, 66 106, 65 118 C 64 130, 66 142, 72 152 Z" />
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const t = i / 5;
          const y = 148 - t * 62;
          const x = 62 - t * 8;
          const len = 14 - t * 4;
          const angle = -35 - t * 15;
          const rad = (angle * Math.PI) / 180;
          const x2 = x + Math.cos(rad) * len;
          const y2 = y + Math.sin(rad) * len;
          return (
            <ellipse
              key={i}
              cx={(x + x2) / 2}
              cy={(y + y2) / 2}
              rx={len / 2}
              ry="4.2"
              transform={`rotate(${angle} ${(x + x2) / 2} ${(y + y2) / 2})`}
            />
          );
        })}
      </g>
      {/* cross */}
      <path
        d="M 88 30 H 112 V 55 H 132 V 78 H 112 V 158 
           L 100 170 L 88 158 V 78 H 68 V 55 H 88 Z"
        fill={color}
      />
    </svg>
  );
}

// ---------- Data ----------
const SERVICES = [
  { id: 'sun-morning', day: 'Sunday', label: 'Sunday Morning Service', time: '10:30 AM – 1:30 PM', tone: '', capacity: '' },
  { id: 'sun-evening', day: 'Sunday', label: 'Sunday Evening Service', time: '3:00 PM – 6:00 PM', tone: '', capacity: '' },
  { id: 'tuesday-prayer', day: 'Tuesday', label: 'Prayer Meeting', time: '5:30 PM – 6:30 PM', tone: '', capacity: '' },
  { id: 'midweek', day: 'Wednesday', label: 'Midweek Meeting', time: '6:30 PM – 8:30 PM', tone: '', capacity: '' },
  { id: 'lords-supper', day: 'Last Friday', label: "Lord's Supper", time: '5:00 PM', tone: 'Held on the last Friday of every month', capacity: '' },
];

// ---------- Small components ----------
function ServicePlanner() {
  const [day, setDay] = useState('Any day');
  const days = ['Any day', ...Array.from(new Set(SERVICES.map((s) => s.day)))];

  const filtered = day === 'Any day' ? SERVICES : SERVICES.filter((s) => s.day === day);

  return (
    <div style={styles.plannerCard}>
      <div style={styles.plannerHeader}>
        <span style={styles.eyebrow}>Our Service Days</span>
        <h2 style={styles.sectionTitle}>Join one of our gatherings</h2>
      </div>
      <div style={styles.dayToggle}>
        {days.map((d) => (
          <button
            key={d}
            onClick={() => setDay(d)}
            style={{
              ...styles.dayButton,
              ...(day === d ? styles.dayButtonActive : {}),
            }}
          >
            {d}
          </button>
        ))}
      </div>
      <div style={styles.serviceList}>
        {filtered.map((s) => (
          <div key={s.id} style={styles.serviceRow} className="rt-service-row">
            <div style={styles.serviceTime} className="rt-service-time">
              <span style={styles.serviceTimeNum}>{s.time}</span>
              <span style={styles.serviceDay}>{s.day}</span>
            </div>
            <div style={styles.serviceInfo} className="rt-service-info">
              <div style={styles.serviceLabel}>{s.label}</div>
              {s.tone && <div style={styles.serviceTone}>{s.tone}</div>}
            </div>
            {s.capacity && <div style={styles.serviceCapacity}>{s.capacity}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

const YOUTUBE_CHANNEL_URL = 'https://youtube.com/@restorationtabernacleleeds01';

function MediaLibrary() {
  return (
    <div style={styles.mediaSimple}>
      <span style={styles.eyebrow}>Watch and listen</span>
      <h2 style={styles.sectionTitle}>Sermon Recordings</h2>
      <p style={styles.sectionLead}>
        All our sermons and worship recordings live on our YouTube channel.
      </p>
      <a
        href={YOUTUBE_CHANNEL_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={styles.youtubeButton}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
          <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z" />
        </svg>
        Visit our YouTube channel
      </a>
    </div>
  );
}

const ENQUIRY_RECIPIENTS = ['abraham@restorationtabernacle.co.uk', 'restoration.tabernacle@outlook.com'];

function VisitForm() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setError('Add your name and email so we know who to expect.');
      return;
    }
    if (!form.email.includes('@')) {
      setError('That email looks incomplete — check it and try again.');
      return;
    }
    setError('');

    // This is a static site with no backend, so there's nowhere to actually
    // deliver the message server-side. Opening a pre-filled mailto: link is
    // the honest way to get it to both addresses without a form-handling
    // service — it hands off to the visitor's own default mail app to send.
    const subjectLine = form.subject.trim() || `Website enquiry from ${form.name}`;
    const bodyText = `Name: ${form.name}\nEmail: ${form.email}\n\nMessage:\n${form.message}`;
    const to = ENQUIRY_RECIPIENTS.join(',');
    const mailtoUrl = `mailto:${to}?subject=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(bodyText)}`;

    // Using window.location.href to trigger a mailto: link is unreliable —
    // many browsers (and sandboxed/iframe contexts especially) silently
    // block script-driven top-level navigation. Creating a real anchor and
    // dispatching a click on it is treated as much closer to genuine user
    // navigation, so it opens the default mail app reliably.
    const link = document.createElement('a');
    link.href = mailtoUrl;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div style={styles.confirmCard}>
        <div style={styles.confirmIcon}>✓</div>
        <h3 style={styles.confirmTitle}>Thanks, {form.name.split(' ')[0]}.</h3>
        <p style={styles.confirmText}>
          Your email app should now be open with your message ready to send.
          If it didn't open, you can reach us directly at{' '}
          {ENQUIRY_RECIPIENTS.join(' or ')}.
        </p>
        <button style={styles.confirmReset} onClick={() => setSubmitted(false)}>
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.formRow}>
        <label style={styles.label}>
          Name
          <input
            style={styles.input}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Your name"
          />
        </label>
        <label style={styles.label}>
          Email
          <input
            style={styles.input}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@email.com"
          />
        </label>
      </div>
      <label style={styles.label}>
        Subject
        <input
          style={styles.input}
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          placeholder="What's this about?"
        />
      </label>
      <label style={styles.label}>
        Message
        <textarea
          style={{ ...styles.input, minHeight: '72px', resize: 'vertical' }}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
        />
      </label>
      {error && <div style={styles.formError}>{error}</div>}
      <button type="submit" style={styles.submitButton}>
        Send
      </button>
    </form>
  );
}

// ---------- Responsive styles (real media queries) ----------
function ResponsiveStyles() {
  return (
    <style>{`
      html, body { overflow-x: hidden; max-width: 100%; }
      * { box-sizing: border-box; }
      section[id] { scroll-margin-top: 84px; }
      @keyframes rt-blink { 0%, 50% { opacity: 1; } 50.01%, 100% { opacity: 0; } }
      .rt-header { padding: 1.4rem 2rem; }
      .rt-nav-desktop { display: flex; gap: 2rem; }
      .rt-nav-toggle { display: none; }
      .rt-form-row { flex-wrap: wrap; }
      @media (max-width: 720px) {
        .rt-header { padding: 1rem 1.2rem; }
        .rt-nav-desktop { display: none; }
        .rt-nav-toggle { display: flex; }
        .rt-logo-text { font-size: 0.92rem; }
        .rt-section { padding: 3.2rem 1.2rem; }
        .rt-hero-scene { width: 88vw !important; height: 56vh !important; }
        .rt-service-row { flex-direction: column; align-items: center; text-align: center; gap: 0.5rem; }
        .rt-service-row .rt-service-time { align-items: center; }
        .rt-service-row .rt-service-info { flex: none; width: 100%; }
      }
    `}</style>
  );
}

// ---------- Reliable same-page section scrolling ----------
// Uses the native scrollIntoView so the browser resolves whichever element
// is actually scrollable (window, or a nested scroll container in an
// embedded/sandboxed context) rather than assuming it's always the window.
function scrollToSection(id) {
  return (e) => {
    if (e) e.preventDefault();
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
}

// ---------- Color interpolation helper ----------
function mixColor(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}
function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

// ---------- Location / map ----------
const CHURCH_UNIT = 'Unit A6-A8';
const CHURCH_ADDRESS = 'Unit A6-A8, St Catherines Business Complex, Broad Ln, Bramley, Leeds LS13 2TD, United Kingdom';
// Google's embed geocoder resolves the complex + street + postcode reliably;
// the specific unit number often isn't in its index as a distinct point, so
// keep the map query to the part it can pin, and show the unit as text.
const CHURCH_MAP_QUERY = 'St Catherines Business Complex, Broad Ln, Bramley, Leeds LS13 2TD';

function LocationMap() {
  const [mapFailed, setMapFailed] = useState(false);
  const encodedMapQuery = encodeURIComponent(CHURCH_MAP_QUERY);
  const encodedFullAddress = encodeURIComponent(CHURCH_ADDRESS);
  const embedUrl = `https://maps.google.com/maps?q=${encodedMapQuery}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedFullAddress}`;

  return (
    <div>
      <span style={styles.eyebrow}>Find us</span>
      <h2 style={styles.sectionTitle}>Come see us in person</h2>
      <p style={styles.sectionLead}>
        {CHURCH_UNIT}, St Catherines Business Complex
        <br />
        Broad Ln, Bramley, Leeds LS13 2TD, United Kingdom
      </p>
      <div style={styles.mapFrame}>
        {!mapFailed ? (
          <iframe
            title="Restoration Tabernacle location"
            src={embedUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            onError={() => setMapFailed(true)}
          />
        ) : (
          <div style={styles.mapFallback}>
            <div style={styles.mapFallbackText}>
              Map preview isn't available here.
              <br />
              Use the button below to open it in Google Maps.
            </div>
          </div>
        )}
      </div>
      <p style={styles.mapNote}>
        Look for {CHURCH_UNIT} once you're on site — the map above points to the business complex entrance.
      </p>
      <a href={directionsUrl} target="_blank" rel="noopener noreferrer" style={styles.directionsButton}>
        Get directions
      </a>
    </div>
  );
}

// ---------- Typewriter quote cycler ----------
const HERO_QUOTES = [
  'It is the rising of the Sun.',
  'The first Light that ever struck the earth was God\u2019s spoken Word.',
  'It was not only S-u-n rising, it was the S-o-n had risen to bring Eternal Life.',
];

function TypewriterQuote({ quotes = HERO_QUOTES, typeSpeed = 32, holdMs = 3200, fadeMs = 700 }) {
  const [displayed, setDisplayed] = useState('');
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [phase, setPhase] = useState('typing'); // 'typing' | 'holding' | 'fadingOut' | 'fadingIn'

  useEffect(() => {
    const current = quotes[quoteIndex];
    let timeoutId;

    if (phase === 'typing') {
      if (displayed.length < current.length) {
        timeoutId = setTimeout(() => {
          setDisplayed(current.slice(0, displayed.length + 1));
        }, typeSpeed);
      } else if (quotes.length > 1) {
        timeoutId = setTimeout(() => setPhase('holding'), holdMs);
      }
      // single quote: finish typing and simply stay, no cycling needed
    } else if (phase === 'holding') {
      timeoutId = setTimeout(() => setPhase('fadingOut'), 10);
    } else if (phase === 'fadingOut') {
      // wait for the CSS fade-out to finish, then swap text while invisible
      timeoutId = setTimeout(() => {
        setQuoteIndex((i) => (i + 1) % quotes.length);
        setDisplayed('');
        setPhase('fadingIn');
      }, fadeMs);
    } else if (phase === 'fadingIn') {
      timeoutId = setTimeout(() => setPhase('typing'), fadeMs);
    }

    return () => clearTimeout(timeoutId);
  }, [displayed, phase, quoteIndex, quotes, typeSpeed, holdMs, fadeMs]);

  const isVisible = phase !== 'fadingOut';

  return (
    <span
      style={{
        whiteSpace: 'pre-wrap',
        display: 'inline-block',
        opacity: isVisible ? 1 : 0,
        transition: `opacity ${fadeMs}ms ease`,
      }}
    >
      {displayed}
      {phase === 'typing' && displayed.length < quotes[quoteIndex].length && (
        <span style={styles.typewriterCursor}>|</span>
      )}
    </span>
  );
}

// ---------- Main page ----------
export default function ChurchSite() {
  const [navOpen, setNavOpen] = useState(false);
  const [lightAmount, setLightAmount] = useState(0);

  return (
    <div style={styles.page}>
      <ResponsiveStyles />
      <header style={styles.header} className="rt-header">
        <div style={styles.logoGroup}>
          <LogoMark size={34} color="#c9853d" />
          <span style={styles.logo} className="rt-logo-text">
            <span style={styles.logoBold}>Restoration</span> Tabernacle
          </span>
        </div>
        <nav style={styles.navDesktop} className="rt-nav-desktop">
          <a href="#visit" style={styles.navLink} onClick={scrollToSection('visit')}>Our Service Days</a>
          <a href="#find-us" style={styles.navLink} onClick={scrollToSection('find-us')}>Find us</a>
          <a href="#media" style={styles.navLink} onClick={scrollToSection('media')}>Watch &amp; listen</a>
        </nav>
        <button style={styles.navToggle} className="rt-nav-toggle" onClick={() => setNavOpen(!navOpen)} aria-label="Toggle menu">
          {navOpen ? '✕' : '☰'}
        </button>
      </header>
      {navOpen && (
        <div style={styles.navMobile}>
          <a
            href="#visit"
            style={styles.navLinkMobile}
            onClick={(e) => {
              scrollToSection('visit')(e);
              setNavOpen(false);
            }}
          >
            Our Service Days
          </a>
          <a
            href="#find-us"
            style={styles.navLinkMobile}
            onClick={(e) => {
              scrollToSection('find-us')(e);
              setNavOpen(false);
            }}
          >
            Find us
          </a>
          <a
            href="#media"
            style={styles.navLinkMobile}
            onClick={(e) => {
              scrollToSection('media')(e);
              setNavOpen(false);
            }}
          >
            Watch &amp; listen
          </a>
        </div>
      )}

      <section style={styles.hero}>
        <div style={styles.heroGlow} />
        <div style={styles.heroScene} className="rt-hero-scene">
          <CrossScene onLightChange={setLightAmount} />
        </div>
        <div style={styles.heroText}>
          <LogoMark size={54} color="#f0e4d3" />
          <h1
            style={{
              ...styles.heroTitle,
              color: '#f9f1e2',
              textShadow: '0 2px 20px rgba(0,0,0,0.65)',
            }}
          >
            Come fellowship with us.
          </h1>
          <p
            style={{
              ...styles.heroSubtitle,
              color: '#ecd9b8',
              textShadow: '0 2px 14px rgba(0,0,0,0.6)',
              minHeight: '3em',
            }}
          >
            <TypewriterQuote />
          </p>
          <a
            href="#find-us"
            onClick={scrollToSection('find-us')}
            style={{
              ...styles.heroButton,
              background: mixColor('#c9853d', '#e0a35c', lightAmount),
              color: '#1a1410',
              transition: 'background 0.4s linear',
            }}
          >
            Connect with us
          </a>
        </div>
      </section>

      <section id="visit" style={styles.section} className="rt-section">
        <div style={styles.sectionInner}>
          <ServicePlanner />
        </div>
      </section>

      <section style={{ ...styles.section, background: '#241a12' }} className="rt-section">
        <div style={styles.sectionInner}>
          <span style={styles.eyebrow}>Enquiries</span>
          <h2 style={styles.sectionTitle}>Send us a message</h2>
          <p style={styles.sectionLead}>
            Takes less than a minute. We'll respond shortly or give us a call on +447882739102.
          </p>
          <VisitForm />
        </div>
      </section>

      <section id="find-us" style={{ ...styles.section, background: '#241a12' }} className="rt-section">
        <div style={styles.sectionInner}>
          <LocationMap />
        </div>
      </section>

      <section id="media" style={styles.section} className="rt-section">
        <div style={styles.sectionInner}>
          <MediaLibrary />
        </div>
      </section>

      <footer style={styles.footer}>
        <LogoMark size={22} color="#8a6a45" />
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(CHURCH_ADDRESS)}`}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.footerAddressLink}
        >
          Restoration Tabernacle · Unit A6-A8, St Catherines Business Complex, Broad Ln, Bramley, Leeds LS13 2TD
        </a>
        <div style={styles.footerDivider}>·</div>
        <div>Sundays 10:30am &amp; 3pm · Tuesday Prayer 5:30–6:30pm · Wednesday Midweek 6:30–8:30pm</div>
      </footer>
    </div>
  );
}

// ---------- Styles ----------
const styles = {
  page: {
    fontFamily: "'Georgia', 'Iowan Old Style', serif",
    background: '#1a1410',
    color: '#f4ead9',
    minHeight: '100vh',
    overflowX: 'hidden',
    width: '100%',
  },
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.4rem 2rem',
    background: 'rgba(26,20,16,0.85)',
    backdropFilter: 'blur(6px)',
    borderBottom: '1px solid rgba(244,234,217,0.08)',
  },
  logoGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.7rem',
  },
  logo: {
    fontSize: '1.05rem',
    letterSpacing: '0.06em',
  },
  logoBold: {
    fontWeight: 700,
  },
  navDesktop: {
    gap: '2rem',
  },
  navLink: {
    color: '#cbb491',
    textDecoration: 'none',
    fontSize: '0.9rem',
    letterSpacing: '0.04em',
  },
  navToggle: {
    background: 'none',
    border: 'none',
    color: '#f4ead9',
    fontSize: '1.3rem',
    cursor: 'pointer',
    padding: '0.6rem',
    minWidth: '44px',
    minHeight: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navMobile: {
    display: 'flex',
    flexDirection: 'column',
    padding: '1rem 2rem 1.5rem',
    gap: '1rem',
    background: '#1a1410',
    borderBottom: '1px solid rgba(244,234,217,0.08)',
  },
  navLinkMobile: {
    color: '#e3cfab',
    textDecoration: 'none',
    fontSize: '1rem',
    padding: '0.6rem 0',
    display: 'block',
  },
  hero: {
    position: 'relative',
    minHeight: '92vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    overflow: 'hidden',
    background: 'linear-gradient(180deg, #1a1410 0%, #2b1f16 55%, #3a2a1a 100%)',
  },
  heroGlow: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(circle at 50% 30%, rgba(255,225,170,0.14) 0%, rgba(0,0,0,0) 60%)',
    pointerEvents: 'none',
  },
  heroScene: {
    position: 'relative',
    width: 'min(720px, 90vw)',
    height: 'min(760px, 82vh)',
    flexShrink: 0,
  },
  heroText: {
    position: 'relative',
    textAlign: 'center',
    padding: '1.4rem 1.5rem 3.5rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    flex: 1,
    justifyContent: 'center',
    background: 'linear-gradient(180deg, rgba(10,7,5,0.55) 0%, rgba(10,7,5,0.78) 100%)',
  },
  heroTitle: {
    fontSize: 'clamp(1.7rem, 6.5vw, 3.6rem)',
    fontWeight: 400,
    margin: 0,
    textShadow: '0 2px 24px rgba(0,0,0,0.5)',
    whiteSpace: 'nowrap',
  },
  heroSubtitle: {
    marginTop: '0.9rem',
    fontSize: '1.05rem',
    color: '#e3cfab',
    fontStyle: 'italic',
    textShadow: '0 2px 16px rgba(0,0,0,0.5)',
  },
  typewriterCursor: {
    display: 'inline-block',
    marginLeft: '2px',
    animation: 'rt-blink 1s steps(1) infinite',
    fontStyle: 'normal',
  },
  heroButton: {
    display: 'inline-block',
    marginTop: '1.8rem',
    padding: '0.75rem 1.8rem',
    background: '#c9853d',
    color: '#1a1410',
    textDecoration: 'none',
    borderRadius: '2px',
    fontSize: '0.9rem',
    letterSpacing: '0.05em',
    pointerEvents: 'auto',
  },
  section: {
    padding: '5rem 2rem',
  },
  sectionInner: {
    maxWidth: '880px',
    margin: '0 auto',
  },
  eyebrow: {
    fontSize: '0.78rem',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: '#a8926f',
  },
  sectionTitle: {
    fontSize: 'clamp(1.7rem, 3vw, 2.2rem)',
    fontWeight: 400,
    margin: '0.5rem 0 0',
  },
  sectionLead: {
    color: '#cbb491',
    marginTop: '0.8rem',
    marginBottom: '2rem',
    lineHeight: 1.6,
  },
  plannerCard: {
    border: '1px solid rgba(244,234,217,0.1)',
    borderRadius: '4px',
    padding: '2rem',
    background: 'rgba(244,234,217,0.03)',
  },
  plannerHeader: {
    marginBottom: '1.6rem',
  },
  dayToggle: {
    display: 'flex',
    gap: '0.6rem',
    marginBottom: '1.6rem',
    flexWrap: 'wrap',
  },
  dayButton: {
    padding: '0.7rem 1.1rem',
    minHeight: '44px',
    borderRadius: '2px',
    border: '1px solid rgba(244,234,217,0.2)',
    background: 'transparent',
    color: '#e3cfab',
    fontFamily: 'inherit',
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  dayButtonActive: {
    background: '#c9853d',
    color: '#1a1410',
    borderColor: '#c9853d',
  },
  serviceList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  serviceRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    padding: '1rem',
    borderRadius: '3px',
    background: 'rgba(244,234,217,0.02)',
    flexWrap: 'wrap',
  },
  serviceTime: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: '90px',
  },
  serviceTimeNum: {
    fontSize: '1.1rem',
    color: '#f4ead9',
  },
  serviceDay: {
    fontSize: '0.75rem',
    color: '#a8926f',
    letterSpacing: '0.05em',
  },
  serviceInfo: {
    flex: 1,
    minWidth: '180px',
  },
  serviceLabel: {
    fontSize: '1rem',
  },
  serviceTone: {
    fontSize: '0.85rem',
    color: '#cbb491',
    marginTop: '0.2rem',
  },
  serviceCapacity: {
    fontSize: '0.8rem',
    color: '#a8926f',
    fontStyle: 'italic',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.2rem',
    maxWidth: '540px',
  },
  formRow: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    fontSize: '0.85rem',
    color: '#cbb491',
    flex: 1,
    minWidth: '200px',
  },
  input: {
    padding: '0.65rem 0.8rem',
    borderRadius: '3px',
    border: '1px solid rgba(244,234,217,0.2)',
    background: 'rgba(244,234,217,0.04)',
    color: '#f4ead9',
    fontFamily: 'inherit',
    fontSize: '1rem',
  },
  formError: {
    color: '#e0a05a',
    fontSize: '0.85rem',
  },
  submitButton: {
    alignSelf: 'flex-start',
    padding: '0.75rem 1.8rem',
    background: '#c9853d',
    color: '#1a1410',
    border: 'none',
    borderRadius: '2px',
    fontSize: '0.9rem',
    letterSpacing: '0.05em',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  confirmCard: {
    maxWidth: '480px',
    padding: '2rem',
    border: '1px solid rgba(244,234,217,0.1)',
    borderRadius: '4px',
    background: 'rgba(244,234,217,0.03)',
  },
  confirmIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: '#c9853d',
    color: '#1a1410',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1rem',
    fontSize: '1rem',
  },
  confirmTitle: {
    margin: 0,
    fontWeight: 400,
    fontSize: '1.3rem',
  },
  confirmText: {
    color: '#cbb491',
    lineHeight: 1.6,
    marginTop: '0.8rem',
  },
  confirmReset: {
    marginTop: '1.2rem',
    background: 'none',
    border: '1px solid rgba(244,234,217,0.2)',
    color: '#e3cfab',
    padding: '0.7rem 1.1rem',
    minHeight: '44px',
    borderRadius: '2px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '0.85rem',
  },
  mediaSimple: {
    textAlign: 'left',
  },
  youtubeButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.6rem',
    marginTop: '1.6rem',
    padding: '0.75rem 1.8rem',
    background: '#c9853d',
    color: '#1a1410',
    textDecoration: 'none',
    borderRadius: '2px',
    fontSize: '0.9rem',
    letterSpacing: '0.03em',
    fontWeight: 500,
  },
  footer: {
    padding: '2.5rem 2rem',
    textAlign: 'center',
    fontSize: '0.8rem',
    color: '#a8926f',
    borderTop: '1px solid rgba(244,234,217,0.08)',
    display: 'flex',
    justifyContent: 'center',
    gap: '0.6rem',
    flexWrap: 'wrap',
  },
  footerDivider: {
    color: '#5c4a34',
  },
  mapFrame: {
    width: '100%',
    height: '340px',
    borderRadius: '4px',
    overflow: 'hidden',
    border: '1px solid rgba(244,234,217,0.12)',
    marginTop: '1.6rem',
  },
  mapFallback: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(244,234,217,0.03)',
    padding: '2rem',
  },
  mapFallbackText: {
    textAlign: 'center',
    color: '#a8926f',
    fontSize: '0.9rem',
    lineHeight: 1.6,
  },
  mapNote: {
    fontSize: '0.82rem',
    color: '#a8926f',
    marginTop: '0.8rem',
    fontStyle: 'italic',
  },
  directionsButton: {
    display: 'inline-block',
    marginTop: '1.2rem',
    padding: '0.75rem 1.8rem',
    background: '#c9853d',
    color: '#1a1410',
    textDecoration: 'none',
    borderRadius: '2px',
    fontSize: '0.9rem',
    letterSpacing: '0.05em',
  },
  footerAddressLink: {
    color: '#a8926f',
    textDecoration: 'none',
  },
};
