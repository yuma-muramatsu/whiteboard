// ===== TaskGrid - Main Application =====

(() => {
  'use strict';

  // --- State ---
  let state = {
    sets: []
  };

  const GRID_SIZE = 16; // 4x4
  const DEFAULT_SET_COUNT = 4;
  const STORAGE_KEY = 'taskgrid_data';

  // --- DOM References ---
  const setsContainer = document.getElementById('setsContainer');
  const addSetBtn = document.getElementById('addSetBtn');
  const collapseAllBtn = document.getElementById('collapseAllBtn');
  const saveBtn = document.getElementById('saveBtn');
  const loadBtn = document.getElementById('loadBtn');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const importInput = document.getElementById('importInput');
  const toastEl = document.getElementById('toast');

  // --- Initialization ---
  function init() {
    // Try to load from localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        state = JSON.parse(saved);
      } catch (e) {
        state = { sets: [] };
      }
    }

    // Ensure at least DEFAULT_SET_COUNT sets
    if (state.sets.length === 0) {
      for (let i = 0; i < DEFAULT_SET_COUNT; i++) {
        state.sets.push(createEmptySet(i + 1));
      }
    }

    render();
    bindHeaderEvents();
  }

  // --- Data Helpers ---
  function createEmptySet(num) {
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
      title: `セット ${num}`,
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
    setsContainer.innerHTML = '';
    state.sets.forEach((set, setIndex) => {
      setsContainer.appendChild(renderSet(set, setIndex));
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
    clearBtn.title = 'このセットの内容をクリア';
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`「${set.title || 'このセット'}」の内容をクリアしますか？`)) {
        set.cells.forEach(cell => {
          cell.text = '';
          cell.circle = false;
          cell.triangle = false;
          cell.square = false;
          cell.closed = false;
        });
        render();
        showToast('セットをクリアしました');
      }
    });

    const moveUpBtn = document.createElement('button');
    moveUpBtn.textContent = '↑';
    moveUpBtn.title = '上へ移動';
    moveUpBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (setIndex > 0) {
        [state.sets[setIndex - 1], state.sets[setIndex]] = [state.sets[setIndex], state.sets[setIndex - 1]];
        render();
      }
    });

    const moveDownBtn = document.createElement('button');
    moveDownBtn.textContent = '↓';
    moveDownBtn.title = '下へ移動';
    moveDownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (setIndex < state.sets.length - 1) {
        [state.sets[setIndex], state.sets[setIndex + 1]] = [state.sets[setIndex + 1], state.sets[setIndex]];
        render();
      }
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '✕ 削除';
    deleteBtn.className = 'btn-danger';
    deleteBtn.title = 'このセットを削除';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (state.sets.length <= 1) {
        showToast('最後のセットは削除できません');
        return;
      }
      if (confirm(`「${set.title || 'このセット'}」を削除しますか？`)) {
        state.sets.splice(setIndex, 1);
        render();
        showToast('セットを削除しました');
      }
    });

    headerRight.appendChild(clearBtn);
    headerRight.appendChild(moveUpBtn);
    headerRight.appendChild(moveDownBtn);
    headerRight.appendChild(deleteBtn);

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

  // --- Header Events ---
  function bindHeaderEvents() {
    addSetBtn.addEventListener('click', () => {
      const num = state.sets.length + 1;
      state.sets.push(createEmptySet(num));
      render();
      // Scroll to new set
      requestAnimationFrame(() => {
        const lastSet = setsContainer.lastElementChild;
        if (lastSet) {
          lastSet.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
      showToast('セットを追加しました');
    });

    let allCollapsed = false;
    collapseAllBtn.addEventListener('click', () => {
      allCollapsed = !allCollapsed;
      state.sets.forEach(set => set.collapsed = allCollapsed);
      collapseAllBtn.textContent = allCollapsed ? '⊞ すべて展開' : '⊟ すべて折りたたむ';
      render();
    });

    saveBtn.addEventListener('click', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      showToast('保存しました');
    });

    loadBtn.addEventListener('click', () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          state = JSON.parse(saved);
          render();
          showToast('読み込みました');
        } catch (e) {
          showToast('読み込みに失敗しました');
        }
      } else {
        showToast('保存データがありません');
      }
    });

    exportBtn.addEventListener('click', () => {
      const dataStr = JSON.stringify(state, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `taskgrid_${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('エクスポートしました');
    });

    importBtn.addEventListener('click', () => {
      importInput.click();
    });

    importInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const imported = JSON.parse(reader.result);
          if (imported.sets && Array.isArray(imported.sets)) {
            state = imported;
            render();
            showToast('インポートしました');
          } else {
            showToast('無効なファイル形式です');
          }
        } catch (err) {
          showToast('インポートに失敗しました');
        }
      };
      reader.readAsText(file);
      importInput.value = '';
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
