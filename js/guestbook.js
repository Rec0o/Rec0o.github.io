(function () {
  function run() {
    var target = document.getElementById('recent-posts');
    if (!target) return;

    // 只在首页显示
    var path = location.pathname;
    if (path !== '/' && path !== '/index.html') return;

    // 防止重复插入
    if (document.querySelector('.guestbook')) return;

    var box = document.createElement('section');
    box.className = 'guestbook';
    box.innerHTML =
      '<h2 class="guestbook-title"><i class="fas fa-comments"></i> 留言板</h2>' +
      '<div class="giscus"></div>';
    target.appendChild(box);

    // 移除上一次注入的 giscus 脚本（PJAX 换页后需要重新加载）
    var old = document.querySelector('script[src*="giscus.app/client.js"]');
    if (old) old.remove();

    var s = document.createElement('script');
    s.src = 'https://giscus.app/client.js';
    s.setAttribute('data-repo', 'Rec0o/Rec0o.github.io');
    s.setAttribute('data-repo-id', 'R_kgDOVVA7_g');
    s.setAttribute('data-category', 'Announcements');
    s.setAttribute('data-category-id', 'DIC_kwDOVVA7_s4DJfEZ');
    s.setAttribute('data-mapping', 'pathname');
    s.setAttribute('data-strict', '0');
    s.setAttribute('data-reactions-enabled', '1');
    s.setAttribute('data-emit-metadata', '0');
    s.setAttribute('data-input-position', 'bottom');
    s.setAttribute('data-theme', 'preferred_color_scheme');
    s.setAttribute('data-lang', 'zh-CN');
    s.setAttribute('crossorigin', 'anonymous');
    s.async = true;
    document.body.appendChild(s);
  }

  document.addEventListener('DOMContentLoaded', run);
  document.addEventListener('pjax:complete', run);
})();
