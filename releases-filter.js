(function () {
  const CATEGORIES = [
    { emoji: '🆕', key: 'new',     label: 'Новое' },
    { emoji: '✨', key: 'improve', label: 'Улучшения' },
    { emoji: '🔧', key: 'fix',     label: 'Исправления' },
    { emoji: '🚀', key: 'perf',    label: 'Производительность' },
  ];

  const STYLE = `
    .rn-filter {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 16px 0 24px;
    }
    .rn-chip {
      background: #f5f7fa;
      border: 1px solid #d0d7de;
      color: #24292f;
      border-radius: 999px;
      padding: 6px 14px;
      font-size: 13px;
      cursor: pointer;
      transition: background .15s, border-color .15s, color .15s;
    }
    .rn-chip:hover { background: #eaeef2; }
    .rn-chip.active {
      background: #42b983;
      border-color: #42b983;
      color: #fff;
    }
    [data-rn-filter="new"]     li[data-rn-category]:not([data-rn-category="new"]),
    [data-rn-filter="improve"] li[data-rn-category]:not([data-rn-category="improve"]),
    [data-rn-filter="fix"]     li[data-rn-category]:not([data-rn-category="fix"]),
    [data-rn-filter="perf"]    li[data-rn-category]:not([data-rn-category="perf"]) {
      display: none;
    }
    [data-rn-filter="new"]     h3[data-rn-has]:not([data-rn-has~="new"]),
    [data-rn-filter="improve"] h3[data-rn-has]:not([data-rn-has~="improve"]),
    [data-rn-filter="fix"]     h3[data-rn-has]:not([data-rn-has~="fix"]),
    [data-rn-filter="perf"]    h3[data-rn-has]:not([data-rn-has~="perf"]) {
      display: none;
    }
  `;

  function categorize(text) {
    for (const c of CATEGORIES) if (text.includes(c.emoji)) return c.key;
    return 'other';
  }

  function injectStyles() {
    if (document.getElementById('rn-filter-style')) return;
    const el = document.createElement('style');
    el.id = 'rn-filter-style';
    el.textContent = STYLE;
    document.head.appendChild(el);
  }

  function tagItems(rnHeading) {
    let node = rnHeading.nextElementSibling;
    while (node && node.tagName !== 'H2') {
      if (node.tagName === 'H3') {
        const cats = new Set();
        let sub = node.nextElementSibling;
        while (sub && sub.tagName !== 'H3' && sub.tagName !== 'H2') {
          if (sub.tagName === 'UL') {
            sub.querySelectorAll(':scope > li').forEach((li) => {
              const cat = categorize(li.textContent);
              li.dataset.rnCategory = cat;
              if (cat !== 'other') cats.add(cat);
            });
          }
          sub = sub.nextElementSibling;
        }
        node.dataset.rnHas = [...cats].join(' ');
      }
      node = node.nextElementSibling;
    }
  }

  function buildToolbar(content) {
    const bar = document.createElement('div');
    bar.className = 'rn-filter';
    bar.innerHTML = [
      '<button class="rn-chip active" data-filter="all">Все</button>',
      ...CATEGORIES.map(c =>
        `<button class="rn-chip" data-filter="${c.key}">${c.emoji} ${c.label}</button>`
      )
    ].join('');
    bar.addEventListener('click', (e) => {
      const btn = e.target.closest('.rn-chip');
      if (!btn) return;
      bar.querySelectorAll('.rn-chip').forEach(b => b.classList.toggle('active', b === btn));
      content.dataset.rnFilter = btn.dataset.filter;
    });
    return bar;
  }

  function enhance() {
    const path = (window.location.hash || '').split('?')[0];
    if (!path.includes('releases')) return;

    const content = document.querySelector('.markdown-section');
    if (!content) return;
    if (content.dataset.rnEnhanced) return;

    const rnHeading = [...content.querySelectorAll('h2')]
      .find(h => h.textContent.trim().startsWith('Release notes'));
    if (!rnHeading) return;

    injectStyles();
    tagItems(rnHeading);
    rnHeading.insertAdjacentElement('afterend', buildToolbar(content));
    content.dataset.rnFilter = 'all';
    content.dataset.rnEnhanced = '1';
  }

  window.$docsify = window.$docsify || {};
  window.$docsify.plugins = (window.$docsify.plugins || []).concat(function (hook) {
    hook.doneEach(enhance);
  });
})();
