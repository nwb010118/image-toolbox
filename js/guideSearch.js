var guideSearchInput = document.getElementById('guideSearch');
var guideSearchEmpty = document.getElementById('guideSearchEmpty');
var guideGrids = document.querySelectorAll('.guide-grid');

guideSearchInput.addEventListener('input', function () {
  var query = guideSearchInput.value.trim().toLowerCase();
  var visibleCount = 0;

  guideGrids.forEach(function (grid) {
    var section = grid.closest('.info-section');
    var cards = grid.querySelectorAll('.guide-card');
    var visibleInSection = 0;

    cards.forEach(function (card) {
      var title = card.querySelector('.card-title');
      var description = card.querySelector('.card-description');
      var text = ((title ? title.textContent : '') + ' ' + (description ? description.textContent : '')).toLowerCase();
      var matches = query === '' || text.indexOf(query) !== -1;
      card.hidden = !matches;
      if (matches) {
        visibleInSection += 1;
      }
    });

    section.hidden = visibleInSection === 0;
    visibleCount += visibleInSection;
  });

  guideSearchEmpty.hidden = visibleCount > 0;
});
