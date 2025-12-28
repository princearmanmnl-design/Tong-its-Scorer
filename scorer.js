// scorer.js
// Page 3 (Round/Scorer) logic — updated with Quadra Upgrade owners, queen/jack support,
// visibility tied to game rules, fixed fighter/no-meld/winner exclusions, replay-safe streaks.

document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);

  // -------------------------
  // Element references
  // -------------------------
  const winnerSelect = $('winnerSelect');
  const roundNumberSpan = $('roundNumber');
  const prevRoundBtn = $('prevRoundBtn');
  const nextRoundBtn = $('nextRoundBtn');
  const saveProgressBtn = $('saveProgressBtn');
  const scoreboardBtn = document.querySelector('.scoreboardBtn');

  const winMethodRadios = Array.from(document.querySelectorAll('input[name="winMethod"]'));

  // special counters in UI (if element missing, code handles gracefully)
  const specialIds = {
    king: 'kingCount',
    ace: 'aceCount',
    quadra: 'quadraCount',
    straight: 'straightCount',
    multiple: 'multipleMeldsCount',
    queen: 'queenCount', // optional (only if in HTML)
    jack: 'jackCount'    // optional (only if in HTML)
  };

  const playerNoMeldIds = ['player1NoMeld','player2NoMeld','player3NoMeld','player4NoMeld'];
  const playerFighterIds = ['player1Fighter','player2Fighter','player3Fighter','player4Fighter'];
  const playerDeadwoodIds = ['player1Deadwood','player2Deadwood','player3Deadwood','player4Deadwood'];
  const playerQuadraUpgradeIds = ['player1QuadraUpgrade','player2QuadraUpgrade','player3QuadraUpgrade','player4QuadraUpgrade'];

  const fightSection = document.querySelector('.fightSection');
  const quadraUpgradeSection = $('quadraUpgradeSection');

  // -------------------------
  // Load rules (required)
  // -------------------------
  let rules;
  try {
    rules = JSON.parse(localStorage.getItem('tongitsRules'));
  } catch (e) {
    rules = null;
  }

  if (!rules || !rules.players || !Array.isArray(rules.players) || rules.players.length === 0) {
    alert('Game rules or players not found. Please set rules first.');
    window.location.href = 'welcomepage.html';
    return;
  }

  const players = rules.players;
  const nPlayers = players.length;

  // -------------------------
  // Storage helpers
  // -------------------------
  function getRounds() {
    return JSON.parse(localStorage.getItem('tongitsRounds') || '[]');
  }
  function setRounds(arr) {
    localStorage.setItem('tongitsRounds', JSON.stringify(arr));
  }
  function makeId() {
    return `${Date.now()}-${Math.floor(Math.random()*10000)}`;
  }

  // viewingRoundIndex: null => new/current round; integer => editing that round index (0-based)
  let viewingRoundIndex = null;

  // -------------------------
  // UI Builders & Helpers
  // -------------------------
  function buildPlayersUI() {
    // populate winnerSelect
    while (winnerSelect.firstChild) winnerSelect.removeChild(winnerSelect.firstChild);
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Choose Player';
    winnerSelect.appendChild(placeholder);

    for (let i = 0; i < nPlayers; i++) {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = players[i];
      winnerSelect.appendChild(opt);
    }

    // No-meld: hide all initially
    playerNoMeldIds.forEach((id, idx) => {
      const cb = $(id);
      if (!cb) return;
      cb.checked = false;
      cb.style.display = 'none';
      const lbl = cb.nextElementSibling;
      if (lbl) lbl.style.display = 'none';
    });

    // Fighter checkboxes: show for players present (labels updated)
    playerFighterIds.forEach((id, idx) => {
      const cb = $(id);
      if (!cb) return;
      const lbl = cb.nextElementSibling;
      if (idx < nPlayers) {
        cb.style.display = 'inline-block';
        cb.checked = false;
        if (lbl) { lbl.style.display = 'inline-block'; lbl.textContent = players[idx]; }
      } else {
        cb.style.display = 'none';
        if (lbl) lbl.style.display = 'none';
      }
      cb.onchange = null;
    });

    // Deadwood rows: hide by default
    playerDeadwoodIds.forEach((id, idx) => {
      const inp = $(id);
      if (!inp) return;
      const row = inp.parentElement;
      if (idx < nPlayers) {
        row.style.display = 'none';
        const label = row.querySelector('label');
        if (label) label.textContent = players[idx];
        inp.value = 0;
      } else {
        row.style.display = 'none';
      }
    });

    // Quadra Upgrade owners: only visible if rule enabled
    if (rules.melds && rules.melds.quadraUpgrade && rules.melds.quadraUpgrade.enabled) {
      if (quadraUpgradeSection) quadraUpgradeSection.style.display = 'block';
      playerQuadraUpgradeIds.forEach((id, idx) => {
        const cb = $(id);
        if (!cb) return;
        const lbl = cb.nextElementSibling;
        if (idx < nPlayers) {
          cb.style.display = 'inline-block';
          cb.checked = false;
          if (lbl) { lbl.style.display = 'inline-block'; lbl.textContent = players[idx]; }
        } else {
          cb.style.display = 'none';
          if (lbl) lbl.style.display = 'none';
        }
      });
    } else {
      if (quadraUpgradeSection) quadraUpgradeSection.style.display = 'none';
      playerQuadraUpgradeIds.forEach(id => {
        const cb = $(id);
        if (!cb) return;
        cb.style.display = 'none';
      });
    }
  }

  // Hide special card rows that are not enabled by rules (so gameplay shows only enabled)
  function buildSpecialCardsUI() {
    if (!rules) return;
    Object.entries(specialIds).forEach(([key,id]) => {
      const el = $(id);
      if (!el) return;
      const row = el.parentElement;
      let enabled = false;
      if (key === 'king' || key === 'ace' || key === 'queen' || key === 'jack') {
        if (rules.cardValues && rules.cardValues[key] && rules.cardValues[key].enabled) enabled = true;
      } else if (key === 'quadra') {
        if (rules.melds && ((rules.melds.quadra && rules.melds.quadra.enabled) || (rules.melds.quadraUpgrade && rules.melds.quadraUpgrade.enabled))) enabled = true;
      } else if (key === 'straight') {
        if (rules.melds && rules.melds.straight && rules.melds.straight.enabled) enabled = true;
      } else if (key === 'multiple') {
        if (rules.melds && rules.melds.multipleMelds && rules.melds.multipleMelds.enabled) enabled = true;
      }
      row.style.display = enabled ? 'flex' : 'none';
      if (!enabled && el.tagName === 'INPUT' && el.type === 'number') el.value = 0;
    });
  }

  buildPlayersUI();
  buildSpecialCardsUI();

  function findNumberInput(btn) {
    let parent = btn.parentElement;
    while (parent && parent !== document.body) {
      const input = parent.querySelector('input[type="number"]');
      if (input) return input;
      parent = parent.parentElement;
    }
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

  function initPlusMinus() {
    document.querySelectorAll('.increaseBtn').forEach(btn => {
      btn.removeEventListener('click', btn._handlerInc);
      const handler = () => {
        const input = findNumberInput(btn);
        if (!input) return;
        input.value = Math.max(0, parseInt(input.value || 0) + 1);
      };
      btn.addEventListener('click', handler);
      btn._handlerInc = handler;
    });

    document.querySelectorAll('.decreaseBtn').forEach(btn => {
      btn.removeEventListener('click', btn._handlerDec);
      const handler = () => {
        const input = findNumberInput(btn);
        if (!input) return;
        input.value = Math.max(0, parseInt(input.value || 0) - 1);
      };
      btn.addEventListener('click', handler);
      btn._handlerDec = handler;
    });
  }
  initPlusMinus();

  // -------------------------
  // UI: No-meld update and win-method handling (hide winner, show fighters per players present)
  // -------------------------
  function updateNoMeldUI() {
    const winnerIdx = parseInt(winnerSelect.value || -1);
    playerNoMeldIds.forEach((id, idx) => {
      const cb = $(id);
      if (!cb) return;
      const lbl = cb.nextElementSibling;
      if (idx < nPlayers && idx !== winnerIdx) {
        cb.style.display = '';
        cb.checked = false;
        if (lbl) { lbl.style.display = ''; lbl.textContent = players[idx]; }
      } else {
        cb.style.display = 'none';
        cb.checked = false;
        if (lbl) lbl.style.display = 'none';
      }
    });
  }
  winnerSelect && winnerSelect.addEventListener('change', updateNoMeldUI);

  function updateWinMethodUI() {
    const method = document.querySelector('input[name="winMethod"]:checked');
    if (!fightSection) return;
    if (!method) {
      fightSection.style.display = 'none';
      return;
    }

    if (method.value === 'fight') {
      fightSection.style.display = 'block';
      const winnerIdx = winnerSelect.value === '' ? NaN : parseInt(winnerSelect.value);

      playerFighterIds.forEach((fid, idx) => {
        const fc = $(fid);
        const lbl = fc ? fc.nextElementSibling : null;
        const dw = $(playerDeadwoodIds[idx]);
        const dwRow = dw ? dw.parentElement : null;

        if (!fc || !dw || !dwRow) return;

        // hide if not in game or is winner
        if (idx >= nPlayers || (!isNaN(winnerIdx) && idx === winnerIdx)) {
          fc.checked = false;
          fc.style.display = 'none';
          if (lbl) lbl.style.display = 'none';
          dwRow.style.display = 'none';
          dw.value = 0;
          fc.onchange = null;
          return;
        }

        // show fighter checkbox
        fc.style.display = 'inline-block';
        if (lbl) { lbl.style.display = 'inline-block'; lbl.textContent = players[idx]; }

        dwRow.style.display = fc.checked ? 'flex' : 'none';
        fc.onchange = function() {
          dwRow.style.display = fc.checked ? 'flex' : 'none';
          if (!fc.checked) dw.value = 0;
        };
      });
    } else {
      fightSection.style.display = 'none';
      playerFighterIds.forEach((id, idx) => {
        const cb = $(id);
        if (!cb) return;
        cb.checked = false;
        cb.style.display = 'none';
        const dw = $(playerDeadwoodIds[idx]);
        if (dw) { dw.parentElement.style.display = 'none'; dw.value = 0; }
        const lbl = cb.nextElementSibling;
        if (lbl) lbl.style.display = 'none';
        cb.onchange = null;
      });
    }
  }

  winMethodRadios.forEach(r => r.addEventListener('change', updateWinMethodUI));
  winnerSelect && winnerSelect.addEventListener('change', updateWinMethodUI);
  updateWinMethodUI();

  // -------------------------
  // Utilities & calculation helpers
  // -------------------------
  function readInt(id) {
    const el = $(id);
    if (!el) return 0;
    return parseInt(el.value || 0) || 0;
  }

  function getFightRuleValues() {
    const fightRules = rules.fightRules || {};
    return {
      fighterPaysMore: !!fightRules.fighterPaysMore,
      fighterLoss: parseInt(fightRules.fighterLoss) || 0,
      nonFighterLoss: parseInt(fightRules.nonFighterLoss) || 0,
      countDeadwood: !!fightRules.countDeadwood,
      deadwoodValue: parseInt(fightRules.deadwoodValue) || 0
    };
  }

  function getBaseWinValues() {
    const normalBase = (rules.winBonuses && rules.winBonuses.normalWin) ? (parseInt(rules.winBonuses.normalWin.value) || 0) : 0;
    const tongitsBase = (rules.winBonuses && rules.winBonuses.tongits) ? (parseInt(rules.winBonuses.tongits.value) || 0) : 0;
    const fightBaseAlt = (rules.winBonuses && rules.winBonuses.fight) ? (parseInt(rules.winBonuses.fight.value) || 0) : 0;
    return { normalBase, tongitsBase, fightBaseAlt };
  }

  // Compute winner special total from UI values (used when saving current round)
  function computeWinnerSpecialTotalFromUI() {
    let total = 0;
    if (!rules) return 0;
    if (rules.cardValues) {
      if (rules.cardValues.king && rules.cardValues.king.enabled) total += readInt(specialIds.king) * (parseInt(rules.cardValues.king.value) || 0);
      if (rules.cardValues.ace && rules.cardValues.ace.enabled) total += readInt(specialIds.ace) * (parseInt(rules.cardValues.ace.value) || 0);
      if (rules.cardValues.queen && rules.cardValues.queen.enabled && specialIds.queen) total += readInt(specialIds.queen) * (parseInt(rules.cardValues.queen.value) || 0);
      if (rules.cardValues.jack && rules.cardValues.jack.enabled && specialIds.jack) total += readInt(specialIds.jack) * (parseInt(rules.cardValues.jack.value) || 0);
    }
    if (rules.melds) {
      if (rules.melds.quadra && rules.melds.quadra.enabled) total += readInt(specialIds.quadra) * (parseInt(rules.melds.quadra.value) || 0);
      if (rules.melds.straight && rules.melds.straight.enabled) total += readInt(specialIds.straight) * (parseInt(rules.melds.straight.value) || 0);
      if (rules.melds.multipleMelds && rules.melds.multipleMelds.enabled) total += readInt(specialIds.multiple) * (parseInt(rules.melds.multipleMelds.value) || 0);
    }
    return total;
  }

  // Compute winner special total from a stored specialCounts object (used during replay)
  function computeWinnerSpecialTotalFromObj(specialCountsObj) {
    let total = 0;
    if (!rules || !specialCountsObj) return 0;
    if (rules.cardValues) {
      if (rules.cardValues.king && rules.cardValues.king.enabled) total += (parseInt(specialCountsObj.king) || 0) * (parseInt(rules.cardValues.king.value) || 0);
      if (rules.cardValues.ace && rules.cardValues.ace.enabled) total += (parseInt(specialCountsObj.ace) || 0) * (parseInt(rules.cardValues.ace.value) || 0);
      if (rules.cardValues.queen && rules.cardValues.queen.enabled) total += (parseInt(specialCountsObj.queen) || 0) * (parseInt(rules.cardValues.queen.value) || 0);
      if (rules.cardValues.jack && rules.cardValues.jack.enabled) total += (parseInt(specialCountsObj.jack) || 0) * (parseInt(rules.cardValues.jack.value) || 0);
    }
    if (rules.melds) {
      if (rules.melds.quadra && rules.melds.quadra.enabled) total += (parseInt(specialCountsObj.quadra) || 0) * (parseInt(rules.melds.quadra.value) || 0);
      if (rules.melds.straight && rules.melds.straight.enabled) total += (parseInt(specialCountsObj.straight) || 0) * (parseInt(rules.melds.straight.value) || 0);
      if (rules.melds.multipleMelds && rules.melds.multipleMelds.enabled) total += (parseInt(specialCountsObj.multipleMelds) || 0) * (parseInt(rules.melds.multipleMelds.value) || 0);
    }
    return total;
  }

  // -------------------------
  // Replay compute - used by scoreboard & recompute
  // -------------------------
  function replayAndComputeRounds(roundsSource) {
    const rounds = Array.isArray(roundsSource) ? roundsSource : getRounds();
    const computedRounds = [];
    const totals = new Array(nPlayers).fill(0);

    for (let i = 0; i < rounds.length; i++) {
      const r = rounds[i];

      // consecutiveBefore for streak (lookback in computedRounds)
      let consecutiveBefore = 0;
      for (let j = computedRounds.length - 1; j >= 0; j--) {
        const cr = computedRounds[j];
        if (cr.winnerIndex === r.winnerIndex) consecutiveBefore++;
        else break;
      }

      const fightVals = getFightRuleValues();
      const baseVals = getBaseWinValues();

      let streakBonusPerLoser = 0;
      if (rules.winStreak) {
        const base = parseInt(rules.winStreak.base) || 0;
        const per = parseInt(rules.winStreak.perStack) || 0;
        const stackable = !!rules.winStreak.stackable;
        if (consecutiveBefore >= 1) {
          if (stackable) streakBonusPerLoser = base + per * (consecutiveBefore - 1);
          else streakBonusPerLoser = base;
        }
      }

      const winnerSpecialTotal = computeWinnerSpecialTotalFromObj(r.specialCounts || {});

      const perPlayerNet = new Array(nPlayers).fill(0);

      // For each losing player compute owed amount
      for (let p = 0; p < nPlayers; p++) {
        if (p === r.winnerIndex) continue;
        let amount = 0;
        if (r.method === 'fight') {
          const isFighter = !!(r.fighters && r.fighters[p]);
          if (fightVals.fighterPaysMore) amount += isFighter ? fightVals.fighterLoss : fightVals.nonFighterLoss;
          else amount += baseVals.fightBaseAlt;
          if (fightVals.countDeadwood && isFighter) {
            const dw = (r.deadwood && r.deadwood[p]) ? parseInt(r.deadwood[p]) || 0 : 0;
            amount += dw * fightVals.deadwoodValue;
          }
        } else {
          amount += (r.method === 'tongits') ? baseVals.tongitsBase : baseVals.normalBase;
        }

        amount += streakBonusPerLoser;
        amount += winnerSpecialTotal;

        if (rules.melds && rules.melds.noMeld && rules.melds.noMeld.enabled) {
          const nm = (r.noMelds && r.noMelds[p]) ? true : false;
          if (nm) amount += (parseInt(rules.melds.noMeld.value) || 0);
        }

        amount = Math.round(amount);
        perPlayerNet[r.winnerIndex] += amount;
        perPlayerNet[p] -= amount;
      }

      // Quadra-Upgrade owners effect (during replay)
      // Behavior: if a non-winner player was marked as quadraUpgrade owner in that round,
      // the owner receives quadraUpgrade value from the winner (single transfer per owner).
      const quadraUpgradeVal = (rules.melds && rules.melds.quadraUpgrade && rules.melds.quadraUpgrade.enabled) ? (parseInt(rules.melds.quadraUpgrade.value) || 0) : 0;
      if (quadraUpgradeVal && r.quadraUpgradeOwners && Array.isArray(r.quadraUpgradeOwners)) {
        r.quadraUpgradeOwners.forEach((owned, idx) => {
          if (!owned) return;
          if (idx === r.winnerIndex) return; // no transfer if winner owns it (already counted via winnerSpecial if applicable)
          // owner receives from winner
          perPlayerNet[idx] += quadraUpgradeVal;
          perPlayerNet[r.winnerIndex] -= quadraUpgradeVal;
        });
      }

      const computed = Object.assign({}, r, {
        computedPerPlayerNet: perPlayerNet,
        computedStreakConsecutiveBefore: consecutiveBefore,
        computedStreakAfter: consecutiveBefore + 1
      });
      computedRounds.push(computed);

      for (let t = 0; t < nPlayers; t++) totals[t] += perPlayerNet[t];
    }

    return { computedRounds, netTotals: totals };
  }

  // Recompute + save all rounds (update snapshots)
  function recomputeAndSaveAllRounds() {
    const existing = getRounds();
    const { computedRounds } = replayAndComputeRounds(existing);
    const newStored = computedRounds.map((cr, idx) => {
      const base = existing[idx] || {};
      return {
        id: base.id || (cr.id || makeId()),
        roundNumber: idx + 1,
        timestamp: cr.timestamp || Date.now(),
        winnerIndex: cr.winnerIndex,
        winnerName: cr.winnerName,
        method: cr.method,
        specialCounts: cr.specialCounts,
        noMelds: cr.noMelds,
        fighters: cr.fighters,
        deadwood: cr.deadwood,
        quadraUpgradeOwners: cr.quadraUpgradeOwners,
        streakConsecutiveBefore: cr.computedStreakConsecutiveBefore,
        streakAfter: cr.computedStreakAfter,
        perPlayerNet: cr.computedPerPlayerNet
      };
    });
    setRounds(newStored);
    return newStored;
  }

  // -------------------------
  // Save a round (append or overwrite if saveIndex provided)
  // Returns true on success
  // -------------------------
  function saveRound(saveIndex = null) {
    const winnerIdxStr = winnerSelect.value;
    if (winnerIdxStr === '') { alert('Please select a winner.'); return false; }
    const winnerIdx = parseInt(winnerIdxStr);
    if (isNaN(winnerIdx)) { alert('Invalid winner selection.'); return false; }

    const methodEl = document.querySelector('input[name="winMethod"]:checked');
    if (!methodEl) { alert('Please choose a method of winning.'); return false; }
    const method = methodEl.value;

    const fightVals = getFightRuleValues();
    const baseVals = getBaseWinValues();

    // Prev rounds for streak logic (careful when overwriting)
    const prevRounds = getRounds();
    let consecutiveBefore = 0;
    if (saveIndex === null) {
      for (let i = prevRounds.length - 1; i >= 0; i--) {
        const r = prevRounds[i];
        if (r && r.winnerIndex === winnerIdx) consecutiveBefore++;
        else break;
      }
    } else {
      for (let i = saveIndex - 1; i >= 0; i--) {
        const r = prevRounds[i];
        if (r && r.winnerIndex === winnerIdx) consecutiveBefore++;
        else break;
      }
    }

    let streakBonusPerLoser = 0;
    if (rules.winStreak) {
      const base = parseInt(rules.winStreak.base) || 0;
      const per = parseInt(rules.winStreak.perStack) || 0;
      const stackable = !!rules.winStreak.stackable;
      if (consecutiveBefore >= 1) {
        if (stackable) streakBonusPerLoser = base + per * (consecutiveBefore - 1);
        else streakBonusPerLoser = base;
      }
    }

    // read special counts from UI
    const specialCountsUI = {
      king: readInt(specialIds.king),
      ace: readInt(specialIds.ace),
      quadra: readInt(specialIds.quadra),
      straight: readInt(specialIds.straight),
      multipleMelds: readInt(specialIds.multiple),
      queen: readInt(specialIds.queen),
      jack: readInt(specialIds.jack)
    };
    const winnerSpecialTotal = computeWinnerSpecialTotalFromUI();

    const perPlayerNet = new Array(nPlayers).fill(0);

    for (let i = 0; i < nPlayers; i++) {
      if (i === winnerIdx) continue;
      let amount = 0;
      if (method === 'fight') {
        const fighterEl = $(playerFighterIds[i]);
        const isFighter = fighterEl ? !!fighterEl.checked : false;
        if (fightVals.fighterPaysMore) amount += isFighter ? fightVals.fighterLoss : fightVals.nonFighterLoss;
        else amount += baseVals.fightBaseAlt;
        if (fightVals.countDeadwood && isFighter) {
          const dw = readInt(playerDeadwoodIds[i]);
          amount += dw * fightVals.deadwoodValue;
        }
      } else {
        amount += (method === 'tongits') ? baseVals.tongitsBase : baseVals.normalBase;
      }

      amount += streakBonusPerLoser;
      amount += winnerSpecialTotal;

      if (rules.melds && rules.melds.noMeld && rules.melds.noMeld.enabled) {
        const nmEl = $(playerNoMeldIds[i]);
        if (nmEl && nmEl.checked) amount += (parseInt(rules.melds.noMeld.value) || 0);
      }

      amount = Math.round(amount);
      perPlayerNet[winnerIdx] += amount;
      perPlayerNet[i] -= amount;
    }

    // Quadra Upgrade owners behavior (UI & saving):
    // If a non-winner player is checked as quadraUpgrade owner, that owner receives quadraUpgrade.value from the winner.
    const quadraUpgradeVal = (rules.melds && rules.melds.quadraUpgrade && rules.melds.quadraUpgrade.enabled) ? (parseInt(rules.melds.quadraUpgrade.value) || 0) : 0;
    const quadraUpgradeOwners = playerQuadraUpgradeIds.map((id, idx) => {
      const cb = $(id);
      return cb ? !!cb.checked : false;
    });

    if (quadraUpgradeVal) {
      quadraUpgradeOwners.forEach((owned, idx) => {
        if (!owned) return;
        if (idx === winnerIdx) return; // no extra transfer if owner is winner
        // owner receives from winner
        perPlayerNet[idx] += quadraUpgradeVal;
        perPlayerNet[winnerIdx] -= quadraUpgradeVal;
      });
    }

    // Build round object
    const rounds = getRounds();
    let roundObj;
    if (saveIndex === null) {
      roundObj = {
        id: makeId(),
        roundNumber: rounds.length + 1,
        timestamp: Date.now(),
        winnerIndex: winnerIdx,
        winnerName: players[winnerIdx],
        method,
        specialCounts: specialCountsUI,
        noMelds: playerNoMeldIds.map(id => $(id) ? !!$(id).checked : false),
        fighters: playerFighterIds.map(id => $(id) ? !!$(id).checked : false),
        deadwood: playerDeadwoodIds.map(id => $(id) ? (parseInt($(id).value) || 0) : 0),
        quadraUpgradeOwners,
        streakConsecutiveBefore: consecutiveBefore,
        streakAfter: consecutiveBefore + 1,
        perPlayerNet
      };
      rounds.push(roundObj);
      setRounds(rounds);
    } else {
      const old = rounds[saveIndex] || {};
      roundObj = {
        id: old.id || makeId(),
        roundNumber: old.roundNumber || (saveIndex + 1),
        timestamp: Date.now(),
        winnerIndex: winnerIdx,
        winnerName: players[winnerIdx],
        method,
        specialCounts: specialCountsUI,
        noMelds: playerNoMeldIds.map(id => $(id) ? !!$(id).checked : false),
        fighters: playerFighterIds.map(id => $(id) ? !!$(id).checked : false),
        deadwood: playerDeadwoodIds.map(id => $(id) ? (parseInt($(id).value) || 0) : 0),
        quadraUpgradeOwners,
        streakConsecutiveBefore: consecutiveBefore,
        streakAfter: consecutiveBefore + 1,
        perPlayerNet
      };
      rounds[saveIndex] = roundObj;
      setRounds(rounds);
      // if editing earlier round, recompute all subsequent snapshots
      recomputeAndSaveAllRounds();
    }

    // Feedback
    let summary = `Round saved — Winner: ${roundObj.winnerName} (${roundObj.method})\n\n`;
    for (let i = 0; i < nPlayers; i++) summary += `${players[i]}: ${perPlayerNet[i] >= 0 ? '+' : ''}${perPlayerNet[i]}\n`;
    alert(summary);

    // update next display number
    const newNextNumber = (getRounds().length) + 1;
    roundNumberSpan.textContent = String(newNextNumber);

    resetRoundUI();
    return true;
  }

  // -------------------------
  // Reset UI form (no storage change)
  // -------------------------
  function resetRoundUI() {
    winnerSelect.value = '';
    winMethodRadios.forEach(r => r.checked = false);
    Object.values(specialIds).forEach(id => {
      const el = $(id); if (el) el.value = 0;
    });
    playerNoMeldIds.forEach(id => { const cb = $(id); if (cb) cb.checked = false; });
    playerFighterIds.forEach((id, idx) => {
      const cb = $(id); if (cb) { cb.checked = false; cb.style.display = 'none'; cb.onchange = null; }
      const dw = $(playerDeadwoodIds[idx]); if (dw) { dw.value = 0; if (dw.parentElement) dw.parentElement.style.display = 'none'; }
      const lbl = cb ? cb.nextElementSibling : null; if (lbl) lbl.style.display = 'none';
    });
    playerQuadraUpgradeIds.forEach((id, idx) => {
      const cb = $(id);
      if (!cb) return;
      cb.checked = false;
      // visibility will be controlled by buildPlayersUI (quadraUpgradeSection)
    });
    updateWinMethodUI();
  }

  // -------------------------
  // Load round into form to edit
  // -------------------------
  function loadRoundForEdit(idx) {
    const rounds = getRounds();
    const r = rounds[idx];
    if (!r) { alert('Round not found'); return; }
    viewingRoundIndex = idx;
    // populate UI
    winnerSelect.value = String(r.winnerIndex);
    Object.entries(r.specialCounts || {}).forEach(([k, v]) => {
      const id = specialIds[k];
      if (id && $(id)) $(id).value = v;
    });
    (r.noMelds || []).forEach((val, i) => { if ($(playerNoMeldIds[i])) $(playerNoMeldIds[i]).checked = !!val; });
    (r.fighters || []).forEach((val, i) => { if ($(playerFighterIds[i])) $(playerFighterIds[i]).checked = !!val; });
    (r.deadwood || []).forEach((val, i) => { if ($(playerDeadwoodIds[i])) $(playerDeadwoodIds[i]).value = val; });
    (r.quadraUpgradeOwners || []).forEach((val, i) => { if ($(playerQuadraUpgradeIds[i])) $(playerQuadraUpgradeIds[i]).checked = !!val; });

    const radio = document.querySelector(`input[name="winMethod"][value="${r.method}"]`);
    if (radio) radio.checked = true;
    updateWinMethodUI();

    roundNumberSpan.textContent = String(r.roundNumber);
    updateNavButtonsVisibility();
    updateNextButtonLabel();
  }

  // -------------------------
  // New round mode (not editing)
  // -------------------------
  function enterNewRoundMode() {
    viewingRoundIndex = null;
    const rounds = getRounds();
    roundNumberSpan.textContent = String(rounds.length + 1);
    resetRoundUI();
    updateNavButtonsVisibility();
    updateNextButtonLabel();
  }

  // -------------------------
  // Navigation helpers
  // -------------------------
  function updateNavButtonsVisibility() {
    const rounds = getRounds();
    const hasRounds = rounds.length > 0;
    if (prevRoundBtn) prevRoundBtn.style.display = hasRounds ? '' : 'none';
    if (prevRoundBtn) {
      const disablePrev = !hasRounds || (viewingRoundIndex === 0 && viewingRoundIndex !== null);
      prevRoundBtn.disabled = disablePrev;
    }
    if (nextRoundBtn) nextRoundBtn.disabled = false;
  }
  function updateNextButtonLabel() {
    if (!nextRoundBtn) return;
    if (viewingRoundIndex === null) {
      nextRoundBtn.innerHTML = `Proceed to New Round <i class='bx bx-chevron-right'></i>`;
    } else {
      nextRoundBtn.innerHTML = `<i class='bx bx-chevron-right'></i>`;
    }
  }

  function saveCurrentEditingBeforeNavigate() {
    if (viewingRoundIndex === null) return true;
    const saved = saveRound(viewingRoundIndex);
    if (!saved) {
      const ok = confirm('Current round is incomplete or invalid. Discard changes and continue navigation? (Cancel to stay)');
      return ok;
    }
    return true;
  }

  // Prev button
  if (prevRoundBtn) {
    prevRoundBtn.addEventListener('click', () => {
      const rounds = getRounds();
      if (!rounds.length) { alert('No saved rounds.'); return; }
      if (viewingRoundIndex === null) {
        loadRoundForEdit(rounds.length - 1);
        return;
      }
      if (!saveCurrentEditingBeforeNavigate()) return;
      if (viewingRoundIndex > 0) {
        loadRoundForEdit(viewingRoundIndex - 1);
      } else {
        alert('Already at the first round.');
      }
    });
  }

  // Next button
  if (nextRoundBtn) {
    nextRoundBtn.addEventListener('click', () => {
      const rounds = getRounds();
      if (!saveCurrentEditingBeforeNavigate()) return;

      if (viewingRoundIndex !== null && viewingRoundIndex < rounds.length - 1) {
        loadRoundForEdit(viewingRoundIndex + 1);
        return;
      }

      if (viewingRoundIndex === rounds.length - 1) {
        enterNewRoundMode();
        return;
      }

      if (viewingRoundIndex === null) {
        // we're on the new/current round: save it (append) and remain in new-round mode
        saveRound(null);
        enterNewRoundMode();
      }
    });
  }

  // Save progress (snapshot & exit to rules)
  if (saveProgressBtn) {
    saveProgressBtn.addEventListener('click', () => {
      try {
        if (winnerSelect.value !== '' && document.querySelector('input[name="winMethod"]:checked')) {
          if (viewingRoundIndex === null) saveRound(null);
          else saveRound(viewingRoundIndex);
        }
      } catch (e) {}
      const savedGame = {
        rules,
        rounds: getRounds(),
        lastUpdated: Date.now(),
        currentForm: {
          winnerIndex: winnerSelect.value === '' ? null : parseInt(winnerSelect.value),
          method: (document.querySelector('input[name="winMethod"]:checked') || {}).value || null,
          specialCounts: {
            king: readInt(specialIds.king),
            ace: readInt(specialIds.ace),
            quadra: readInt(specialIds.quadra),
            straight: readInt(specialIds.straight),
            multipleMelds: readInt(specialIds.multiple)
          },
          noMelds: playerNoMeldIds.map(id => $(id) ? !!$(id).checked : false),
          fighters: playerFighterIds.map(id => $(id) ? !!$(id).checked : false),
          deadwood: playerDeadwoodIds.map(id => $(id) ? (parseInt($(id).value) || 0) : 0),
          quadraUpgradeOwners: playerQuadraUpgradeIds.map(id => $(id) ? !!$(id).checked : false)
        }
      };
      localStorage.setItem('tongitsSavedGame', JSON.stringify(savedGame));
      window.location.href = 'index.html';
    });
  }

  // -------------------------
  // Scoreboard modal + settlement matrix
  // -------------------------
  function buildSettlementMatrix(netTotals) {
    const matrix = Array.from({ length: nPlayers }, () => new Array(nPlayers).fill(0));
    const creditors = [];
    const debtors = [];
    for (let i = 0; i < nPlayers; i++) {
      const v = Math.round(netTotals[i]);
      if (v > 0) creditors.push({ idx: i, amt: v });
      else if (v < 0) debtors.push({ idx: i, amt: -v });
    }
    let ci = 0;
    for (let di = 0; di < debtors.length; di++) {
      let debtor = debtors[di];
      while (debtor.amt > 0 && ci < creditors.length) {
        const cred = creditors[ci];
        const pay = Math.min(debtor.amt, cred.amt);
        matrix[debtor.idx][cred.idx] += pay;
        debtor.amt -= pay;
        cred.amt -= pay;
        if (cred.amt === 0) ci++;
      }
    }
    return matrix;
  }
  function formatNumber(n) { if (n === 0) return '0'; return (n > 0 ? '+' : '') + String(n); }

  function renderScoreboard() {
    const overlay = document.getElementById('scoreboardModal');
    if (!overlay) return;
    const content = overlay.querySelector('#scoreboardContent');
    if (!content) return;
    overlay.style.display = 'flex';
    overlay.setAttribute('aria-hidden', 'false');
    content.innerHTML = '';

    const { computedRounds, netTotals } = replayAndComputeRounds();
    const matrix = buildSettlementMatrix(netTotals);

    // build table (keeps simple styling)
    const table = document.createElement('table');
    table.className = 'scoreboard-table';
    table.style.marginBottom = '12px';
    const colgroup = document.createElement('colgroup');
    const colName = document.createElement('col'); colName.style.width = '180px'; colgroup.appendChild(colName);
    for (let i = 0; i < nPlayers; i++) { const col = document.createElement('col'); col.style.width = '90px'; colgroup.appendChild(col); }
    const colNet = document.createElement('col'); colNet.style.width = '100px'; colgroup.appendChild(colNet);
    table.appendChild(colgroup);

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headEmpty = document.createElement('th'); headEmpty.textContent = 'Pays \\ Receives'; headEmpty.style.padding = '8px'; headEmpty.style.borderBottom = '1px solid #ddd'; headEmpty.style.textAlign = 'left'; headerRow.appendChild(headEmpty);
    for (let j = 0; j < nPlayers; j++) {
      const th = document.createElement('th'); th.textContent = players[j]; th.style.padding = '8px'; th.style.borderBottom = '1px solid #ddd'; headerRow.appendChild(th);
    }
    const netTh = document.createElement('th'); netTh.textContent = 'Net'; netTh.style.padding = '8px'; netTh.style.borderBottom = '1px solid #ddd'; headerRow.appendChild(netTh);
    thead.appendChild(headerRow); table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (let i = 0; i < nPlayers; i++) {
      const tr = document.createElement('tr');
      const th = document.createElement('th'); th.textContent = players[i]; th.style.padding = '8px'; th.style.borderBottom = '1px solid #eee'; th.style.textAlign = 'left'; tr.appendChild(th);
      for (let j = 0; j < nPlayers; j++) {
        const td = document.createElement('td'); td.style.padding = '8px'; td.style.borderBottom = '1px solid #eee'; td.style.textAlign = 'center';
        if (i === j) { td.textContent = '—'; td.style.opacity = '0.6'; }
        else { const v = matrix[i][j] || 0; td.textContent = v === 0 ? '0' : String(v); }
        tr.appendChild(td);
      }
      const netTd = document.createElement('td'); netTd.style.padding = '8px'; netTd.style.borderBottom = '1px solid #eee'; netTd.style.textAlign = 'center';
      const netVal = Math.round(netTotals[i]);
      netTd.textContent = formatNumber(netVal);
      netTd.style.fontWeight = '600';
      netTd.style.color = netVal > 0 ? 'green' : (netVal < 0 ? 'crimson' : '#333');
      tr.appendChild(netTd);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    content.appendChild(table);

    const summary = document.createElement('div'); summary.style.display = 'flex'; summary.style.flexDirection = 'column'; summary.style.gap = '6px';
    const totalsHeader = document.createElement('div'); totalsHeader.textContent = 'Net totals:'; totalsHeader.style.fontWeight = '600'; summary.appendChild(totalsHeader);
    const totalsList = document.createElement('div'); totalsList.style.display = 'grid'; totalsList.style.gridTemplateColumns = 'repeat(auto-fit, minmax(120px, 1fr))'; totalsList.style.gap = '8px';
    for (let i = 0; i < nPlayers; i++) {
      const card = document.createElement('div'); card.style.border = '1px solid #eee'; card.style.padding = '8px'; card.style.borderRadius = '6px';
      const name = document.createElement('div'); name.textContent = players[i]; name.style.fontWeight = '600';
      const val = document.createElement('div'); const netVal = Math.round(netTotals[i]); val.textContent = formatNumber(netVal); val.style.color = netVal > 0 ? 'green' : (netVal < 0 ? 'crimson' : '#333'); val.style.fontWeight = '700';
      card.appendChild(name); card.appendChild(val); totalsList.appendChild(card);
    }
    summary.appendChild(totalsList);

    const roundsToggle = document.createElement('button');
    roundsToggle.textContent = 'Show per-round breakdown';
    roundsToggle.style.marginTop = '10px'; roundsToggle.style.padding = '6px 10px'; roundsToggle.style.border = 'none'; roundsToggle.style.cursor = 'pointer'; roundsToggle.style.borderRadius = '6px';
    const roundsBreakdown = document.createElement('div'); roundsBreakdown.style.display = 'none'; roundsBreakdown.style.marginTop = '10px'; roundsBreakdown.style.maxHeight = '240px'; roundsBreakdown.style.overflow = 'auto'; roundsBreakdown.style.borderTop = '1px dashed #ddd'; roundsBreakdown.style.paddingTop = '8px';
    roundsToggle.addEventListener('click', () => {
      if (roundsToggle._visible) { roundsToggle._visible = false; roundsBreakdown.style.display = 'none'; roundsToggle.textContent = 'Show per-round breakdown'; }
      else { roundsToggle._visible = true; roundsBreakdown.style.display = 'block'; roundsToggle.textContent = 'Hide per-round breakdown'; }
    });
    summary.appendChild(roundsToggle);

    const computed = replayAndComputeRounds().computedRounds;
    computed.forEach((cr, idx) => {
      const rdiv = document.createElement('div'); rdiv.style.padding = '6px 0'; rdiv.style.borderBottom = '1px solid #f7f7f7';
      const title = document.createElement('div'); title.textContent = `Round ${cr.roundNumber} — Winner: ${cr.winnerName} (${cr.method})`; title.style.fontWeight = '600'; rdiv.appendChild(title);
      const row = document.createElement('div'); row.style.display = 'flex'; row.style.gap = '12px'; row.style.marginTop = '6px'; row.style.justifyContent = 'space-between';
      for (let p = 0; p < nPlayers; p++) {
        const cell = document.createElement('div'); cell.style.minWidth = '80px'; cell.textContent = `${players[p]}: ${formatNumber(cr.computedPerPlayerNet[p])}`; row.appendChild(cell);
      }
      rdiv.appendChild(row);
      roundsBreakdown.appendChild(rdiv);
    });

    summary.appendChild(roundsBreakdown);
    content.appendChild(summary);
  }

  if (scoreboardBtn) scoreboardBtn.addEventListener('click', () => { renderScoreboard(); });

  const scoreboardCloseBtn = document.getElementById('scoreboardCloseBtn');
  if (scoreboardCloseBtn) scoreboardCloseBtn.addEventListener('click', () => {
    const overlay = document.getElementById('scoreboardModal'); if (!overlay) return;
    overlay.style.display = 'none'; overlay.setAttribute('aria-hidden', 'true');
  });
  document.addEventListener('click', (e) => { const overlay = document.getElementById('scoreboardModal'); if (!overlay) return; if (e.target === overlay) { overlay.style.display = 'none'; overlay.setAttribute('aria-hidden', 'true'); } });

  // Back button (save snapshot then go back)
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      if (!confirm('Go back to game rules? Unsaved round data will be kept for later.')) return;
      const savedGame = { rules, rounds: getRounds(), lastUpdated: Date.now() };
      localStorage.setItem('tongitsSavedGame', JSON.stringify(savedGame));
      window.location.href = 'gamerules.html';
    });
  }

  // init
  function initializeRoundState() { enterNewRoundMode(); updateNavButtonsVisibility(); }
  initializeRoundState();

  // expose dev helpers (optional)
  window.recomputeAndSaveAllRounds = recomputeAndSaveAllRounds;
  window.listRounds = function() { console.table(getRounds()); };
});
