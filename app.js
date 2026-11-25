(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const SVG_NS = "http://www.w3.org/2000/svg";
  const STAR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.2 1.2-6.5L2.5 9.5l6.6-.9z"/></svg>';

  const boothByNo = new Map(BOOTHS.map((b) => [b.no, b]));

  const els = {
    panel: $("#searchPanel"),
    input: $("#searchInput"),
    clear: $("#clearBtn"),
    results: $("#results"),
    viewport: $("#mapViewport"),
    inner: $("#mapInner"),
    svg: $("#map"),
    sheet: $("#sheet"),
    sheetHandle: $("#sheetHandle"),
    sheetAvatar: $("#sheetAvatar"),
    sheetTitle: $("#sheetTitle"),
    sheetLink: $("#sheetLink"),
    boothStar: $("#boothStar"),
    works: $("#works"),
    favBtn: $("#favBtn"),
    favPanel: $("#favPanel"),
    favList: $("#favList"),
    favClose: $("#favClose"),
    favBackdrop: $("#favBackdrop"),
    favSave: $("#favSave"),
  };

  /* =======================================================
   * 즐겨찾기 (localStorage)
   * ======================================================= */
  const FAV_KEY = "bookfair-favorites-v1";
  const fav = { booths: new Set(), works: new Set() };
  try {
    const saved = JSON.parse(localStorage.getItem(FAV_KEY) || "{}");
    (saved.booths || []).forEach((n) => fav.booths.add(n));
    (saved.works || []).forEach((k) => fav.works.add(k));
  } catch (_) { /* 저장소를 쓸 수 없어도 동작 */ }

  // 주소(URL)에도 즐겨찾기를 함께 담아 둠: ?fb=부스번호들&fw=부스-작품번호들
  //  - 서버 없이도, 인스타그램 등 앱 안 브라우저 → 외부 브라우저로 옮겨 열거나
  //    주소를 북마크/복사해 두면 즐겨찾기가 그대로 따라감
  (() => {
    try {
      const q = new URLSearchParams(location.search);
      (q.get("fb") || "").split(",").forEach((n) => { const v = Number(n); if (n !== "" && boothByNo.has(v)) fav.booths.add(v); });
      (q.get("fw") || "").split(",").forEach((k) => {
        const m = /^(\d+)-(\d+)$/.exec(k);
        if (m && boothByNo.get(+m[1])?.works[+m[2]]) fav.works.add(k);
      });
    } catch (_) {}
  })();
  // 브라우저가 저장 공간을 임의로 비우지 않도록 요청 (지원하는 브라우저만)
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (_) {}

  function favURL() {
    const u = new URL(location.href);
    const fb = [...fav.booths].sort((a, b) => a - b).join(",");
    const fw = [...fav.works].sort().join(",");
    fb ? u.searchParams.set("fb", fb) : u.searchParams.delete("fb");
    fw ? u.searchParams.set("fw", fw) : u.searchParams.delete("fw");
    return u.toString().replace(/%2C/gi, ",");
  }
  function saveFav() {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify({ booths: [...fav.booths], works: [...fav.works] }));
    } catch (_) {}
    try { history.replaceState(history.state, "", favURL()); } catch (_) {}
  }
  const workKey = (no, i) => `${no}-${i}`;
  const isBoothFav = (no) => fav.booths.has(no);
  const hasAnyFav = (no) =>
    fav.booths.has(no) || (boothByNo.get(no)?.works || []).some((_, i) => fav.works.has(workKey(no, i)));

  /* =======================================================
   * 유틸
   * ======================================================= */
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) => String(s).toLowerCase().replace(/\s+/g, "");
  const hueOf = (no) => (no * 47 + 200) % 360;
  const price = (n) => `${Number(n).toLocaleString("ko-KR")}원`;

  const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
  const choseong = (s) =>
    [...s].map((ch) => {
      const c = ch.charCodeAt(0) - 0xac00;
      return c >= 0 && c <= 11171 ? CHO[Math.floor(c / 588)] : ch;
    }).join("");
  const isChoQuery = (q) => /^[ㄱ-ㅎ]+$/.test(q);

  function svgEl(tag, attrs = {}, parent) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  }

  function paintAvatar(el, booth) {
    if (booth.avatar) {
      el.style.backgroundImage = `url("${booth.avatar}")`;
      el.textContent = "";
    } else {
      const h = hueOf(booth.no);
      el.style.backgroundImage = `linear-gradient(140deg, hsl(${h} 55% 78%), hsl(${(h + 40) % 360} 45% 62%))`;
      el.textContent = booth.name.trim()[0] || "";
    }
  }

  /* =======================================================
   * 지도 그리기
   * ======================================================= */
  const boothEls = new Map();

  const pad2 = (n) => String(n).padStart(2, "0");
  // "12. 쩡찌" / 위탁판매 구역은 번호 없이 이름만
  const boothLabel = (b) => (b.special ? b.name : `${pad2(b.no)}. ${b.name}`);
  // 작가가 많으면 "가, 나 외 3명"
  const authorText = (b, max = 2) => {
    const a = b.authors || [];
    if (!a.length || (a.length === 1 && a[0] === b.name)) return "";
    return a.length > max ? `${a.slice(0, max).join(", ")} 외 ${a.length - max}명` : a.join(", ");
  };

  function buildMap() {
    const svg = els.svg;
    svg.setAttribute("viewBox", `0 0 ${MAP.width} ${MAP.height}`);
    svg.setAttribute("width", MAP.width);
    svg.setAttribute("height", MAP.height);

    // 행사장 지도 배경 (map.js 의 SVG: 벽, 동선, 출입구, 글자 등)
    svgEl("rect", { class: "m-bg", x: 0, y: 0, width: MAP.width, height: MAP.height }, svg);
    const layer = svgEl("g", { class: "map-layer" }, svg);
    layer.innerHTML = MAP_LAYER;

    // 부스: 지도 위 같은 자리에 선명한 SVG 부스를 덮어 그림 (선택/즐겨찾기 색 표시용)
    BOOTHS.forEach(({ no, x, y, w, h, special, name }) => {
      const g = svgEl("g", { class: "booth" + (special ? " zone" : ""), "data-no": no, role: "button", tabindex: -1,
                             "aria-label": special ? name : `${pad2(no)}번 부스` }, svg);
      svgEl("rect", { x, y, width: w, height: h }, g);
      svgEl("circle", { class: "pin", cx: x + w / 2, cy: y + h / 2, r: special ? 22 : Math.min(w, h) / 2 - 2 }, g);
      if (!special) {
        const label = svgEl("text", { x: x + w / 2, y: y + h / 2 + 1 }, g);
        label.textContent = pad2(no);
      }
      boothEls.set(no, { g, x, y, w, h });
    });
    refreshFavMarks();
  }

  function refreshFavMarks() {
    boothEls.forEach(({ g }, no) => g.classList.toggle("fav", hasAnyFav(no)));
  }

  function dimBooths(matchSet) {
    boothEls.forEach(({ g }, no) => g.classList.toggle("dim", !!matchSet && !matchSet.has(no)));
  }

  /* =======================================================
   * 지도 이동 / 확대 (드래그, 핀치, 휠)
   * ======================================================= */
  const view = { x: 0, y: 0, s: 1 };
  let fitScale = 1;

  const vw = () => els.viewport.clientWidth;
  const vh = () => els.viewport.clientHeight;
  const headerH = () => els.panel.getBoundingClientRect().height;
  const sheetH = () => (els.sheet.classList.contains("open") ? els.sheet.getBoundingClientRect().height : 0);
  const minScale = () => fitScale * 0.8;
  const maxScale = () => Math.max(fitScale * 6, 2.5);
  const FOCUS_SCALE = 1.4;   // 부스를 선택했을 때 확대 배율 (부스 한 칸 ≈ 60px)

  function clampView() {
    view.s = Math.min(maxScale(), Math.max(minScale(), view.s));
    const W = MAP.width * view.s, H = MAP.height * view.s;
    view.x = Math.min(vw() * 0.5, Math.max(vw() * 0.5 - W, view.x));
    view.y = Math.min(vh() * 0.6, Math.max(vh() * 0.4 - H, view.y));
  }

  function applyView(animate = false) {
    clampView();
    els.inner.classList.toggle("animate", animate);
    els.inner.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.s})`;
  }

  function zoomAt(px, py, newScale, animate = false) {
    const s = Math.min(maxScale(), Math.max(minScale(), newScale));
    const mx = (px - view.x) / view.s, my = (py - view.y) / view.s;
    view.s = s;
    view.x = px - mx * s;
    view.y = py - my * s;
    applyView(animate);
  }

  // 지도 전체가 검색창 아래 영역에 들어오는 배율
  function computeFit() {
    const top = headerH();
    return Math.min((vw() - 16) / MAP.width, (vh() - top - 16) / MAP.height);
  }

  function fitView(animate = false, initial = false) {
    fitScale = computeFit();
    const top = headerH();
    if (initial && vw() < 700) {
      // 세로 모바일 첫 화면: 전체를 넣으면 부스가 너무 작아서, 높이에 맞추고 왼쪽 홀부터 보여줌
      view.s = Math.max(fitScale, Math.min(0.62, (vh() - top - 16) / MAP.height));
      view.x = 8;
      view.y = top + 12;
    } else {
      view.s = fitScale;
      view.x = (vw() - MAP.width * view.s) / 2;
      view.y = top + (vh() - top - MAP.height * view.s) / 2;
    }
    applyView(animate);
  }

  function focusBooth(no) {
    const b = boothEls.get(no);
    if (!b) return;
    const s = Math.min(maxScale(), Math.max(view.s, FOCUS_SCALE));
    const top = headerH();
    const bottom = vh() - sheetH();
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    view.s = s;
    view.x = vw() / 2 - cx * s;
    view.y = (top + bottom) / 2 - cy * s;
    applyView(true);
  }

  // 포인터 처리
  const pointers = new Map();
  let gesture = null;

  els.viewport.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    els.viewport.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    els.inner.classList.remove("animate");

    if (pointers.size === 1) {
      gesture = {
        type: "pan",
        sx: e.clientX, sy: e.clientY,
        vx: view.x, vy: view.y,
        moved: false,
        target: e.target.closest(".booth"),
      };
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      gesture = {
        type: "pinch",
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2,
        vx: view.x, vy: view.y, vs: view.s,
        moved: true,
      };
    }
  });

  els.viewport.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId) || !gesture) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (gesture.type === "pan" && pointers.size === 1) {
      const dx = e.clientX - gesture.sx, dy = e.clientY - gesture.sy;
      if (!gesture.moved && Math.hypot(dx, dy) < 6) return;
      gesture.moved = true;
      els.viewport.classList.add("dragging");
      view.x = gesture.vx + dx;
      view.y = gesture.vy + dy;
      applyView();
    } else if (gesture.type === "pinch" && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      const s = Math.min(maxScale(), Math.max(minScale(), gesture.vs * (dist / gesture.dist)));
      const mx = (gesture.cx - gesture.vx) / gesture.vs;
      const my = (gesture.cy - gesture.vy) / gesture.vs;
      view.s = s;
      view.x = cx - mx * s;
      view.y = cy - my * s;
      applyView();
    }
  });

  function endPointer(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    els.viewport.classList.remove("dragging");

    if (gesture && gesture.type === "pan" && !gesture.moved && e.type === "pointerup") {
      // 탭: 부스 선택 또는 선택 해제
      if (gesture.target) selectBooth(Number(gesture.target.dataset.no));
      else deselect();
    }
    if (pointers.size === 1) {
      // 핀치 후 손가락 하나 남으면 이어서 이동
      const [p] = [...pointers.values()];
      gesture = { type: "pan", sx: p.x, sy: p.y, vx: view.x, vy: view.y, moved: true, target: null };
    } else if (pointers.size === 0) {
      gesture = null;
    }
  }
  els.viewport.addEventListener("pointerup", endPointer);
  els.viewport.addEventListener("pointercancel", endPointer);

  els.viewport.addEventListener("wheel", (e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // 트랙패드 핀치 (브라우저가 ctrlKey로 전달)
      zoomAt(e.clientX, e.clientY, view.s * Math.exp(-e.deltaY * 0.01));
    } else if (e.deltaMode !== 0 || (e.deltaX === 0 && Math.abs(e.deltaY) >= 50)) {
      // 마우스 휠: 확대/축소
      zoomAt(e.clientX, e.clientY, view.s * Math.exp(-e.deltaY * 0.0018));
    } else {
      // 트랙패드 두 손가락 스크롤: 이동
      view.x -= e.deltaX;
      view.y -= e.deltaY;
      applyView();
    }
  }, { passive: false });

  $("#zoomIn").addEventListener("click", () => zoomAt(vw() / 2, (headerH() + vh() - sheetH()) / 2, view.s * 1.4, true));
  $("#zoomOut").addEventListener("click", () => zoomAt(vw() / 2, (headerH() + vh() - sheetH()) / 2, view.s / 1.4, true));
  $("#zoomFit").addEventListener("click", () => fitView(true));

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      fitScale = computeFit();
      syncSheetVars();
      if (selectedNo != null) focusBooth(selectedNo); else applyView();
    }, 120);
  });

  /* =======================================================
   * 부스 선택 + 하단 시트
   * ======================================================= */
  let selectedNo = null;

  function selectBooth(no) {
    const booth = boothByNo.get(no);
    if (!booth) return;
    if (selectedNo != null && boothEls.get(selectedNo)) boothEls.get(selectedNo).g.classList.remove("selected");
    selectedNo = no;
    boothEls.get(no)?.g.classList.add("selected");
    renderSheet(booth);
    els.works.scrollTop = 0;
    setExpanded(false);
    openSheet();
    focusBooth(no);
    try { history.replaceState(null, "", `#${no}`); } catch (_) {}
  }

  function deselect() {
    if (selectedNo != null && boothEls.get(selectedNo)) boothEls.get(selectedNo).g.classList.remove("selected");
    selectedNo = null;
    closeSheet();
    try { history.replaceState(null, "", location.pathname + location.search); } catch (_) {}
  }

  // 시트 상태: 닫힘 / 기본(open) / 확장(expanded)
  const sheetMaxH = () => Math.max(240, vh() - headerH() - 8);   // 확장 시 검색창 바로 아래까지
  function syncSheetVars() {
    document.body.style.setProperty("--sheet-max", `${sheetMaxH()}px`);
    document.body.style.setProperty("--sheet-now", `${els.sheet.offsetHeight}px`);
  }
  function setExpanded(on) {
    const can = on && !els.sheet.classList.contains("compact");
    els.sheet.classList.toggle("expanded", can);
    document.body.classList.toggle("sheet-expanded", can);
    els.sheet.style.height = "";
    requestAnimationFrame(syncSheetVars);
  }
  function openSheet() {
    els.sheet.classList.add("open");
    els.sheet.setAttribute("aria-hidden", "false");
    document.body.classList.add("sheet-open");
    syncSheetVars();
  }
  function closeSheet() {
    els.sheet.classList.remove("open", "expanded");
    document.body.classList.remove("sheet-expanded");
    els.sheet.style.transform = "";
    els.sheet.style.height = "";
    els.sheet.setAttribute("aria-hidden", "true");
    document.body.classList.remove("sheet-open");
  }

  function renderSheet(booth) {
    paintAvatar(els.sheetAvatar, booth);
    const at = authorText(booth, 3);
    els.sheetTitle.innerHTML = `<span class="sheet-name">${esc(boothLabel(booth))}</span>` +
      (at ? `<span class="sheet-authors">${esc(at)}</span>` : "");
    els.sheetLink.hidden = !booth.url;
    if (booth.url) els.sheetLink.href = booth.url;
    els.boothStar.innerHTML = STAR_SVG;
    els.boothStar.setAttribute("aria-pressed", String(isBoothFav(booth.no)));

    els.works.innerHTML = "";
    const hasWorks = !!(booth.works && booth.works.length);
    els.sheet.classList.toggle("compact", !hasWorks);   // 작품 정보가 없으면 헤더만 보이는 작은 시트
    if (!hasWorks) return;
    booth.works.forEach((w, i) => {
      const key = workKey(booth.no, i);
      const item = document.createElement("article");
      item.className = "work";

      const cover = document.createElement("div");
      if (w.cover) {
        cover.className = "cover cover-img";
        const img = document.createElement("img");
        img.src = w.cover; img.alt = `${w.title} 표지`; img.loading = "lazy"; img.decoding = "async";
        cover.appendChild(img);
      } else {
        const h = (hueOf(booth.no) + i * 35) % 360;
        cover.className = "cover cover-gen";
        cover.innerHTML =
          `<div class="art" style="background:
             radial-gradient(circle at 35% 40%, hsl(${h} 70% 92%) 0 18%, transparent 19%),
             linear-gradient(165deg, hsl(${h} 55% 82%), hsl(${(h + 25) % 360} 45% 58%))"></div>
           <div class="spine${/[A-Za-z0-9]/.test(w.title) ? " latin" : ""}">${esc(/[A-Za-z0-9]/.test(w.title) ? w.title.slice(0, 12) : w.title.replace(/\s+/g, "").slice(0, 7))}</div>`;
      }

      const title = document.createElement("div");
      title.className = "work-title";
      title.innerHTML = `<span>&lt;${esc(w.title)}&gt;</span>`;
      const star = document.createElement("button");
      star.type = "button";
      star.className = "star small";
      star.innerHTML = STAR_SVG;
      star.setAttribute("aria-label", `${w.title} 즐겨찾기`);
      star.dataset.key = key;
      star.setAttribute("aria-pressed", String(fav.works.has(key)));
      star.addEventListener("click", () => {
        fav.works.has(key) ? fav.works.delete(key) : fav.works.add(key);
        onFavChange();
      });
      title.appendChild(star);

      const p = document.createElement("div");
      p.className = "work-price";
      p.textContent = w.price == null ? "가격 미정" : w.price === 0 ? "무료" : price(w.price);
      if (w.price == null) p.classList.add("muted");

      item.append(cover, title);
      if (w.author && w.author !== booth.name) {
        const a = document.createElement("div");
        a.className = "work-author";
        a.textContent = w.author;
        item.append(a);
      }
      item.append(p);
      els.works.appendChild(item);
    });
  }

  els.boothStar.addEventListener("click", () => {
    if (selectedNo == null) return;
    fav.booths.has(selectedNo) ? fav.booths.delete(selectedNo) : fav.booths.add(selectedNo);
    onFavChange();
  });

  /* =======================================================
   * 즐겨찾기 사이드바
   * ======================================================= */
  // 즐겨찾기가 바뀌면: 저장 → 지도 색 → 열린 패널의 별 → 상단 별 → 사이드바 목록
  function onFavChange() {
    saveFav();
    refreshFavMarks();
    if (selectedNo != null) els.boothStar.setAttribute("aria-pressed", String(fav.booths.has(selectedNo)));
    els.works.querySelectorAll(".star[data-key]").forEach((b) => b.setAttribute("aria-pressed", String(fav.works.has(b.dataset.key))));
    els.favBtn.setAttribute("aria-pressed", String(fav.booths.size + fav.works.size > 0));
    if (els.favPanel.classList.contains("open")) renderFavPanel();
  }

  function favStar(label, onClick) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "star small";
    b.innerHTML = STAR_SVG;
    b.setAttribute("aria-pressed", "true");
    b.setAttribute("aria-label", `${label} 즐겨찾기 해제`);
    b.addEventListener("click", (e) => { e.stopPropagation(); onClick(); });
    return b;
  }

  // 부스별 컨테이너 안에 즐겨찾기한 책을 나열
  // 부스 번호 순으로 [{no, booth, works:[{key,i,w}]}]
  function favGroups() {
    const groups = new Map();
    fav.booths.forEach((no) => { if (boothByNo.has(no)) groups.set(no, []); });
    fav.works.forEach((key) => {
      const [no, i] = key.split("-").map(Number);
      const b = boothByNo.get(no), w = b && b.works[i];
      if (!w) return;
      if (!groups.has(no)) groups.set(no, []);
      groups.get(no).push({ key, i, w });
    });
    return [...groups.keys()].sort((a, b) => a - b)
      .map((no) => ({ no, booth: boothByNo.get(no), works: groups.get(no).sort((x, y) => x.i - y.i) }));
  }

  function renderFavPanel() {
    const list = els.favList;
    list.innerHTML = "";
    els.favSave.disabled = !(fav.booths.size + fav.works.size);
    const groups = new Map(favGroups().map((g) => [g.no, g.works]));
    [...groups.keys()].forEach((no) => {
      const b = boothByNo.get(no);
      const box = document.createElement("section");
      box.className = "sb-booth";

      const head = document.createElement("div");
      head.className = "sb-item";
      const av = document.createElement("div");
      av.className = "avatar";
      paintAvatar(av, b);
      const txt = document.createElement("div");
      txt.className = "sb-text";
      const at = authorText(b);
      txt.innerHTML = `<div class="sb-main">${esc(boothLabel(b))}</div>` + (at ? `<div class="sb-sub">${esc(at)}</div>` : "");
      const bs = favStar(boothLabel(b), () => {
        fav.booths.has(no) ? fav.booths.delete(no) : fav.booths.add(no);
        onFavChange();
      });
      bs.setAttribute("aria-pressed", String(fav.booths.has(no)));
      head.append(av, txt, bs);
      head.addEventListener("click", () => { closeFavPanel(); selectBooth(no); });
      box.appendChild(head);

      groups.get(no).sort((x, y) => x.i - y.i).forEach(({ key, w }) => {
        const row = document.createElement("div");
        row.className = "sb-item book";
        const cv = document.createElement("div");
        cv.className = "sb-cover";
        if (w.cover) cv.innerHTML = `<img src="${esc(w.cover)}" alt="" loading="lazy">`;
        else cv.style.background = `linear-gradient(165deg, hsl(${hueOf(no)} 55% 82%), hsl(${(hueOf(no) + 25) % 360} 45% 58%))`;
        const t = document.createElement("div");
        t.className = "sb-text";
        const pr = w.price == null ? "" : w.price === 0 ? "무료" : price(w.price);
        t.innerHTML = `<div class="sb-main">&lt;${esc(w.title)}&gt;</div>` +
          (w.author && w.author !== b.name ? `<div class="sb-sub">${esc(w.author)}</div>` : "") +
          (pr ? `<div class="sb-price">${pr}</div>` : "");
        row.append(cv, t, favStar(w.title, () => { fav.works.delete(key); onFavChange(); }));
        row.addEventListener("click", () => { closeFavPanel(); selectBooth(no); });
        box.appendChild(row);
      });
      list.appendChild(box);
    });
  }

  function openFavPanel() {
    els.input.blur();
    renderFavPanel();
    els.favPanel.classList.add("open");
    els.favPanel.setAttribute("aria-hidden", "false");
    els.favBackdrop.hidden = false;
    requestAnimationFrame(() => els.favBackdrop.classList.add("show"));
  }
  function closeFavPanel() {
    els.favPanel.classList.remove("open");
    els.favPanel.setAttribute("aria-hidden", "true");
    els.favBackdrop.classList.remove("show");
    setTimeout(() => { if (!els.favPanel.classList.contains("open")) els.favBackdrop.hidden = true; }, 250);
  }
  /* =======================================================
   * 사진으로 내려받기: 즐겨찾기 표시된 지도 + 즐겨찾기 목록을 한 장의 PNG로
   * ======================================================= */
  const loadImg = (src) => new Promise((res) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = src;
  });

  // 화면의 지도 SVG를 색이 박힌 독립 SVG 이미지로 변환
  async function mapImage() {
    const css = getComputedStyle(document.documentElement);
    const v = (n, d) => (css.getPropertyValue(n) || d).trim();
    const ink = v("--map-ink", "#545A9E"), zone = v("--map-zone", "#C7C6DD"), bg = v("--map-bg", "#FFFFFF"), favC = v("--fav", "#ff8a3d");
    const font = `Pretendard, -apple-system, "Apple SD Gothic Neo", sans-serif`;
    const style = `
      .m-bg{fill:${bg}} .m-zone rect{fill:${zone}}
      .m-block path,.m-block rect,.m-block circle,.m-arrow polygon{fill:${ink}}
      .m-line line{stroke:${ink};fill:none} .m-seat rect{fill:none;stroke:${ink};stroke-width:2}
      .m-text text{fill:${ink};font-weight:700;font-family:${font}}
      .booth rect{fill:${bg};stroke:${ink};stroke-width:2.6}
      .booth text{fill:${ink};font-size:21px;font-weight:600;text-anchor:middle;dominant-baseline:central;font-family:${font}}
      .booth.fav rect{fill:${favC}} .booth.fav text{fill:#6b3a17}
      .booth.zone rect{fill:transparent;stroke:none} .booth.zone.fav rect{fill:${favC};fill-opacity:.45}
      .pin{display:none}`;
    const clone = els.svg.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", MAP.width);
    clone.setAttribute("height", MAP.height);
    clone.querySelectorAll(".booth").forEach((g) => g.classList.remove("dim", "selected"));
    const st = document.createElementNS(SVG_NS, "style");
    st.textContent = style;
    clone.insertBefore(st, clone.firstChild);
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" }));
    const im = await loadImg(url);
    URL.revokeObjectURL(url);
    return im;
  }

  function fitText(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
    return t + "…";
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  async function buildFavImage() {
    const groups = favGroups();
    const W = 1080, PAD = 40, IW = W - PAD * 2, TOP = 96;   // TOP: 지도 위 여백
    const MAP_H = Math.round(IW * MAP.height / MAP.width);
    const BOOTH_H = 104, BOOK_H = 156, GAP = 22;
    let H = TOP + MAP_H + 36;
    groups.forEach((g) => { H += BOOTH_H + g.works.length * BOOK_H + 16 + GAP; });
    H += PAD - GAP;

    // 필요한 이미지 미리 불러오기
    const [mapIm, avatars, covers] = await Promise.all([
      mapImage(),
      Promise.all(groups.map((g) => (g.booth.avatar ? loadImg(g.booth.avatar) : null))),
      Promise.all(groups.map((g) => Promise.all(g.works.map(({ w }) => (w.cover ? loadImg(w.cover) : null))))),
    ]);

    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d");
    const css = getComputedStyle(document.documentElement);
    const ink = (css.getPropertyValue("--ink") || "#575c9e").trim();
    const soft = (css.getPropertyValue("--ink-soft") || "#8a8fc2").trim();
    const line = (css.getPropertyValue("--line") || "#cfd1e6").trim();
    const favC = (css.getPropertyValue("--fav") || "#ff8a3d").trim();
    const F = (w, px) => `${w} ${px}px Pretendard, -apple-system, "Apple SD Gothic Neo", sans-serif`;

    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
    if (mapIm) ctx.drawImage(mapIm, PAD, TOP, IW, MAP_H);

    const star = (x, y, r) => {   // 채워진 별
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r;
        ctx.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a));
      }
      ctx.closePath(); ctx.fillStyle = favC; ctx.fill();
    };

    let y = TOP + MAP_H + 36;
    groups.forEach((g, gi) => {
      const boxH = BOOTH_H + g.works.length * BOOK_H + 16;
      roundRect(ctx, PAD, y, IW, boxH, 22);
      ctx.strokeStyle = line; ctx.lineWidth = 2; ctx.stroke();

      // 부스 줄
      const ax = PAD + 24, ay = y + 20, AS = 64;
      ctx.save(); ctx.beginPath(); ctx.arc(ax + AS / 2, ay + AS / 2, AS / 2, 0, Math.PI * 2); ctx.clip();
      if (avatars[gi]) ctx.drawImage(avatars[gi], ax, ay, AS, AS);
      else {   // 프로필 이미지가 없으면 화면과 같은 색 + 첫 글자
        const hh = hueOf(g.no), gr = ctx.createLinearGradient(ax, ay, ax + AS, ay + AS);
        gr.addColorStop(0, `hsl(${hh} 55% 78%)`); gr.addColorStop(1, `hsl(${(hh + 40) % 360} 45% 62%)`);
        ctx.fillStyle = gr; ctx.fillRect(ax, ay, AS, AS);
        ctx.fillStyle = "#fff"; ctx.font = F(700, 28); ctx.textAlign = "center";
        ctx.fillText(g.booth.name.trim()[0] || "", ax + AS / 2, ay + AS / 2 + 10); ctx.textAlign = "left";
      }
      ctx.restore();
      const tx = ax + AS + 22, tw = IW - (tx - PAD) - 80;
      const at = authorText(g.booth, 3);
      ctx.fillStyle = ink; ctx.font = F(700, 32);
      ctx.fillText(fitText(ctx, boothLabel(g.booth), tw), tx, at ? ay + 30 : ay + 44);
      if (at) { ctx.fillStyle = soft; ctx.font = F(500, 24); ctx.fillText(fitText(ctx, at, tw), tx, ay + 64); }
      if (fav.booths.has(g.no)) star(PAD + IW - 44, ay + AS / 2, 18);

      // 책 줄
      let by = y + BOOTH_H;
      g.works.forEach(({ w }, wi) => {
        if (wi === 0) {   // 부스명 아래 구분선만 (사이드바와 같게 책 사이에는 선 없음)
          ctx.strokeStyle = line; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(PAD + 24, by); ctx.lineTo(PAD + IW - 24, by); ctx.stroke();
        }
        const cx = PAD + 48, cy = by + 18, CW = 86, CH = 120;
        ctx.fillStyle = "#f3f3f8"; ctx.fillRect(cx, cy, CW, CH);
        const im = covers[gi][wi];
        if (im) {
          const s = Math.min(CW / im.width, CH / im.height), dw = im.width * s, dh = im.height * s;
          ctx.drawImage(im, cx + (CW - dw) / 2, cy + (CH - dh) / 2, dw, dh);
        }
        const bx = cx + CW + 26, bw = IW - (bx - PAD) - 80;
        ctx.fillStyle = "#222"; ctx.font = F(600, 30);
        ctx.fillText(fitText(ctx, `<${w.title}>`, bw), bx, cy + 36);
        let ly = cy + 74;
        if (w.author && w.author !== g.booth.name) {
          ctx.fillStyle = soft; ctx.font = F(500, 24); ctx.fillText(fitText(ctx, w.author, bw), bx, ly); ly += 36;
        }
        if (w.price != null) { ctx.fillStyle = "#222"; ctx.font = F(700, 26); ctx.fillText(w.price === 0 ? "무료" : price(w.price), bx, ly); }
        star(PAD + IW - 44, cy + CH / 2, 16);
        by += BOOK_H;
      });
      y += boxH + GAP;
    });
    return new Promise((res, rej) => {
      try { cv.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), "image/png"); } catch (e) { rej(e); }
    });
  }

  // 저장: 모바일은 공유 시트(사진 앱에 저장), 그 외엔 파일 다운로드, 앱 안 브라우저는 길게 눌러 저장
  async function saveFavImage() {
    if (!(fav.booths.size + fav.works.size)) return;
    els.favSave.disabled = true;
    els.favSave.classList.add("busy");
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const blob = await buildFavImage();
      const name = "하만전-즐겨찾기.png";
      const file = new File([blob], name, { type: "image/png" });
      const touch = matchMedia("(hover: none) and (pointer: coarse)").matches;
      if (IN_APP) { showImageOverlay(blob); return; }
      if (touch && navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file] }); return; } catch (e) { if (e && e.name === "AbortError") return; }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (e) {
      alert("이미지를 만들지 못했어요. 인터넷 주소(https)로 접속했는지 확인해 주세요.");
    } finally {
      els.favSave.disabled = !(fav.booths.size + fav.works.size);
      els.favSave.classList.remove("busy");
    }
  }

  // 앱 안 브라우저(인스타그램 등)는 파일 다운로드가 막혀 있어 이미지를 띄워 길게 눌러 저장하게 함
  function showImageOverlay(blob) {
    const url = URL.createObjectURL(blob);
    const ov = document.createElement("div");
    ov.className = "img-overlay";
    ov.innerHTML = `<p>이미지를 길게 눌러 저장하세요</p><img alt="즐겨찾기 이미지" src="${url}"><button type="button" aria-label="닫기">×</button>`;
    ov.querySelector("button").addEventListener("click", () => { ov.remove(); URL.revokeObjectURL(url); });
    document.body.appendChild(ov);
  }
  els.favSave.addEventListener("click", saveFavImage);

  /* =======================================================
   * 앱 안 브라우저(인스타그램·카카오톡 등) 안내
   *  - 이런 브라우저는 저장 공간이 따로라 즐겨찾기가 사라지기 쉬움
   *  - 외부 브라우저로 열 때 주소에 즐겨찾기를 담아 넘김
   * ======================================================= */
  const UA = navigator.userAgent || "";
  const IN_APP = /Instagram|FBAN|FBAV|KAKAOTALK|Line\/|NAVER\(inapp|DaumApps|Threads|everytimeApp/i.test(UA);
  const IS_ANDROID = /Android/i.test(UA);
  function openExternal() {
    const url = favURL();
    if (/KAKAOTALK/i.test(UA)) { location.href = "kakaotalk://web/openExternal?url=" + encodeURIComponent(url); return; }
    if (IS_ANDROID) {
      const u = new URL(url);
      location.href = `intent://${u.host}${u.pathname}${u.search}${u.hash}#Intent;scheme=${u.protocol.replace(":", "")};package=com.android.chrome;end`;
      return;
    }
    // iOS 인스타그램 등은 코드로 열 수 없어 주소 복사 + 안내
    const done = () => { banner.querySelector(".ia-msg").textContent = "주소를 복사했어요. 오른쪽 위 ··· 메뉴 → '외부 브라우저로 열기' 또는 Safari에 붙여넣기 해주세요."; };
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, done); else done();
  }
  let banner = null;
  if (IN_APP) {
    let dismissed = false;
    try { dismissed = sessionStorage.getItem("ia-dismissed") === "1"; } catch (_) {}
    if (!dismissed) {
      banner = document.createElement("div");
      banner.className = "inapp-banner";
      banner.innerHTML = `<span class="ia-msg">앱 안에서 열면 즐겨찾기가 사라질 수 있어요. 브라우저에서 열어주세요.</span>
        <button type="button" class="ia-open">브라우저로 열기</button><button type="button" class="ia-close" aria-label="닫기">×</button>`;
      banner.querySelector(".ia-open").addEventListener("click", openExternal);
      banner.querySelector(".ia-close").addEventListener("click", () => {
        banner.remove();
        try { sessionStorage.setItem("ia-dismissed", "1"); } catch (_) {}
      });
      document.body.appendChild(banner);
    }
  }

  els.favBtn.innerHTML = STAR_SVG;
  els.favBtn.addEventListener("click", () => (els.favPanel.classList.contains("open") ? closeFavPanel() : openFavPanel()));
  els.favClose.addEventListener("click", closeFavPanel);
  els.favBackdrop.addEventListener("click", closeFavPanel);

  // 시트 손잡이(가로바) 드래그
  //  - 위로 당기면 확장(숨겨진 작품까지 보임), 아래로 내리면 기본 → 더 내리면 닫힘
  //  - 손잡이를 탭하면 확장/기본 전환
  (() => {
    let startY = null, startH = 0, baseH = 0, dy = 0;
    els.sheetHandle.addEventListener("pointerdown", (e) => {
      startY = e.clientY; dy = 0;
      startH = els.sheet.offsetHeight;
      // 기본 상태 높이: 확장 중이면 기본(--sheet-h) 높이를 잠깐 재서 사용
      baseH = startH;
      if (els.sheet.classList.contains("expanded")) {
        const probe = els.sheet.cloneNode(false);
        probe.className = "sheet open"; probe.style.visibility = "hidden";
        document.body.appendChild(probe); baseH = probe.offsetHeight; probe.remove();
      }
      try { els.sheetHandle.setPointerCapture(e.pointerId); } catch (_) {}
      els.sheet.classList.add("dragging");
    });
    els.sheetHandle.addEventListener("pointermove", (e) => {
      if (startY == null) return;
      dy = e.clientY - startY;
      const want = startH - dy;
      if (els.sheet.classList.contains("compact")) {          // 작품 없는 작은 시트는 닫기만
        els.sheet.style.transform = `translateY(${Math.max(0, dy)}px)`;
        return;
      }
      const h = Math.min(sheetMaxH(), Math.max(baseH, want));
      els.sheet.style.height = `${h}px`;
      els.sheet.style.transform = want < baseH ? `translateY(${baseH - want}px)` : "";
    });
    const end = () => {
      if (startY == null) return;
      const want = startH - dy;
      els.sheet.classList.remove("dragging");
      els.sheet.style.transform = "";
      startY = null;
      if (Math.abs(dy) < 5) { setExpanded(!els.sheet.classList.contains("expanded")); return; }   // 탭
      if (want < baseH - 70) { deselect(); return; }                                            // 많이 내림 → 닫기
      setExpanded(want > (baseH + sheetMaxH()) / 2);                                             // 절반 넘으면 확장
    };
    els.sheetHandle.addEventListener("pointerup", end);
    els.sheetHandle.addEventListener("pointercancel", end);
  })();

  /* =======================================================
   * 검색
   * ======================================================= */
  const index = BOOTHS.map((b) => ({
    booth: b,
    no: String(b.no),
    name: norm(b.name),
    nameCho: choseong(norm(b.name)),
    authors: [...new Set([...(b.authors || []), ...(b.works || []).flatMap((w) => (w.author || "").split(/\s*[,/·&]\s*/))])]
      .filter(Boolean).map((a) => ({ name: a, n: norm(a), cho: choseong(norm(a)) })),
    works: (b.works || []).map((w) => ({ title: w.title, n: norm(w.title), cho: choseong(norm(w.title)) })),
  }));

  function search(raw) {
    const q = norm(raw);
    if (!q) return [];
    const cho = isChoQuery(q);
    const out = [];

    for (const it of index) {
      let score = 0;
      let workHit = null;
      const test = (field, choField, weightStart, weightIn) => {
        const f = cho ? choField : field;
        if (f.startsWith(q)) return weightStart;
        if (f.includes(q)) return weightIn;
        return 0;
      };

      if (/^\d+$/.test(q) && !it.booth.special) {
        const p2 = pad2(it.booth.no);
        if (it.no === q || p2 === q) score = 100;
        else if (it.no.startsWith(q) || p2.startsWith(q)) score = 60;
      }
      score = Math.max(score, test(it.name, it.nameCho, 50, 30));
      let authorHit = null;
      for (const a of it.authors) {
        const s = test(a.n, a.cho, 48, 28);
        if (s > (authorHit ? authorHit.s : 0)) authorHit = { s, name: a.name };
      }
      if (authorHit && authorHit.s > score) score = authorHit.s;
      for (const w of it.works) {
        const s = test(w.n, w.cho, 40, 20);
        if (s) {
          if (!workHit) workHit = w.title;
          if (score < s) score = s;
        }
      }
      if (score) out.push({ booth: it.booth, score, workHit, authorHit: authorHit && authorHit.name });
    }
    return out.sort((a, b) => b.score - a.score || a.booth.no - b.booth.no);
  }

  function highlight(text, raw) {
    const q = raw.trim();
    if (!q || isChoQuery(norm(q))) return esc(text);
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return esc(text);
    return esc(text.slice(0, i)) + "<mark>" + esc(text.slice(i, i + q.length)) + "</mark>" + esc(text.slice(i + q.length));
  }

  let current = [];   // 현재 결과
  let active = -1;    // 키보드 선택 인덱스

  function renderResults() {
    const raw = els.input.value;
    const q = raw.trim();
    els.clear.hidden = !raw;

    let list, mode;
    if (q) {
      list = search(q);
      mode = "search";
    } else if (document.activeElement === els.input) {
      list = BOOTHS.filter((b) => hasAnyFav(b.no)).map((b) => ({ booth: b }));
      mode = "fav";
    } else {
      list = [];
      mode = "none";
    }

    current = list;
    active = list.length ? 0 : -1;
    dimBooths(mode === "search" ? new Set(list.map((r) => r.booth.no)) : null);

    if (mode === "none" || (mode === "fav" && !list.length)) {
      els.results.hidden = true;
      els.results.innerHTML = "";
      els.input.setAttribute("aria-expanded", "false");
      return;
    }

    els.results.hidden = false;
    els.input.setAttribute("aria-expanded", "true");

    if (!list.length) {
      els.results.innerHTML = `<li class="empty">'${esc(q)}'에 대한 검색 결과가 없습니다.</li>`;
      return;
    }

    els.results.innerHTML = "";
    if (mode === "fav") {
      const head = document.createElement("li");
      head.className = "empty";
      head.textContent = "즐겨찾기한 부스";
      els.results.appendChild(head);
    }
    list.forEach((r, i) => {
      const b = r.booth;
      const li = document.createElement("li");
      li.className = "result" + (i === active ? " active" : "") + (hasAnyFav(b.no) ? " fav" : "");
      li.setAttribute("role", "option");
      li.dataset.no = b.no;
      const av = document.createElement("div");
      av.className = "avatar";
      paintAvatar(av, b);
      const txt = document.createElement("div");
      txt.className = "result-text";
      txt.innerHTML =
        `<div class="result-main">${highlight(boothLabel(b), q)}${authorText(b) ? " | " + esc(authorText(b)) : ""}</div>` +
        (mode !== "search" ? "" :
          r.authorHit && r.authorHit !== b.name ? `<div class="result-sub">작가 · ${highlight(r.authorHit, q)}</div>` :
          r.workHit ? `<div class="result-sub">작품 · &lt;${highlight(r.workHit, q)}&gt;</div>` : "");
      li.append(av, txt);
      li.addEventListener("pointerdown", (e) => e.preventDefault()); // 입력창 포커스 유지
      li.addEventListener("click", () => choose(b.no));
      li.addEventListener("pointerenter", () => setActive(i));
      els.results.appendChild(li);
    });
  }

  function setActive(i) {
    const items = els.results.querySelectorAll(".result");
    items.forEach((el, k) => el.classList.toggle("active", k === i));
    active = i;
    items[i]?.scrollIntoView({ block: "nearest" });
  }

  function choose(no) {
    els.input.value = "";
    els.input.blur();
    renderResults();
    // 결과 패널이 닫힌 뒤 헤더 높이 기준으로 위치 계산
    requestAnimationFrame(() => selectBooth(no));
  }

  els.input.addEventListener("input", renderResults);
  els.input.addEventListener("focus", renderResults);
  els.input.addEventListener("blur", () => setTimeout(() => { if (document.activeElement !== els.input) renderResults(); }, 0));
  els.input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" && current.length) { e.preventDefault(); setActive((active + 1) % current.length); }
    else if (e.key === "ArrowUp" && current.length) { e.preventDefault(); setActive((active - 1 + current.length) % current.length); }
    else if (e.key === "Enter" && e.isComposing === false && current[active]) { e.preventDefault(); choose(current[active].booth.no); }
    else if (e.key === "Escape") { els.input.value = ""; els.input.blur(); renderResults(); }
  });
  els.clear.addEventListener("pointerdown", (e) => e.preventDefault());
  els.clear.addEventListener("click", () => { els.input.value = ""; renderResults(); els.input.focus(); });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && els.favPanel.classList.contains("open")) { closeFavPanel(); return; }
    if (e.key === "Escape" && document.activeElement !== els.input && selectedNo != null) deselect();
    if (e.key === "/" && document.activeElement !== els.input) { e.preventDefault(); els.input.focus(); }
  });

  /* =======================================================
   * 시작
   * ======================================================= */
  buildMap();
  onFavChange();
  fitView(false, true);
  const fromHash = location.hash.length > 1 ? Number(location.hash.slice(1)) : NaN;
  if (boothByNo.has(fromHash)) requestAnimationFrame(() => selectBooth(fromHash));
})();
