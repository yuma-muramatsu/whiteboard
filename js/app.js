// ===== TaskGrid (whiteboard) - Main Application =====

(() => {
  'use strict';

  // --- State ---
  let state = {
    rows: 2,
    cols: 2,
    sets: []
  };

  const GRID_SIZE = 16; // 4x4
  const STORAGE_KEY = 'taskgrid_data_v2';

  // --- DOM References ---
  const setsGrid = document.getElementById('setsGrid');
  const addRowBtn = document.getElementById('addRowBtn');
  const addColBtn = document.getElementById('addColBtn');
  const collapseAllBtn = document.getElementById('collapseAllBtn');
  const resetBoardBtn = document.getElementById('resetBoardBtn');
  const toastEl = document.getElementById('toast');

  // --- Initialization ---
  function init() {
    // Try to load from localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        state = JSON.parse(saved);
      } catch (e) {
        state = { rows: 2, cols: 2, sets: [] };
      }
    }

    // Ensure state defaults
    if (!state.rows) state.rows = 4;
    if (!state.cols) state.cols = 4;
    if (!state.sets || state.sets.length === 0) {
      state.sets = [];
      const total = state.rows * state.cols;
      for (let i = 0; i < total; i++) {
        state.sets.push(createEmptySet());
      }
    }

    render();
    bindEvents();
  }

  // --- Data Helpers ---
  function createEmptySet() {
    const cells = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      cells.push({
        text: '',
        circle: false,  // ○
        triangle: false, // △
        square: false,   // □
        closed: false    // ✓
      });
    }
    return {
      id: generateId(),
      title: `セット`,
      collapsed: false,
      cells: cells
    };
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  function countActiveMarks(cell) {
    let count = 0;
    if (cell.circle) count++;
    if (cell.triangle) count++;
    if (cell.square) count++;
    return count;
  }

  function getSetStats(set) {
    const total = set.cells.length;
    const filled = set.cells.filter(c => c.text.trim() !== '').length;
    const closed = set.cells.filter(c => c.closed).length;
    return { total, filled, closed };
  }

  // --- Render ---
  function render() {
    // Update CSS Variable for dynamic grid columns
    document.documentElement.style.setProperty('--cols', state.cols);

    setsGrid.innerHTML = '';
    state.sets.forEach((set, setIndex) => {
      // Ensure titles update sequentially for UX if left as default
      if (set.title === 'セット' || set.title.startsWith('セット ')) {
        set.title = `セット ${setIndex + 1}`;
      }
      setsGrid.appendChild(renderSet(set, setIndex));
    });
    autoSave();
  }

  function renderSet(set, setIndex) {
    const setEl = document.createElement('div');
    setEl.className = 'task-set';
    setEl.dataset.setId = set.id;

    const stats = getSetStats(set);

    // Header
    const header = document.createElement('div');
    header.className = 'set-header';

    const headerLeft = document.createElement('div');
    headerLeft.className = 'set-header-left';

    const collapseIcon = document.createElement('span');
    collapseIcon.className = `set-collapse-icon ${set.collapsed ? 'collapsed' : ''}`;
    collapseIcon.textContent = '▼';

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'set-title-input';
    titleInput.value = set.title;
    titleInput.placeholder = 'セット名を入力...';
    titleInput.addEventListener('click', (e) => e.stopPropagation());
    titleInput.addEventListener('input', (e) => {
      set.title = e.target.value;
      autoSave();
    });

    const info = document.createElement('span');
    info.className = 'set-info';
    info.textContent = `${stats.filled}/${stats.total} 入力済 ・ ${stats.closed} 完了`;

    headerLeft.appendChild(collapseIcon);
    headerLeft.appendChild(titleInput);
    headerLeft.appendChild(info);

    const headerRight = document.createElement('div');
    headerRight.className = 'set-header-right';

    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'クリア';
    clearBtn.title = '内容をクリア';
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`「${set.title}」の内容をクリアしますか？`)) {
        set.cells.forEach(cell => {
          cell.text = '';
          cell.circle = false;
          cell.triangle = false;
          cell.square = false;
          cell.closed = false;
        });
        render();
        showToast('クリアしました');
      }
    });

    headerRight.appendChild(clearBtn);

    header.appendChild(headerLeft);
    header.appendChild(headerRight);

    // Collapse toggle on header click
    header.addEventListener('click', () => {
      set.collapsed = !set.collapsed;
      collapseIcon.classList.toggle('collapsed', set.collapsed);
      body.classList.toggle('collapsed', set.collapsed);
      autoSave();
    });

    // Body
    const body = document.createElement('div');
    body.className = `set-body ${set.collapsed ? 'collapsed' : ''}`;

    const grid = document.createElement('div');
    grid.className = 'task-grid';

    set.cells.forEach((cell, cellIndex) => {
      grid.appendChild(renderCell(cell, cellIndex, set));
    });

    body.appendChild(grid);

    setEl.appendChild(header);
    setEl.appendChild(body);

    return setEl;
  }

  function renderCell(cell, cellIndex, set) {
    const cellEl = document.createElement('div');
    cellEl.className = 'task-cell';

    // Apply mark intensity class
    const markCount = countActiveMarks(cell);
    if (markCount >= 3) {
      cellEl.classList.add('mark-3');
    } else if (markCount >= 2) {
      cellEl.classList.add('mark-2');
    }

    if (cell.closed) {
      cellEl.classList.add('closed');
    }

    // Text area
    const textEl = document.createElement('textarea');
    textEl.className = 'task-text';
    textEl.value = cell.text;
    textEl.placeholder = `タスク ${cellIndex + 1}`;
    textEl.rows = 2;
    textEl.addEventListener('input', (e) => {
      cell.text = e.target.value;
      autoResizeTextarea(e.target);
      updateSetInfo(cellEl, set);
      autoSave();
    });

    // Controls row
    const controls = document.createElement('div');
    controls.className = 'cell-controls';

    const marksGroup = document.createElement('div');
    marksGroup.className = 'marks-group';

    // ○ button
    const circleBtn = createMarkButton('○', cell.circle, () => {
      cell.circle = !cell.circle;
      updateCell(cellEl, cell);
      autoSave();
    });

    // △ button
    const triangleBtn = createMarkButton('△', cell.triangle, () => {
      cell.triangle = !cell.triangle;
      updateCell(cellEl, cell);
      autoSave();
    });

    // □ button
    const squareBtn = createMarkButton('□', cell.square, () => {
      cell.square = !cell.square;
      updateCell(cellEl, cell);
      autoSave();
    });

    marksGroup.appendChild(circleBtn);
    marksGroup.appendChild(triangleBtn);
    marksGroup.appendChild(squareBtn);

    // ✓ close button
    const closeBtn = document.createElement('button');
    closeBtn.className = `close-btn ${cell.closed ? 'active' : ''}`;
    closeBtn.textContent = '✓';
    closeBtn.title = '完了にする';
    closeBtn.addEventListener('click', () => {
      cell.closed = !cell.closed;
      updateCell(cellEl, cell);
      updateSetInfo(cellEl, set);
      autoSave();
    });

    controls.appendChild(marksGroup);
    controls.appendChild(closeBtn);

    cellEl.appendChild(textEl);
    cellEl.appendChild(controls);

    // Auto resize after render
    requestAnimationFrame(() => autoResizeTextarea(textEl));

    return cellEl;
  }

  function createMarkButton(symbol, isActive, onClick) {
    const btn = document.createElement('button');
    btn.className = `mark-btn ${isActive ? 'active' : ''}`;
    btn.textContent = symbol;
    btn.addEventListener('click', onClick);
    return btn;
  }

  function updateCell(cellEl, cell) {
    // Update mark classes
    const markCount = countActiveMarks(cell);
    cellEl.classList.remove('mark-2', 'mark-3');
    if (markCount >= 3) {
      cellEl.classList.add('mark-3');
    } else if (markCount >= 2) {
      cellEl.classList.add('mark-2');
    }

    // Update closed state
    cellEl.classList.toggle('closed', cell.closed);

    // Update button states
    const markBtns = cellEl.querySelectorAll('.mark-btn');
    const marks = [cell.circle, cell.triangle, cell.square];
    markBtns.forEach((btn, i) => {
      btn.classList.toggle('active', marks[i]);
    });

    const closeBtn = cellEl.querySelector('.close-btn');
    closeBtn.classList.toggle('active', cell.closed);
  }

  function updateSetInfo(cellEl, set) {
    const setEl = cellEl.closest('.task-set');
    if (setEl) {
      const infoEl = setEl.querySelector('.set-info');
      const stats = getSetStats(set);
      infoEl.textContent = `${stats.filled}/${stats.total} 入力済 ・ ${stats.closed} 完了`;
    }
  }

  function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  // --- Events ---
  function bindEvents() {
    // Add Row Button
    addRowBtn.addEventListener('click', () => {
      state.rows++;
      // Push 'cols' new sets to the end of the array
      for (let c = 0; c < state.cols; c++) {
        state.sets.push(createEmptySet());
      }
      render();
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      showToast('行を追加しました');
    });

    // Add Col Button
    addColBtn.addEventListener('click', () => {
      // Need to insert 1 set at the end of each existing row
      // We iterate backwards to avoid index shifting issues
      for (let r = state.rows - 1; r >= 0; r--) {
        const insertIndex = r * state.cols + state.cols;
        state.sets.splice(insertIndex, 0, createEmptySet());
      }
      state.cols++;
      render();
      window.scrollTo({ left: document.body.scrollWidth, behavior: 'smooth' });
      showToast('列を追加しました');
    });

    // Header Toggle (Collapse All)
    let allCollapsed = false;
    collapseAllBtn.addEventListener('click', () => {
      allCollapsed = !allCollapsed;
      state.sets.forEach(set => set.collapsed = allCollapsed);
      collapseAllBtn.textContent = allCollapsed ? '⊞ すべて展開' : '⊟ すべて折りたたむ';
      render();
    });

    // Reset Board
    resetBoardBtn.addEventListener('click', () => {
      if (confirm('ボードを初期化し、内容をすべて消去して 4×4 の構成に戻しますか？')) {
        state.rows = 4;
        state.cols = 4;
        state.sets = [];
        const total = state.rows * state.cols;
        for (let i = 0; i < total; i++) {
          state.sets.push(createEmptySet());
        }
        render();
        showToast('ボードをリセットしました');
      }
    });
  }

  // --- Auto Save ---
  function autoSave() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  // --- Toast ---
  let toastTimer = null;
  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('visible');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('visible');
    }, 2000);
  }

  // --- Start ---
  init();
})();
