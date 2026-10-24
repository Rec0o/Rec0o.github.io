(function () {
  var PLAYLIST_ID = '18521165527';
  var API = 'https://api.injahow.cn/meting/?server=:server&type=:type&id=:id';

  var holder = null;
  var opened = false;

  /* ---------- 创建播放器（首次打开时才执行） ---------- */
  function build() {
    if (holder) return;

    holder = document.createElement('div');
    holder.id = 'rec0-player-holder';
    holder.innerHTML =
      '<meting-js' +
      ' api="' + API + '"' +
      ' server="netease"' +
      ' type="playlist"' +
      ' id="' + PLAYLIST_ID + '"' +
      ' fixed="true"' +
      ' mini="true"' +
      ' autoplay="false"' +
      ' preload="none"' +
      ' theme="#58a6ff"' +
      ' list-folded="true"' +
      '></meting-js>';

    // 播放器挂在 <body> 下、#body-wrap 之外，PJAX 换页不会销毁它
    document.body.appendChild(holder);

    var tries = 0;
    var timer = setInterval(function () {
      var root = document.querySelector('.aplayer.aplayer-fixed');
      if (root) {
        clearInterval(timer);
        setupDrag(root);
      } else if (++tries > 100) {
        clearInterval(timer);
      }
    }, 200);
  }

  /* ---------- 拖动 + 固定展开状态 ---------- */
  function setupDrag(root) {
    if (root.dataset.rec0Drag) return;
    root.dataset.rec0Drag = '1';

    var body = root.querySelector('.aplayer-body');
    if (!body) return;

    // 固定为展开态：取消 narrow 收起状态、隐藏右侧展开条
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

    var dragging = false;
    var moved = false;
    var sx = 0, sy = 0, ox = 0, oy = 0;

    function apply() {
      holder.style.transform = 'translate(' + pos.x + 'px,' + pos.y + 'px)';
    }

    function start(x, y) {
      dragging = true;
      moved = false;
      sx = x; sy = y; ox = pos.x; oy = pos.y;
    }

    function move(x, y) {
      if (!dragging) return;
      var dx = x - sx, dy = y - sy;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
      pos.x = ox + dx;
      pos.y = oy + dy;
      apply();
    }

    function end() {
      if (!dragging) return;
      dragging = false;
      if (moved) {
        try { localStorage.setItem('rec0_player_pos', JSON.stringify(pos)); } catch (e) {}
      }
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

  /* ---------- 开关 ---------- */
  function setOpen(open) {
    opened = open;

    if (open && !holder) build();

    if (holder) {
      holder.classList.toggle('closed', !open);
      if (!open) {
        var audio = holder.querySelector('audio');
        if (audio) audio.pause();
      }
    }

    var btn = document.getElementById('rec0-player-toggle');
    if (btn) btn.classList.toggle('active', open);
  }

  /* ---------- 在右侧设置面板注入开关按钮 ---------- */
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
    btn.addEventListener('click', function () {
      setOpen(!opened);
    });
    if (opened) btn.classList.add('active');

    box.insertBefore(btn, box.firstChild);
  }

  function init() {
    injectButton();
    // 默认关闭：不创建播放器、不请求歌单
  }

  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('pjax:complete', init);
})();
