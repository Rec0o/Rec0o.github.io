(function () {
  function run() {
    var contentInner = document.getElementById('content-inner');
    if (!contentInner) return;

    // 只在首页显示
    var path = location.pathname;
    if (path !== '/' && path !== '/index.html') return;
    if (!document.getElementById('recent-posts')) return;

    // 标记首页，供 CSS 作用域使用
    contentInner.classList.add('home-page');

    // 防止重复插入
    if (document.querySelector('.right-nav')) return;

    var nav = document.createElement('aside');
    nav.className = 'right-nav';

    var items = [
      ['技术博客', '/categories/技术博客/'],
      ['社会工程', '/categories/社会工程/'],
      ['随笔杂谈', '/categories/随笔杂谈/'],
      ['数字艺术', '/categories/数字艺术/']
    ];

    nav.innerHTML = items.map(function (i) {
      return '<a class="nav-card" href="' + i[1] + '">' + i[0] + '</a>';
    }).join('');

    contentInner.appendChild(nav);
  }

  document.addEventListener('DOMContentLoaded', run);
  document.addEventListener('pjax:complete', run);
})();
