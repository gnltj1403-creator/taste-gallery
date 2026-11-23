var cards = document.querySelectorAll(".card.reveal");

if ("IntersectionObserver" in window) {
  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle("is-visible", entry.isIntersecting);
      });
    },
    { threshold: 0.15 }
  );
  cards.forEach(function (card) {
    observer.observe(card);
  });
} else {
  cards.forEach(function (card) {
    card.classList.add("is-visible");
  });
}
