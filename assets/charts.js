/* Small dependency-free SVG chart helpers: line + grouped bar, with hover tooltips and data tables. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const nf = (d) => (v) => v == null ? '–' : v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function niceMax(v) {
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const m = v / p;
    const s = m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10;
    return s * p;
  }
  function ticks(min, max, n) {
    const step = niceMax((max - min) / n);
    const out = [];
    for (let t = Math.ceil(min / step) * step; t <= max + 1e-9; t += step) out.push(+t.toFixed(10));
    return out;
  }
  function legend(host, series, kind) {
    if (series.length < 2) return;
    const lg = document.createElement('div');
    lg.className = 'legend';
    series.forEach((s) => {
      const sp = document.createElement('span');
      sp.innerHTML = `<i class="${kind === 'line' ? 'ln' : ''}" style="background:${s.color}"></i>${s.name}`;
      lg.appendChild(sp);
    });
    host.parentNode.insertBefore(lg, host);
  }
  function table(host, head, rows) {
    const d = document.createElement('details');
    d.className = 'data';
    d.innerHTML = '<summary>Show data table</summary>';
    const w = document.createElement('div');
    w.className = 'tbl-wrap';
    const t = document.createElement('table');
    t.className = 'tbl';
    t.innerHTML = '<thead><tr>' + head.map((h) => `<th>${h}</th>`).join('') + '</tr></thead><tbody>' +
      rows.map((r) => '<tr>' + r.map((c) => `<td>${c}</td>`).join('') + '</tr>').join('') + '</tbody>';
    w.appendChild(t); d.appendChild(w);
    host.parentNode.insertBefore(d, host.nextSibling);
  }
  function tipBox(host) {
    const t = document.createElement('div');
    t.className = 'tip';
    host.appendChild(t);
    return t;
  }
  function placeTip(tip, host, x, y) {
    const w = tip.offsetWidth, H = host.clientWidth;
    let left = x + 14;
    if (left + w > H) left = x - w - 14;
    if (left < 0) left = 0;
    tip.style.left = left + 'px';
    tip.style.top = Math.max(0, y - 10) + 'px';
    tip.style.opacity = 1;
  }
  function responsive(host, draw) {
    let last = 0;
    const run = () => {
      const w = host.clientWidth;
      if (!w || w === last) return;
      last = w;
      host.querySelectorAll('svg').forEach((s) => s.remove());
      draw(w);
    };
    run();
    if ('ResizeObserver' in window) new ResizeObserver(run).observe(host);
    else window.addEventListener('resize', run);
  }

  /* ---------- Line chart ---------- */
  function line(host, o) {
    const fmt = o.fmt || nf(0);
    legend(host, o.series, 'line');
    const tip = tipBox(host);
    responsive(host, (W) => {
      const small = W < 560;
      const H = o.height || (small ? 240 : 300);
      const m = { t: 14, r: o.series.length > 1 && !small ? 92 : 16, b: 30, l: o.left || 52 };
      const iw = W - m.l - m.r, ih = H - m.t - m.b;
      const all = o.series.flatMap((s) => s.values).filter((v) => v != null);
      let lo = o.yMin != null ? o.yMin : Math.min(0, ...all);
      const stp = niceMax((Math.max(...all) * 1.04 - lo) / 4);
      let hi = o.yMax || lo + Math.ceil((Math.max(...all) * 1.04 - lo) / stp) * stp;
      const ys = ticks(lo, hi, 4);
      const n = o.labels.length;
      const x = (i) => m.l + (n === 1 ? iw / 2 : (i * iw) / (n - 1));
      const y = (v) => m.t + ih - ((v - lo) / (hi - lo)) * ih;
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': o.aria || '' }, host);
      ys.forEach((t) => {
        el('line', { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), style: 'stroke:var(--grid)', 'stroke-width': 1 }, svg);
        const tx = el('text', { x: m.l - 8, y: y(t) + 4, 'text-anchor': 'end', style: 'fill:var(--muted);font-size:11px' }, svg);
        tx.textContent = (o.tickFmt || fmt)(t);
      });
      if (o.ref != null) {
        el('line', { x1: m.l, x2: W - m.r, y1: y(o.ref), y2: y(o.ref), style: 'stroke:var(--axis)', 'stroke-width': 1.5, 'stroke-dasharray': '4 4' }, svg);
        if (o.refLabel) {
          const rt = el('text', { x: m.l + 4, y: y(o.ref) - 6, style: 'fill:var(--muted);font-size:11px' }, svg);
          rt.textContent = o.refLabel;
        }
      }
      const every = o.tickEvery ? (small ? o.tickEvery * 2 : o.tickEvery) : Math.ceil(n / (small ? 6 : 12));
      o.labels.forEach((lab, i) => {
        if (i % every !== 0 && i !== n - 1) return;
        if (i === n - 1 && i % every !== 0 && (small || (n - 1) % every < every / 2)) return;
        const tx = el('text', { x: x(i), y: H - 8, 'text-anchor': 'middle', style: 'fill:var(--muted);font-size:11px' }, svg);
        tx.textContent = o.xFmt ? o.xFmt(lab) : lab;
      });
      o.series.forEach((s) => {
        let d = '';
        s.values.forEach((v, i) => { if (v != null) d += (d ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(v).toFixed(1); });
        el('path', { d, fill: 'none', style: `stroke:${s.color}`, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
        if (o.series.length > 1 && !small) {
          const li = s.values.length - 1;
          const t = el('text', { x: x(li) + 8, y: y(s.values[li]) + 4, style: 'fill:var(--ink-2);font-size:12px;font-weight:600' }, svg);
          t.textContent = s.name;
        }
      });
      const cross = el('line', { y1: m.t, y2: m.t + ih, style: 'stroke:var(--axis)', 'stroke-width': 1, opacity: 0 }, svg);
      const dots = o.series.map((s) => el('circle', { r: 4.5, style: `fill:${s.color};stroke:var(--surface)`, 'stroke-width': 2, opacity: 0 }, svg));
      const hit = el('rect', { x: m.l - 10, y: 0, width: iw + 20, height: H, fill: 'transparent' }, svg);
      const move = (ev) => {
        const r = svg.getBoundingClientRect();
        const px = ((ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left) * (W / r.width);
        const i = Math.max(0, Math.min(n - 1, Math.round(((px - m.l) / iw) * (n - 1))));
        cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.setAttribute('opacity', 1);
        o.series.forEach((s, k) => {
          const v = s.values[i];
          if (v == null) { dots[k].setAttribute('opacity', 0); return; }
          dots[k].setAttribute('cx', x(i)); dots[k].setAttribute('cy', y(v)); dots[k].setAttribute('opacity', 1);
        });
        tip.innerHTML = `<b>${o.tipLabel ? o.tipLabel(o.labels[i]) : o.labels[i]}</b>` + o.series.map((s) =>
          `<div class="row"><i style="background:${s.color}"></i>${s.name}<span class="num">${fmt(s.values[i])}</span></div>`).join('');
        const top = Math.min(...o.series.map((s) => s.values[i] == null ? Infinity : y(s.values[i])));
        placeTip(tip, host, x(i) * (r.width / W), top * (r.width / W));
      };
      const out = () => { tip.style.opacity = 0; cross.setAttribute('opacity', 0); dots.forEach((d) => d.setAttribute('opacity', 0)); };
      hit.addEventListener('mousemove', move);
      hit.addEventListener('touchstart', move, { passive: true });
      hit.addEventListener('touchmove', move, { passive: true });
      hit.addEventListener('mouseleave', out);
      hit.addEventListener('touchend', () => setTimeout(out, 1500));
    });
    if (o.table !== false) {
      table(host, [o.xName || '', ...o.series.map((s) => s.name)],
        o.labels.map((l, i) => [o.tipLabel ? o.tipLabel(l) : l, ...o.series.map((s) => fmt(s.values[i]))]));
    }
  }

  /* ---------- Grouped bar chart ---------- */
  function bar(host, o) {
    const fmt = o.fmt || nf(0);
    legend(host, o.series, 'bar');
    const tip = tipBox(host);
    responsive(host, (W) => {
      const small = W < 560;
      const H = o.height || (small ? 250 : 300);
      const m = { t: 22, r: 10, b: (W - 62) / o.categories.length < 46 ? 58 : 34, l: o.left || 52 };
      const iw = W - m.l - m.r, ih = H - m.t - m.b;
      const all = o.series.flatMap((s) => s.values);
      const stp = niceMax(Math.max(...all) * 1.1 / 4);
      let hi = Math.ceil(Math.max(...all) * 1.1 / stp) * stp;
      const ys = ticks(0, hi, 4);
      const y = (v) => m.t + ih - (v / hi) * ih;
      const nc = o.categories.length, ns = o.series.length;
      const band = iw / nc;
      const tight = band < 46;
      const groupW = Math.min(band * 0.72, ns * (small ? 34 : 52));
      const gap = 2;
      const bw = (groupW - gap * (ns - 1)) / ns;
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': o.aria || '' }, host);
      ys.forEach((t) => {
        el('line', { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), style: 'stroke:var(--grid)', 'stroke-width': 1 }, svg);
        const tx = el('text', { x: m.l - 8, y: y(t) + 4, 'text-anchor': 'end', style: 'fill:var(--muted);font-size:11px' }, svg);
        tx.textContent = (o.tickFmt || fmt)(t);
      });
      el('line', { x1: m.l, x2: W - m.r, y1: y(0), y2: y(0), style: 'stroke:var(--axis)', 'stroke-width': 1 }, svg);
      o.categories.forEach((c, ci) => {
        const gx = m.l + band * ci + (band - groupW) / 2;
        const cx = m.l + band * ci + band / 2;
        const tx = tight
          ? el('text', { x: cx, y: y(0) + 14, 'text-anchor': 'end', transform: `rotate(-45 ${cx} ${y(0) + 14})`, style: 'fill:var(--ink-2);font-size:10.5px' }, svg)
          : el('text', { x: cx, y: H - 10, 'text-anchor': 'middle', style: 'fill:var(--ink-2);font-size:' + (small ? 10.5 : 12) + 'px' }, svg);
        tx.textContent = small && o.shortCats && !tight ? o.shortCats[ci] : c;
        o.series.forEach((s, si) => {
          const v = s.values[ci];
          const bx = gx + si * (bw + gap), by = y(v), bh = y(0) - by;
          const r = Math.min(4, bw / 2, bh);
          const d = `M${bx},${y(0)}V${by + r}Q${bx},${by} ${bx + r},${by}H${bx + bw - r}Q${bx + bw},${by} ${bx + bw},${by + r}V${y(0)}Z`;
          const p = el('path', { d, style: `fill:${s.color}` }, svg);
          if (o.labels && (ns <= 3) && !(small && ns > 1) && !tight) {
            const lt = el('text', { x: bx + bw / 2, y: by - 6, 'text-anchor': 'middle', style: 'fill:var(--ink-2);font-size:11px;font-weight:600' }, svg);
            lt.textContent = (o.labelFmt || fmt)(v);
          }
          const hit = el('rect', { x: bx - gap, y: m.t, width: bw + gap * 2, height: ih, fill: 'transparent' }, svg);
          const show = () => {
            p.style.opacity = 0.8;
            tip.innerHTML = `<b>${c}</b><div class="row"><i style="background:${s.color}"></i>${s.name}<span class="num">${fmt(v)}</span></div>` +
              (o.extra ? o.extra(ci, si) : '');
            const r2 = svg.getBoundingClientRect();
            placeTip(tip, host, (bx + bw / 2) * (r2.width / W), by * (r2.width / W));
          };
          const hide = () => { p.style.opacity = 1; tip.style.opacity = 0; };
          hit.addEventListener('mouseenter', show);
          hit.addEventListener('mouseleave', hide);
          hit.addEventListener('touchstart', show, { passive: true });
          hit.addEventListener('touchend', () => setTimeout(hide, 1500));
        });
      });
    });
    if (o.table !== false) {
      table(host, [o.catName || '', ...o.series.map((s) => s.name)],
        o.categories.map((c, i) => [c, ...o.series.map((s) => fmt(s.values[i]))]));
    }
  }

  window.Charts = { line, bar, nf };

  /* ---------- Theme toggle ---------- */
  const root = document.documentElement;
  try { const t = localStorage.getItem('theme'); if (t) root.setAttribute('data-theme', t); } catch (e) {}
  document.addEventListener('DOMContentLoaded', () => {
    const b = document.querySelector('.theme-btn');
    if (!b) return;
    b.addEventListener('click', () => {
      const cur = root.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      const next = cur === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  });
})();
