(function () {
  function run() {
    // 仅「数字艺术」分类页启用图廊样式
    var path = decodeURIComponent(location.pathname);
    if (path.indexOf('/categories/数字艺术') === -1) return;

    var inner = document.getElementById('content-inner');
    if (inner) inner.classList.add('gallery-page');
  }

  document.addEventListener('DOMContentLoaded', run);
  document.addEventListener('pjax:complete', run);
})();
