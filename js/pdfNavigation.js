(function () {
  var links = document.querySelectorAll('.task-picker a');
  var panels = document.querySelectorAll('.pdf-section');
  function selectTask() {
    var selected = Array.prototype.find.call(links, function (a) { return a.hash === location.hash; }) || links[0];
    panels.forEach(function (panel) { panel.hidden = '#' + panel.id !== selected.hash; });
    links.forEach(function (a) { if (a === selected) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
  }
  window.addEventListener('hashchange', selectTask);
  selectTask();
})();
