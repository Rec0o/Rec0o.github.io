(function () {
  var KEY = 'rec0_loader_seen';
  var REVEAL = 1200; // 字符逐个出现的时间跨度
  var CHURN = 300;   // 每个字符出现后继续变化的时间
  var HOLD = 500;    // 完整图像停留
  var FADE = 500;    // 渐隐时长
  var GLOW_DELAY = 200; // 起亮延迟

  // 最终的 REC0 ASCII 图形（空格表示留白）
  var ART = [
    '@@@@@@@   @@@@@@@@   @@@@@@@   @@@@@@@@   ',
    '@@@@@@@@  @@@@@@@@  @@@@@@@@  @@@@@@@@@@  ',
    '@@!  @@@  @@!       !@@       @@!   @@@@  ',
    '!@!  @!@  !@!       !@!       !@!  @!@!@  ',
    '@!@!!@!   @!!!:!    !@!       @!@ @! !@!  ',
    '!!@!@!    !!!!!:    !!!       !@!!!  !!!  ',
    '!!: :!!   !!:       :!!       !!:!   !!!  ',
    ':!:  !:!  :!:       :!:       :!:    !:!  ',
    '::   :::   :: ::::   ::: :::  ::::::: ::  ',
    ' :   : :  : :: ::    :: :: :   : : :  :   '
  ];

  // 闪烁用的乱码字符集
  var NOISE = '!<>-_\\/[]{}=+*^?#$%&@0123456789ABCDEFXYZ';

  var seen = false;
  try { seen = !!localStorage.getItem(KEY); } catch (e) {}

  function finish() {
    document.documentElement.classList.remove('rec0-loading');
    var el = document.getElementById('rec0-loader');
    if (el) el.remove();
    try { localStorage.setItem(KEY, '1'); } catch (e) {}
  }

  if (seen) { finish(); return; }

  function build() {
    var pre = document.createElement('pre');
    pre.className = 'rec0-ascii';

    var cells = []; // {el, ch, revealAt, done}

    for (var i = 0; i < ART.length; i++) {
      var row = ART[i];
      for (var j = 0; j < row.length; j++) {
        var ch = row[j];
        if (ch === ' ') {
          pre.appendChild(document.createTextNode(' '));
        } else {
          var s = document.createElement('span');
          s.className = 'c';
          // 出现前：占位但不可见（不留暗色影子）
          s.textContent = NOISE[Math.floor(Math.random() * NOISE.length)];
          pre.appendChild(s);
          cells.push({
            el: s,
            ch: ch,
            appearAt: Math.random() * REVEAL,
            shown: false
          });
        }
      }
      pre.appendChild(document.createTextNode('\n'));
    }

    var wrap = document.createElement('div');
    wrap.id = 'rec0-loader';

    // 中心渐亮的光晕层（灯泡点亮效果）
    var glow = document.createElement('div');
    glow.className = 'rec0-glow';

    wrap.appendChild(glow);
    wrap.appendChild(pre);
    document.body.appendChild(wrap);

    var start = (window.performance && performance.now) ? performance.now() : Date.now();
    var flicker = setInterval(function () {
      for (var k = 0; k < cells.length; k++) {
        var c = cells[k];
        if (c.shown && !c.done) {
          c.el.textContent = NOISE[Math.floor(Math.random() * NOISE.length)];
        }
      }
    }, 110);

    function tick() {
      var now = (window.performance && performance.now) ? performance.now() : Date.now();
      var t = now - start;

      // 中心亮度随字符出现逐步增强（延迟 0.5s 起亮，先快后缓）
      var p = Math.min(Math.max((t - GLOW_DELAY) / (REVEAL + CHURN - GLOW_DELAY), 0), 1);
      var e = 1 - Math.pow(1 - p, 2.2);
      glow.style.opacity = e.toFixed(3);
      glow.style.transform = 'scale(' + (0.92 + 0.16 * e).toFixed(3) + ')';

      for (var k = 0; k < cells.length; k++) {
        var c = cells[k];
        // 从无到有：到达出现时间才显示
        if (!c.shown && t >= c.appearAt) {
          c.shown = true;
          c.el.classList.add('show');
        }
        // 出现后继续变化 CHURN 毫秒，再定格为最终字符
        if (c.shown && !c.done && t >= c.appearAt + CHURN) {
          c.done = true;
          c.el.textContent = c.ch;
          c.el.classList.add('on');
        }
      }

      if (t < REVEAL + CHURN + HOLD) {
        requestAnimationFrame(tick);
      } else {
        clearInterval(flicker);
        wrap.classList.add('hide');
        setTimeout(finish, FADE);
      }
    }
    requestAnimationFrame(tick);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
