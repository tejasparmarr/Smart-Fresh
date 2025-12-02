(() => {
  const DUR = 450;

  // Reuse existing curtain if present to avoid stacking above the drawer
  let curtain = document.querySelector('.page-curtain');
  if(!curtain){
    curtain = document.createElement('div');
    curtain.className = 'page-curtain';
    document.body.appendChild(curtain);
  }

  requestAnimationFrame(() => {
    document.documentElement.classList.add('route-enter');
    document.documentElement.offsetHeight;
    document.documentElement.classList.add('route-enter-active', 'route-ready');
    setTimeout(() => {
      document.documentElement.classList.remove('route-enter','route-enter-active');
    }, DUR);
  });

  function enhanceLink(a){
    const href = a.getAttribute('href');
    // Skip anchors, new tabs, and any links inside the mobile drawer
    if(!href || href.startsWith('#') || a.closest('#mobileDrawer')) return;

    a.addEventListener('click', (ev) => {
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || a.target === '_blank') return;
      ev.preventDefault();
      a.setAttribute('aria-busy','true');

      document.documentElement.classList.add('route-exit');
      document.documentElement.offsetHeight;
      document.documentElement.classList.add('route-exit-active');

      setTimeout(() => { window.location.href = href; }, DUR);
    });
  }

  document.querySelectorAll('a').forEach(enhanceLink);
})();
