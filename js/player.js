(function () {
  var PLAYLIST_ID = '18521165527';
  var API = 'https://api.injahow.cn/meting/?server=netease&type=playlist&id=' + PLAYLIST_ID;
  var STATE_KEY = 'rec0_player_state';
  var SYNC_MIN_GAP = 60 * 1000;      // 两次同步的最小间隔
  var SYNC_INTERVAL = 5 * 60 * 1000; // 定时同步

  var holder = null;
  var ap = null;
  var opened = false;
  var pendingRestore = false;
  var signature = '';
  var lastSync = 0;
  var syncing = false;

  /* ---------- 工具 ---------- */
  function fetchList() {
    var url = API + '&r=' + Date.now() + Math.random();
    return fetch(url, { cache: 'no-store' }).then(function (r) { return r.json(); });
  }

  function signatureOf(list) {
    return list.map(function (x) { return x.url || ''; }).join('|');
  }

  /* ---------- 播放状态 ---------- */
  function saveState() {
    if (!ap || !ap.audio) return;
    try {
      sessionStorage.setItem(STATE_KEY, JSON.stringify({
        index: (ap.list && ap.list.index) || 0,
        time: ap.audio.currentTime || 0,
        playing: !ap.audio.paused
      }));
    } catch (e) {}
  }

  function restoreState() {
    var saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(STATE_KEY) || 'null'); } catch (e) {}
    if (!saved || !ap) return;
    try {
      if (typeof ap.list.switch === 'function') ap.list.switch(saved.index || 0);
      setTimeout(function () {
        try {
          if (saved.time > 0 && typeof ap.seek === 'function') ap.seek(saved.time);
          if (saved.playing && typeof ap.play === 'function') ap.play();
        } catch (e) {}
      }, 400);
    } catch (e) {}
  }

  /* ---------- 创建播放器 ---------- */
  function build() {
    if (holder) return;

    holder = document.createElement('div');
    holder.id = 'rec0-player-holder';
    var slot = document.createElement('div');
    holder.appendChild(slot);
    document.body.appendChild(holder); // 在 #body-wrap 之外，PJAX 不会销毁

    fetchList().then(function (list) {
      if (!Array.isArray(list) || !list.length) {
        holder.innerHTML = '<div style="color:#8b949e;padding:12px">歌单加载失败</div>';
        return;
      }
      signature = signatureOf(list);
      lastSync = Date.now();

      ap = new APlayer({
        container: slot,
        audio: list,
        fixed: true,
        mini: true,
        autoplay: false,
        preload: 'none',
        theme: '#58a6ff',
        listFolded: true,
        listMaxHeight: '260px',
        lrcType: 3,
        storageName: 'rec0-ap'
      });

      var root = holder.querySelector('.aplayer');
      if (root) setupFixed(root);
      if (pendingRestore) {
        pendingRestore = false;
        restoreState();
      }
    }).catch(function () {
      holder.innerHTML = '<div style="color:#8b949e;padding:12px">歌单加载失败，请检查网络</div>';
    });
  }

  /* ---------- 固定展开态 + 拖动 ---------- */
  function setupFixed(root) {
    var body = root.querySelector('.aplayer-body');
    if (!body) return;

    root.classList.remove('aplayer-narrow');
    body.style.width = '';
    var switcher = root.querySelector('.aplayer-miniswitcher');
    if (switcher) switcher.style.display = 'none';
    var info = root.querySelector('.aplayer-info');
    if (info) info.style.display = 'block';

    var pos = { x: 0, y: 0 };
    try {
      var saved = JSON.parse(localStorage.getItem('rec0_player_pos') || 'null');
      if (saved && typeof saved.x === 'number') pos = saved;
    } catch (e) {}
    apply();

    var dragging = false, moved = false;
    var sx = 0, sy = 0, ox = 0, oy = 0;

    function apply() {
      holder.style.transform = 'translate(' + pos.x + 'px,' + pos.y + 'px)';
    }
    function start(x, y) { dragging = true; moved = false; sx = x; sy = y; ox = pos.x; oy = pos.y; }
    function move(x, y) {
      if (!dragging) return;
      var dx = x - sx, dy = y - sy;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
      pos.x = ox + dx; pos.y = oy + dy;
      apply();
    }
    function end() {
      if (!dragging) return;
      dragging = false;
      if (moved) { try { localStorage.setItem('rec0_player_pos', JSON.stringify(pos)); } catch (e) {} }
    }

    body.addEventListener('mousedown', function (e) {
      if (e.target.closest('.aplayer-button, .aplayer-bar-wrap, .aplayer-volume-wrap, .aplayer-list')) return;
      start(e.clientX, e.clientY);
      e.preventDefault();
    });
    document.addEventListener('mousemove', function (e) { move(e.clientX, e.clientY); });
    document.addEventListener('mouseup', end);

    body.addEventListener('touchstart', function (e) {
      if (e.target.closest('.aplayer-button, .aplayer-bar-wrap, .aplayer-volume-wrap, .aplayer-list')) return;
      var t = e.touches[0];
      start(t.clientX, t.clientY);
    }, { passive: true });
    document.addEventListener('touchmove', function (e) {
      if (!dragging) return;
      var t = e.touches[0];
      move(t.clientX, t.clientY);
    }, { passive: true });
    document.addEventListener('touchend', end);
  }

  /* ---------- 歌单同步 ---------- */
  function syncNow(force) {
    if (!ap || syncing) return;
    var now = Date.now();
    if (!force && now - lastSync < SYNC_MIN_GAP) return;

    syncing = true;
    lastSync = now;

    fetchList().then(function (list) {
      syncing = false;
      if (!Array.isArray(list) || !list.length) return;

      var sig = signatureOf(list);
      if (sig === signature) return; // 无变化

      var audio = ap.audio;
      var curUrl = audio ? audio.src : '';
      var curTime = audio ? audio.currentTime : 0;
      var wasPlaying = audio ? !audio.paused : false;

      var idx = -1;
      for (var i = 0; i < list.length; i++) {
        if (list[i].url === curUrl) { idx = i; break; }
      }

      signature = sig;

      try {
        ap.list.clear();
        ap.list.add(list);

        if (idx >= 0) {
          ap.list.switch(idx);
          setTimeout(function () {
            try {
              if (curTime > 0) ap.seek(curTime);
              if (wasPlaying) ap.play();
            } catch (e) {}
          }, 300);
        } else {
          if (curUrl) {
            try { ap.notice('当前歌曲已从歌单移除', 2200); } catch (e) {}
          }
          if (list.length) ap.list.switch(0);
        }
      } catch (e) {}
    }).catch(function () {
      syncing = false;
    });
  }

  /* ---------- 开关 ---------- */
  function setOpen(open) {
    opened = open;

    if (open && !holder) {
      pendingRestore = true;
      build();
    } else if (open) {
      syncNow(true); // 每次打开都拉一次最新歌单
    }

    if (holder) {
      holder.classList.toggle('closed', !open);
      if (!open && ap && ap.audio) ap.audio.pause();
    }

    var btn = document.getElementById('rec0-player-toggle');
    if (btn) btn.classList.toggle('active', open);
  }

  /* ---------- 设置面板按钮 ---------- */
  function injectButton() {
    var box = document.getElementById('rightside-config-hide');
    if (!box) return;

    var old = document.getElementById('rec0-player-toggle');
    if (old) old.remove();

    var btn = document.createElement('button');
    btn.id = 'rec0-player-toggle';
    btn.type = 'button';
    btn.title = '音乐播放器';
    btn.innerHTML = '<i class="fas fa-music"></i>';
    btn.addEventListener('click', function () { setOpen(!opened); });
    if (opened) btn.classList.add('active');

    box.insertBefore(btn, box.firstChild);
  }

  function init() {
    injectButton();

    // 兜底：若播放器被销毁则重建并续播
    if (opened && !document.getElementById('rec0-player-holder')) {
      holder = null;
      ap = null;
      pendingRestore = true;
      build();
    }
  }

  document.addEventListener('pjax:send', saveState);
  window.addEventListener('beforeunload', saveState);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') saveState();
  });

  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('pjax:complete', function () {
    init();
    if (opened) syncNow(false);
  });

  // 页面停留期间定时同步
  setInterval(function () {
    if (opened) syncNow(false);
  }, SYNC_INTERVAL);
})();
