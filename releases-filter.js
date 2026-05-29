(function () {
  const CATEGORIES = [
    { emoji: '🆕', key: 'new',     label: 'Новое' },
    { emoji: '✨', key: 'improve', label: 'Улучшения' },
    { emoji: '🔧', key: 'fix',     label: 'Исправления' },
    { emoji: '🚀', key: 'perf',    label: 'Производительность' },
  ];

  const STYLE = `
    .rn-filter {
      display: inline-flex;
      flex-wrap: wrap;
      gap: 12px 20px;
      margin: 16px 0 24px;
      padding: 12px 16px;
      background: #f5f7fa;
      border: 1px solid #e1e4e8;
      border-radius: 8px;
      width: fit-content;
      max-width: 100%;
    }
    .rn-check {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      color: #24292f;
      cursor: pointer;
      user-select: none;
    }
    .rn-check input {
      margin: 0;
      cursor: pointer;
    }
    .rn-hidden { display: none !important; }
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
        node.dataset.rnSection = '1';
        let sub = node.nextElementSibling;
        while (sub && sub.tagName !== 'H3' && sub.tagName !== 'H2') {
          if (sub.tagName === 'UL') {
            sub.querySelectorAll(':scope > li').forEach((li) => {
              li.dataset.rnCategory = categorize(li.textContent);
            });
          }
          sub = sub.nextElementSibling;
        }
      }
      node = node.nextElementSibling;
    }
  }

  function applyFilter(content, active) {
    content.querySelectorAll('li[data-rn-category]').forEach((li) => {
      const cat = li.dataset.rnCategory;
      const visible = cat === 'other' || active.has(cat);
      li.classList.toggle('rn-hidden', !visible);
    });
    content.querySelectorAll('h3[data-rn-section]').forEach((h3) => {
      let hasVisible = false;
      let node = h3.nextElementSibling;
      while (node && node.tagName !== 'H3' && node.tagName !== 'H2') {
        if (node.tagName === 'UL') {
          node.querySelectorAll(':scope > li').forEach((li) => {
            if (!li.classList.contains('rn-hidden')) hasVisible = true;
          });
        }
        node = node.nextElementSibling;
      }
      h3.classList.toggle('rn-hidden', !hasVisible);
    });
  }

  function buildToolbar(content) {
    const bar = document.createElement('div');
    bar.className = 'rn-filter';
    bar.innerHTML = CATEGORIES.map(c => `
      <label class="rn-check">
        <input type="checkbox" checked data-cat="${c.key}">
        <span>${c.emoji} ${c.label}</span>
      </label>
    `).join('');

    const active = new Set(CATEGORIES.map(c => c.key));
    bar.addEventListener('change', (e) => {
      const cb = e.target.closest('input[type="checkbox"]');
      if (!cb) return;
      const cat = cb.dataset.cat;
      if (cb.checked) active.add(cat); else active.delete(cat);
      applyFilter(content, active);
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
    content.dataset.rnEnhanced = '1';
  }

  window.$docsify = window.$docsify || {};
  window.$docsify.plugins = (window.$docsify.plugins || []).concat(function (hook) {
    hook.doneEach(enhance);
  });
})();
