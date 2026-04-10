/* ── File-tree data ──────────────────────────────────────────────────────── */
const TREE_DATA = [
  {
    label: '00_ADMIN',
    icon: '📋',
    page: 'pages/admin.html',
    badge: 'admin',
    children: []
  },
  {
    label: '01_SONGS',
    icon: '🎵',
    page: 'pages/songs.html',
    badge: 'songs',
    children: [
      { label: '01_ORIGINALS',      icon: '✍️',  page: 'pages/songs.html#originals' },
      { label: '02_COVERS',         icon: '🎸',  page: 'pages/songs.html#covers'    },
      { label: '99_IDEAS_SNIPPETS', icon: '💡',  page: 'pages/songs.html#ideas'     }
    ]
  },
  {
    label: '02_SETLISTS',
    icon: '📝',
    page: 'pages/setlists.html',
    badge: 'setlists',
    children: []
  },
  {
    label: '03_MEDIA',
    icon: '📸',
    page: 'pages/media.html',
    badge: 'media',
    children: []
  },
  {
    label: '04_RELEASES',
    icon: '💿',
    page: 'pages/releases.html',
    badge: 'releases',
    children: []
  },
  {
    label: '05_LIVE',
    icon: '🎤',
    page: 'pages/live.html',
    badge: 'live',
    children: []
  },
  {
    label: '06_BAND_MEMBERS',
    icon: '👥',
    page: 'pages/members.html',
    badge: 'members',
    children: [
      { label: '00_TEMPLATE – Copy for new member', icon: '📄', page: 'pages/members.html' },
      { label: 'Johnny',  icon: '🎸', page: 'pages/member-johnny.html'  },
      { label: 'Damian',  icon: '🥁', page: 'pages/member-damian.html'  },
      { label: 'Sam',     icon: '🎹', page: 'pages/member-sam.html'     },
      { label: 'Nick',    icon: '🎤', page: 'pages/member-nick.html'    },
      { label: 'Matt',    icon: '🎸', page: 'pages/member-matt.html'    }
    ]
  },
  {
    label: '07_SUGGESTED_SONGS',
    icon: '🔍',
    page: 'pages/suggested.html',
    badge: 'ideas',
    children: [
      { label: '01_Suggested Covers',    icon: '🎶', page: 'pages/suggested.html#covers'    },
      { label: '02_Suggested Originals', icon: '🎼', page: 'pages/suggested.html#originals' }
    ]
  },
  {
    label: '99_ARCHIVE',
    icon: '🗄️',
    page: 'pages/archive.html',
    badge: 'archive',
    children: []
  }
];

/* ── Build tree DOM ──────────────────────────────────────────────────────── */
function buildTree(items, depth = 1) {
  const ul = document.createElement('ul');
  ul.className = 'tree';
  if (depth > 1) ul.style.paddingLeft = '0';

  items.forEach(item => {
    const li = document.createElement('li');
    li.dataset.depth = depth;

    const hasChildren = item.children && item.children.length > 0;

    // Row element — anchor if it has a page link, div otherwise
    const row = document.createElement('div');
    row.className = 'tree-row' + (hasChildren ? ' is-folder' : ' is-link');

    // Caret (only if has children)
    const caret = document.createElement('span');
    caret.className = 'caret';
    caret.textContent = hasChildren ? '▶' : '';
    row.appendChild(caret);

    // Icon
    const iconSpan = document.createElement('span');
    iconSpan.textContent = item.icon || (hasChildren ? '📁' : '📄');
    iconSpan.style.fontSize = '1em';
    row.appendChild(iconSpan);

    // Label
    const label = document.createElement('span');
    label.className = 'tree-label';
    label.textContent = item.label;
    row.appendChild(label);

    // Badge (top-level only)
    if (item.badge && depth === 1) {
      const badge = document.createElement('span');
      badge.className = 'tree-badge';
      badge.textContent = item.badge;
      row.appendChild(badge);
    }

    li.appendChild(row);

    if (hasChildren) {
      // Folder: clicking toggles children
      const childUl = buildTree(item.children, depth + 1);
      li.appendChild(childUl);

      row.addEventListener('click', (e) => {
        const isOpen = childUl.classList.toggle('open');
        caret.classList.toggle('open', isOpen);
      });

      // Double-click navigates to the section page
      if (item.page) {
        row.title = `Double-click to open ${item.label} page`;
        row.addEventListener('dblclick', () => {
          window.location.href = item.page;
        });
      }
    } else {
      // Leaf: single click navigates
      row.style.cursor = 'pointer';
      row.addEventListener('click', () => {
        if (item.page) window.location.href = item.page;
      });
    }

    ul.appendChild(li);
  });

  return ul;
}

/* ── Expand / collapse all ───────────────────────────────────────────────── */
function expandAll() {
  document.querySelectorAll('ul.tree ul').forEach(ul => ul.classList.add('open'));
  document.querySelectorAll('.caret').forEach(c => c.classList.add('open'));
}

function collapseAll() {
  document.querySelectorAll('ul.tree ul').forEach(ul => ul.classList.remove('open'));
  document.querySelectorAll('.caret').forEach(c => c.classList.remove('open'));
}

/* ── Init ────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const treeContainer = document.getElementById('file-tree');
  if (treeContainer) {
    const tree = buildTree(TREE_DATA);
    treeContainer.appendChild(tree);
  }

  const btnExpand   = document.getElementById('btn-expand');
  const btnCollapse = document.getElementById('btn-collapse');
  if (btnExpand)   btnExpand.addEventListener('click', expandAll);
  if (btnCollapse) btnCollapse.addEventListener('click', collapseAll);

  // Highlight active nav link
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav.site-nav a').forEach(a => {
    const href = a.getAttribute('href').split('/').pop();
    if (href === currentPage) a.classList.add('active');
  });
});
