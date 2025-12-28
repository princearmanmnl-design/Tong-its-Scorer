// gamerules.js - full ready-to-copy file
document.addEventListener('DOMContentLoaded', () => {
  // ---------- DOM references ----------
  const numPlayersSelect = document.getElementById('numPlayers');
  const playerNamesContainer = document.getElementById('playerNames');

  const stackableSelect = document.getElementById('stackableStreak');
  const streakBaseInput = document.getElementById('streakBase');
  const streakPerStackWrap = document.getElementById('streakPerStackWrap');
  const streakPerStackInput = document.getElementById('streakPerStack');

  const fighterChk = document.getElementById('fighterPaysMoreChk');
  const saveBtn = document.getElementById('saveRulesBtn');
  const resetBtn = document.getElementById('resetRulesBtn');
  const backBtn = document.querySelector('.gamerulesHeader .returnBtn');

  // fight detail elements (guard existence)
  const fighterLossEl = document.getElementById('fighterLoss');
  const nonFighterLossEl = document.getElementById('nonFighterLoss');
  const countDeadwoodChkEl = document.getElementById('countDeadwoodChk');
  const deadwoodValueEl = document.getElementById('deadwoodValue');

  // ---------- Helpers ----------
  function setCheckboxValue(idCheckbox, idNumber, data) {
    if (!data) return;
    const cb = document.getElementById(idCheckbox);
    const num = document.getElementById(idNumber);
    if (cb) cb.checked = !!data.enabled;
    if (num && typeof data.value !== 'undefined') num.value = data.value;
  }

  function setSimpleCheckbox(id, value) {
    const el = document.getElementById(id);
    if (el) el.checked = !!value;
  }

  function setInputValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = (typeof value !== 'undefined' ? value : '');
  }

  // ---------- Player inputs rendering ----------
  function renderPlayerInputs(numPlayers, savedNames = []) {
    playerNamesContainer.innerHTML = '';

    for (let i = 1; i <= numPlayers; i++) {
      const div = document.createElement('div');
      div.classList.add('playerNameRow');

      const label = document.createElement('label');
      label.setAttribute('for', `player${i}Name`);
      label.textContent = `Player ${i} Name:`;

      const input = document.createElement('input');
      input.type = 'text';
      input.id = `player${i}Name`;
      input.placeholder = `Enter name`;
      input.value = savedNames[i - 1] || '';

      div.appendChild(label);
      div.appendChild(input);
      playerNamesContainer.appendChild(div);
    }
  }

  // When number-of-players changes, preserve current typed names if possible
  numPlayersSelect && numPlayersSelect.addEventListener('change', () => {
    const numPlayers = parseInt(numPlayersSelect.value) || 0;

    // collect existing names (up to 4)
    const existingNames = [];
    for (let i = 1; i <= 4; i++) {
      const input = document.getElementById(`player${i}Name`);
      existingNames.push(input ? input.value : '');
    }

    renderPlayerInputs(numPlayers, existingNames);
  });

  // ---------- +/- buttons ----------
  function findNumberInput(btn) {
    let parent = btn.parentElement;
    while (parent && parent !== document.body) {
      const input = parent.querySelector('input[type="number"]');
      if (input) return input;
      parent = parent.parentElement;
    }
    // fallback
    let prev = btn.previousElementSibling;
    while (prev) {
      if (prev.tagName === 'INPUT' && prev.type === 'number') return prev;
      prev = prev.previousElementSibling;
    }
    let next = btn.nextElementSibling;
    while (next) {
      if (next.tagName === 'INPUT' && next.type === 'number') return next;
      next = next.nextElementSibling;
    }
    return null;
  }

  function initPlusMinusButtons() {
    document.querySelectorAll('.increaseBtn').forEach(btn => {
      // avoid double binding - simple guard
      btn.addEventListener('click', () => {
        const input = findNumberInput(btn);
        if (!input) return;
        input.value = Math.max(0, parseInt(input.value || 0) + 1);
      });
    });
    document.querySelectorAll('.decreaseBtn').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = findNumberInput(btn);
        if (!input) return;
        input.value = Math.max(0, parseInt(input.value || 0) - 1);
      });
    });
  }
  initPlusMinusButtons();

  // ---------- Win streak visibility ----------
  function updateStreakVisibility() {
    if (!streakPerStackWrap || !stackableSelect) return;
    const stackable = stackableSelect.value === 'yes';
    streakPerStackWrap.style.display = stackable ? 'flex' : 'none';
  }
  stackableSelect && stackableSelect.addEventListener('change', updateStreakVisibility);

  // ---------- Fight visibility ----------
  function updateFightVisibility() {
    const show = fighterChk ? fighterChk.checked : false;
    // show/hide fighter detail rows (safe-guard)
    if (fighterLossEl && fighterLossEl.parentElement) fighterLossEl.parentElement.style.display = show ? 'flex' : 'none';
    if (nonFighterLossEl && nonFighterLossEl.parentElement) nonFighterLossEl.parentElement.style.display = show ? 'flex' : 'none';
    if (countDeadwoodChkEl && countDeadwoodChkEl.parentElement) countDeadwoodChkEl.parentElement.style.display = show ? 'flex' : 'none';
    if (deadwoodValueEl && deadwoodValueEl.parentElement) deadwoodValueEl.parentElement.style.display = show ? 'flex' : 'none';
  }
  fighterChk && fighterChk.addEventListener('change', updateFightVisibility);

  // ---------- Load rules from localStorage and apply to UI ----------
  function loadRules() {
    const savedRules = JSON.parse(localStorage.getItem('tongitsRules') || 'null');
    if (!savedRules) return;

    // Players
    if (Array.isArray(savedRules.players) && savedRules.players.length > 0) {
      numPlayersSelect && (numPlayersSelect.value = savedRules.players.length);
      renderPlayerInputs(savedRules.players.length, savedRules.players);
    }

    // Card values (king, queen, jack, ace)
    setCheckboxValue('kingChk', 'kingValue', savedRules.cardValues?.king);
    setCheckboxValue('queenChk', 'queenValue', savedRules.cardValues?.queen);
    setCheckboxValue('jackChk', 'jackValue', savedRules.cardValues?.jack);
    setCheckboxValue('aceChk', 'aceValue', savedRules.cardValues?.ace);

    // Win bonuses
    setCheckboxValue('tongitsChk', 'tongitsValue', savedRules.winBonuses?.tongits);
    setCheckboxValue('normalWinChk', 'normalWinValue', savedRules.winBonuses?.normalWin);
    setCheckboxValue('fightWinChk', 'fightWinValue', savedRules.winBonuses?.fight);

    // Melds
    setCheckboxValue('quadraMeldChk', 'quadraMeldValue', savedRules.melds?.quadra);
    // quadraUpgrade maps to kindUpgradeChk in your HTML/save logic
    setCheckboxValue('kindUpgradeChk', 'quadraMeldValue', savedRules.melds?.quadraUpgrade);
    setCheckboxValue('straightChk', 'straightValue', savedRules.melds?.straight);
    setCheckboxValue('multipleMeldChk', 'multipleMeldValue', savedRules.melds?.multipleMelds);
    setCheckboxValue('noMeldChk', 'noMeldValue', savedRules.melds?.noMeld);

    // Win streak
    if (savedRules.winStreak) {
      stackableSelect && (stackableSelect.value = savedRules.winStreak.stackable ? 'yes' : 'no');
      streakBaseInput && (streakBaseInput.value = savedRules.winStreak.base ?? 0);
      streakPerStackInput && (streakPerStackInput.value = savedRules.winStreak.perStack ?? 0);
      updateStreakVisibility();
    }

    // Fight rules & visibility
    if (savedRules.fightRules) {
      fighterChk && (fighterChk.checked = !!savedRules.fightRules.fighterPaysMore);
      setInputValue('fighterLoss', savedRules.fightRules.fighterLoss ?? 0);
      setInputValue('nonFighterLoss', savedRules.fightRules.nonFighterLoss ?? 0);
      setSimpleCheckbox('countDeadwoodChk', !!savedRules.fightRules.countDeadwood);
      setInputValue('deadwoodValue', savedRules.fightRules.deadwoodValue ?? 0);
      updateFightVisibility();
    }

    // ensure special-case UI updates (like rendering special cards visibility if you have that code)
    // If you have a function buildSpecialCardsUI() or similar, call it here.
    if (typeof buildSpecialCardsUI === 'function') {
      try { buildSpecialCardsUI(); } catch (e) { /* ignore */ }
    }
  }

  // run load on page open
  loadRules();

  // ---------- Save rules handler ----------
  saveBtn && saveBtn.addEventListener('click', () => {
    const rulesData = {};

    // players
    const numPlayers = parseInt(numPlayersSelect.value) || 0;
    rulesData.players = [];
    for (let i = 1; i <= numPlayers; i++) {
      const playerInput = document.getElementById(`player${i}Name`);
      rulesData.players.push(playerInput && playerInput.value.trim() !== '' ? playerInput.value.trim() : `Player ${i}`);
    }

    // card values
    function getCheckboxValue(idCheckbox, idNumber) {
      const cb = document.getElementById(idCheckbox);
      const num = document.getElementById(idNumber);
      return {
        enabled: !!(cb && cb.checked),
        value: num ? (parseInt(num.value) || 0) : 0
      };
    }
    rulesData.cardValues = {
      king: getCheckboxValue('kingChk', 'kingValue'),
      queen: getCheckboxValue('queenChk', 'queenValue'),
      jack: getCheckboxValue('jackChk', 'jackValue'),
      ace: getCheckboxValue('aceChk', 'aceValue')
    };

    // win bonuses
    rulesData.winBonuses = {
      tongits: getCheckboxValue('tongitsChk', 'tongitsValue'),
      normalWin: getCheckboxValue('normalWinChk', 'normalWinValue'),
      fight: getCheckboxValue('fightWinChk', 'fightWinValue')
    };

    // melds (quadraUpgrade stored using kindUpgradeChk per your earlier code)
    rulesData.melds = {
      quadra: getCheckboxValue('quadraMeldChk', 'quadraMeldValue'),
      quadraUpgrade: getCheckboxValue('kindUpgradeChk', 'quadraMeldValue'),
      straight: getCheckboxValue('straightChk', 'straightValue'),
      multipleMelds: getCheckboxValue('multipleMeldChk', 'multipleMeldValue'),
      noMeld: getCheckboxValue('noMeldChk', 'noMeldValue')
    };

    // win streak
    rulesData.winStreak = {
      stackable: stackableSelect ? (stackableSelect.value === 'yes') : false,
      base: streakBaseInput ? (parseInt(streakBaseInput.value) || 0) : 0,
      perStack: streakPerStackInput ? (parseInt(streakPerStackInput.value) || 0) : 0
    };

    // fight rules
    rulesData.fightRules = {
      fighterPaysMore: fighterChk ? !!fighterChk.checked : false,
      fighterLoss: fighterLossEl ? (parseInt(fighterLossEl.value) || 0) : 0,
      nonFighterLoss: nonFighterLossEl ? (parseInt(nonFighterLossEl.value) || 0) : 0,
      countDeadwood: countDeadwoodChkEl ? !!countDeadwoodChkEl.checked : false,
      deadwoodValue: deadwoodValueEl ? (parseInt(deadwoodValueEl.value) || 0) : 0
    };

    localStorage.setItem('tongitsRules', JSON.stringify(rulesData));
    alert('Rules saved successfully!');
    // redirect to scorer
    window.location.href = 'scorer.html';
  });

  // ---------- Reset ----------
  resetBtn && resetBtn.addEventListener('click', () => {
    localStorage.removeItem('tongitsRules');
    document.querySelectorAll('input[type="text"], input[type="number"]').forEach(input => input.value = '');
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => checkbox.checked = false);
    if (numPlayersSelect) numPlayersSelect.value = '';
    if (stackableSelect) stackableSelect.value = 'yes';
    playerNamesContainer.innerHTML = '';
    if (streakBaseInput) streakBaseInput.value = '0';
    if (streakPerStackInput) streakPerStackInput.value = '0';
    updateStreakVisibility();
    updateFightVisibility();
  });

  // ---------- Back button ----------
  backBtn && backBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
  });

}); // DOMContentLoaded
