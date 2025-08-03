// Toggle nav menu
function toggleMenu() {
    const navLinks = document.getElementById('nav-links');
    navLinks.classList.toggle('hidden');
  }


  // Set year in footer
  const yearSpan = document.getElementById('year');
  yearSpan.textContent = new Date().getFullYear();