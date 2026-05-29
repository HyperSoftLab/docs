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
    .rn-latest {
      display: inline-flex;
      flex-direction: column;
      gap: 10px;
      margin: 16px 0 24px;
      padding: 14px 20px;
      background: #eef7f1;
      border: 1px solid #cce7d6;
      border-radius: 8px;
      color: #24292f;
    }
    .rn-latest-head {
      display: flex;
      align-items: baseline;
      gap: 12px;
    }
    .rn-latest-label { font-size: 14px; color: #57606a; }
    .rn-latest-tag {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 18px;
      font-weight: 600;
      color: #1a7f4e;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .rn-latest-images {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .rn-latest-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .rn-latest-row code {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 13px;
      color: #24292f;
      background: rgba(0,0,0,0.04);
      padding: 4px 10px;
      border-radius: 4px;
    }
    .rn-copy-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      padding: 0;
      background: transparent;
      border: 1px solid #cce7d6;
      border-radius: 4px;
      color: #1a7f4e;
      cursor: pointer;
      flex-shrink: 0;
      transition: background .15s, color .15s, border-color .15s;
    }
    .rn-copy-btn:hover { background: rgba(26,127,78,0.12); }
    .rn-copy-btn.rn-copied {
      background: #1a7f4e;
      color: #fff;
      border-color: #1a7f4e;
    }
    .rn-copy-btn svg { display: block; }
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

  function findLatestBuild(rnHeading) {
    let node = rnHeading.nextElementSibling;
    while (node && node.tagName !== 'H2') {
      if (node.tagName === 'UL') {
        for (const li of node.querySelectorAll(':scope > li')) {
          const m = li.textContent.match(/v4-\d+/);
          if (m) return m[0];
        }
      }
      node = node.nextElementSibling;
    }
    return null;
  }

  const ICON_COPY = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  const ICON_CHECK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

  function makeCopyButton(text) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rn-copy-btn';
    btn.setAttribute('aria-label', 'Копировать');
    btn.title = 'Скопировать';
    btn.innerHTML = ICON_COPY;
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(text);
        btn.innerHTML = ICON_CHECK;
        btn.classList.add('rn-copied');
        setTimeout(() => {
          btn.innerHTML = ICON_COPY;
          btn.classList.remove('rn-copied');
        }, 900);
      } catch (_) {}
    });
    return btn;
  }

  function buildLatestBanner(tag) {
    const div = document.createElement('div');
    div.className = 'rn-latest';
    div.innerHTML = `
      <div class="rn-latest-head">
        <span class="rn-latest-label">Последняя стабильная сборка:</span>
        <code class="rn-latest-tag">${tag}</code>
      </div>
      <div class="rn-latest-images">
        <div class="rn-latest-row"><code>cr.yandex/gmonit.ru/collector:${tag}</code></div>
        <div class="rn-latest-row"><code>cr.yandex/gmonit.ru/grafana:${tag}</code></div>
      </div>
    `;
    div.querySelector('.rn-latest-head').appendChild(makeCopyButton(tag));
    div.querySelectorAll('.rn-latest-row').forEach((row) => {
      row.appendChild(makeCopyButton(row.querySelector('code').textContent));
    });
    return div;
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

    const h1 = content.querySelector('h1');
    const latest = findLatestBuild(rnHeading);
    if (h1 && latest) {
      h1.insertAdjacentElement('afterend', buildLatestBanner(latest));
    }

    rnHeading.insertAdjacentElement('afterend', buildToolbar(content));
    content.dataset.rnEnhanced = '1';
  }

  window.$docsify = window.$docsify || {};
  window.$docsify.plugins = (window.$docsify.plugins || []).concat(function (hook) {
    hook.doneEach(enhance);
  });
})();
