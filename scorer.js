// scorer.js - with full prev/next navigation and safe overwrite + replay recompute
// Key features:
// - Prev/Next navigate through rounds (flexible, multi-step).
// - Overwrite on save if editing a specific round (not append).
// - Recompute all round snapshots after edits to keep streaks correct.
// - Next button hides when viewing the "current" new round; appears while viewing older rounds.

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

  const specialIds = {
    king: 'kingCount',
    ace: 'aceCount',
    quadra: 'quadraCount',
    straight: 'straightCount',
    multiple: 'multipleMeldsCount',
    queen: 'queenCount',
    jack: 'jackCount'
  };

  const playerNoMeldIds = ['player1NoMeld','player2NoMeld','player3NoMeld','player4NoMeld'];
  const playerFighterIds = ['player1Fighter','player2Fighter','player3Fighter','player4Fighter'];
  const playerDeadwoodIds = ['player1Deadwood','player2Deadwood','player3Deadwood','player4Deadwood'];

  const fightSection = document.querySelector('.fightSection');
  // -------------------------
  // Load rules (required)
  // -------------------------
  let rules;
  try { rules = JSON.parse(localStorage.getItem('tongitsRules')); } catch (e) { rules = null; }

  if (!rules || !Array.isArray(rules.players) || rules.players.length === 0) {
    alert('Game rules or players not found. Please set rules first.');
    window.location.href = 'welcomepage.html';
    return;
  }

  const players = rules.players;
  const nPlayers = players.length;

  // -------------------------
  // Storage helpers
  // -------------------------
  let currentRoundIndex = 0; // zero-based

  function getRounds() {
    return JSON.parse(localStorage.getItem('tongitsRounds') || '[]');
  }
  function setRounds(arr) {
    localStorage.setItem('tongitsRounds', JSON.stringify(arr));
  }

  function makeId() {
    return `${Date.now()}-${Math.floor(Math.random()*10000)}`;
  }

  // viewingRoundIndex:
  //  - null => viewing the "current/new" round (default new round)
  //  - integer => the index (0-based) of the round being viewed/edited
  let viewingRoundIndex = null;

  // -------------------------
  // UI Builders & Helpers
  // -------------------------
  function buildPlayersUI() {
    winnerSelect.innerHTML = '';
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

    playerNoMeldIds.forEach(id => {
      const cb = $(id);
      if (!cb) return;
      cb.style.display = 'none';
      cb.checked = false;
      const lbl = cb.nextElementSibling; if (lbl) lbl.style.display = 'none';
    });

    playerFighterIds.forEach((id, idx) => {
      const cb = $(id); if (!cb) return;
      const lbl = cb.nextElementSibling;
      cb.style.display = 'none';
      if (lbl) { lbl.textContent = players[idx]; lbl.style.display = 'none'; }
      cb.checked = false; cb.onchange = null;
    });

    playerDeadwoodIds.forEach((id, idx) => {
      const dw = $(id); if (!dw) return;
      const row = dw.parentElement;
      row.style.display = 'none';
      const lbl = row.querySelector('label'); if (lbl) lbl.textContent = players[idx];
      dw.value = 0;
    });
  }
  buildPlayersUI();

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
  winnerSelect.addEventListener('change', updateNoMeldUI);

  function updateWinMethodUI() {
    const methodEl = document.querySelector('input[name="winMethod"]:checked');
    const method = methodEl ? methodEl.value : null;
    if (!method || !fightSection) {
      if (fightSection) fightSection.style.display = 'none';
      playerFighterIds.forEach((id, idx) => {
        const cb = $(id);
        if (!cb) return;
        cb.checked = false; cb.style.display = 'none';
        const lbl = cb.nextElementSibling; if (lbl) lbl.style.display = 'none';
        const dw = $(playerDeadwoodIds[idx]); if (dw) dw.parentElement.style.display = 'none';
      });
      return;
    }

    if (method === 'fight') {
      fightSection.style.display = 'block';
      const winnerIdx = winnerSelect.value === '' ? NaN : parseInt(winnerSelect.value);
      playerFighterIds.forEach((id, idx) => {
        const cb = $(id); if (!cb) return;
        const lbl = cb.nextElementSibling;
        const dw = $(playerDeadwoodIds[idx]);
        if (idx >= nPlayers || (!isNaN(winnerIdx) && idx === winnerIdx)) {
          cb.checked = false; cb.style.display = 'none'; if (lbl) lbl.style.display = 'none';
          if (dw) { dw.value = 0; dw.parentElement.style.display = 'none'; }
          cb.onchange = null;
        } else {
          cb.style.display = 'inline-block';
          if (lbl) { lbl.style.display = 'inline-block'; lbl.textContent = players[idx]; }
          if (dw) dw.parentElement.style.display = cb.checked ? 'flex' : 'none';
          cb.onchange = function () {
            if (dw) dw.parentElement.style.display = cb.checked ? 'flex' : 'none';
            if (!cb.checked && dw) dw.value = 0;
          };
        }
      });
    } else {
      fightSection.style.display = 'none';
      playerFighterIds.forEach((id, idx) => {
        const cb = $(id); if (!cb) return;
        cb.checked = false; cb.style.display = 'none';
        const lbl = cb.nextElementSibling; if (lbl) lbl.style.display = 'none';
        const dw = $(playerDeadwoodIds[idx]); if (dw) { dw.parentElement.style.display = 'none'; dw.value = 0; }
        cb.onchange = null;
      });
    }
  }
  winMethodRadios.forEach(r => r.addEventListener('change', updateWinMethodUI));
  updateWinMethodUI();

  function findNumberInput(btn) {
    let parent = btn.parentElement;
    while (parent && parent !== document.body) {
      const input = parent.querySelector('input[type="number"]');
      if (input) return input;
      parent = parent.parentElement;
    }
    let prev = btn.previousElementSibling;
    while (prev) { if (prev.tagName === 'INPUT' && prev.type === 'number') return prev; prev = prev.previousElementSibling; }
    let next = btn.nextElementSibling;
    while (next) { if (next.tagName === 'INPUT' && next.type === 'number') return next; next = next.nextElementSibling; }
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

  function readInt(id) {
    const el = $(id);
    if (!el) return 0;
    return parseInt(el.value || 0) || 0;
  }

  // -------------------------
  // Calculation helpers
  // -------------------------
  function computeWinnerSpecialTotalFromObj(specialCounts) {
    let total = 0;
    if (rules.cardValues) {
      if (rules.cardValues.king && rules.cardValues.king.enabled) total += (parseInt(specialCounts.king) || 0) * (parseInt(rules.cardValues.king.value) || 0);
      if (rules.cardValues.ace && rules.cardValues.ace.enabled) total += (parseInt(specialCounts.ace) || 0) * (parseInt(rules.cardValues.ace.value) || 0);
      if (rules.cardValues.queen && rules.cardValues.queen.enabled) total += (parseInt(specialCounts.queen) || 0) * (parseInt(rules.cardValues.queen.value) || 0);
      if (rules.cardValues.jack && rules.cardValues.jack.enabled) total += (parseInt(specialCounts.jack) || 0) * (parseInt(rules.cardValues.jack.value) || 0);
    }
    if (rules.melds) {
      if (rules.melds.quadra && rules.melds.quadra.enabled) total += (parseInt(specialCounts.quadra) || 0) * (parseInt(rules.melds.quadra.value) || 0);
      if (rules.melds.quadraUpgrade && rules.melds.quadraUpgrade.enabled) total += (parseInt(specialCounts.quadra) || 0) * (parseInt(rules.melds.quadraUpgrade.value) || 0);
      if (rules.melds.straight && rules.melds.straight.enabled) total += (parseInt(specialCounts.straight) || 0) * (parseInt(rules.melds.straight.value) || 0);
      if (rules.melds.multipleMelds && rules.melds.multipleMelds.enabled) total += (parseInt(specialCounts.multipleMelds) || 0) * (parseInt(rules.melds.multipleMelds.value) || 0);
    }
    return total;
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

  // -------------------------
  // Core: replay to compute rounds and totals (used for scoreboard and recompute)
  // -------------------------
  function replayAndComputeRounds(roundsSource) {
    // Accept optional source (array) for testing; default to stored rounds.
    const rounds = Array.isArray(roundsSource) ? roundsSource : getRounds();
    const computedRounds = [];
    const totals = new Array(nPlayers).fill(0);

    for (let i = 0; i < rounds.length; i++) {
      const r = rounds[i];

      // compute consecutiveBefore by looking back in computedRounds (replay)
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

  // Recompute and replace stored perPlayerNet and streak info for all rounds
  function recomputeAndSaveAllRounds() {
    const existing = getRounds();
    const { computedRounds } = replayAndComputeRounds(existing);
    // Map computed back to stored rounds, preserving id and roundNumber, but updating snapshots
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
        // update stored snapshot fields to match computed values
        streakConsecutiveBefore: cr.computedStreakConsecutiveBefore,
        streakAfter: cr.computedStreakAfter,
        perPlayerNet: cr.computedPerPlayerNet
      };
    });
    setRounds(newStored);
    return newStored;
  }

  // -------------------------
  // Saving a round (append OR overwrite if editing index present)
  // saveRound now returns true on success, false on validation failure
  // -------------------------
  function saveRound(saveIndex = null) {
    // saveIndex: if null => append (new round)
    // otherwise => overwrite at specified index

    const winnerIdxStr = winnerSelect.value;
    if (winnerIdxStr === '') { alert('Please select a winner.'); return false; }
    const winnerIdx = parseInt(winnerIdxStr);
    if (isNaN(winnerIdx)) { alert('Invalid winner selection.'); return false; }

    const methodEl = document.querySelector('input[name="winMethod"]:checked');
    if (!methodEl) { alert('Please choose a method of winning.'); return false; }
    const method = methodEl.value;

    const fightVals = getFightRuleValues();
    const baseVals = getBaseWinValues();

    const prevRounds = getRounds();
    // For streak calculation, use the stored rounds but if overwriting a previous round,
    // do not include the old snapshot of that round when calculating "consecutiveBefore".
    let consecutiveBefore = 0;
    if (saveIndex === null) {
      // saving a new round, look at prevRounds as-is
      for (let i = prevRounds.length - 1; i >= 0; i--) {
        const r = prevRounds[i];
        if (r && r.winnerIndex === winnerIdx) consecutiveBefore++;
        else break;
      }
    } else {
      // saving into an existing index. We should compute consecutiveBefore by replaying
      // rounds up to (but excluding) saveIndex, because we are replacing that slot.
      let idx = saveIndex - 1;
      for (; idx >= 0; idx--) {
        const r = prevRounds[idx];
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

    const specialCountsUI = {
      king: readInt(specialIds.king),
      ace: readInt(specialIds.ace),
      quadra: readInt(specialIds.quadra),
      straight: readInt(specialIds.straight),
      multipleMelds: readInt(specialIds.multiple)
    };
    const winnerSpecialTotal = computeWinnerSpecialTotalFromObj(specialCountsUI);

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
        streakConsecutiveBefore: consecutiveBefore,
        streakAfter: consecutiveBefore + 1,
        perPlayerNet
      };
      rounds.push(roundObj);
      setRounds(rounds);
    } else {
      // overwrite into index (preserve id and roundNumber)
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
        streakConsecutiveBefore: consecutiveBefore,
        streakAfter: consecutiveBefore + 1,
        perPlayerNet
      };
      rounds[saveIndex] = roundObj;
      setRounds(rounds);
      // IMPORTANT: when editing earlier round we MUST recompute all subsequent rounds snapshots
      recomputeAndSaveAllRounds();
    }

    // Update UI + feedback
    let summary = `Round saved — Winner: ${roundObj.winnerName} (${roundObj.method})\n\n`;
    for (let i = 0; i < nPlayers; i++) summary += `${players[i]}: ${perPlayerNet[i] >= 0 ? '+' : ''}${perPlayerNet[i]}\n`;
    alert(summary);

    // update next round number in UI
    const newNextNumber = (getRounds().length) + 1;
    roundNumberSpan.textContent = String(newNextNumber);

    resetRoundUI();

    return true;
  }

  // -------------------------
  // Load round into form for editing
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

    const radio = document.querySelector(`input[name="winMethod"][value="${r.method}"]`);
    if (radio) radio.checked = true;
    updateWinMethodUI();

    roundNumberSpan.textContent = String(r.roundNumber);
    updateNavButtonsVisibility();
    updateNextButtonLabel();
  }

  // -------------------------
  // Enter "new/current" round mode (not editing any saved round)
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
  // Reset UI form (no changes to storage)
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
      const dw = $(playerDeadwoodIds[idx]); if (dw) { dw.value = 0; dw.parentElement.style.display = 'none'; }
      const lbl = cb ? cb.nextElementSibling : null; if (lbl) lbl.style.display = 'none';
    });
    updateWinMethodUI();
  }

  // -------------------------
  // Navigation button helpers
  // -------------------------
  function updateNavButtonsVisibility() {
    const rounds = getRounds();
    const hasRounds = rounds.length > 0;

    // Prev visible if there are rounds and we are at new round OR viewing older than 0
    // We'll always show Prev if there's at least one saved round (user can go back)
    if (prevRoundBtn) prevRoundBtn.style.display = hasRounds ? '' : 'none';

    // Also, disable prev when at first round (index 0)
    if (prevRoundBtn) {
      const disablePrev = !hasRounds || viewingRoundIndex === 0 && viewingRoundIndex !== null;
      prevRoundBtn.disabled = disablePrev;
    }

    if (nextRoundBtn) {
      // disable next only if viewing the latest saved round? We keep it enabled.
      // User may click Next to go forward; we handle next => new round when at last.
      nextRoundBtn.disabled = false;
    }
  }
  function updateNextButtonLabel() {
  if (viewingRoundIndex === null) {
    nextRoundBtn.innerHTML = `Proceed to New Round <i class='bx bx-chevron-right'></i>`;
  } else {
    nextRoundBtn.innerHTML = `<i class='bx bx-chevron-right'></i>`;
  }
}


  // Attempt to save current editing round (if viewingRoundIndex !== null)
  // Returns true if navigation should proceed, false if cancelled.
  function saveCurrentEditingBeforeNavigate() {
    if (viewingRoundIndex === null) return true; // nothing to save
    // Try to save. If saveRound returns false -> validation failed.
    const saved = saveRound(viewingRoundIndex);
    if (!saved) {
      // Ask whether to discard changes and continue navigation
      const ok = confirm('Current round is incomplete or invalid. Discard changes and continue navigation? (Cancel to stay)');
      return ok;
    }
    // saved ok
    return true;
  }

  // Prev button behavior: flexible multi-step backward
  if (prevRoundBtn) {
    prevRoundBtn.addEventListener('click', () => {
      const rounds = getRounds();
      if (!rounds.length) { alert('No saved rounds.'); return; }

      // If not currently viewing any round, go to last one
      if (viewingRoundIndex === null) {
        // load last
        loadRoundForEdit(rounds.length - 1);
        return;
      }

      // We are viewing a round: attempt to save current then move back
      if (!saveCurrentEditingBeforeNavigate()) return; // aborted

      if (viewingRoundIndex > 0) {
        loadRoundForEdit(viewingRoundIndex - 1);
      } else {
        alert('Already at the first round.');
      }
    });
  }

  // Next button behavior: forward (when viewing older rounds)
 nextRoundBtn.addEventListener('click', () => {
  const rounds = getRounds();

  // Always try to save current state first (edit-safe)
  const saved = saveCurrentEditingBeforeNavigate();
  if (!saved) return;

  // CASE 1: Viewing a past round → go forward
  if (viewingRoundIndex !== null && viewingRoundIndex < rounds.length - 1) {
    loadRoundForEdit(viewingRoundIndex + 1);
    return;
  }

  // CASE 2: Viewing latest saved round → go to new round
  if (viewingRoundIndex === rounds.length - 1) {
    enterNewRoundMode();
    return;
  }

  // CASE 3: Already on new/current round → save & create next round
  if (viewingRoundIndex === null) {
    saveRound(null);        // save current round
    enterNewRoundMode();    // move to new round
  }
});


  // -------------------------
  // Save Progress (persist everything + snapshot of current form)
  // -------------------------
  if (saveProgressBtn) {
    saveProgressBtn.addEventListener('click', () => {
      try {
        // If form filled, try saving into current editing slot (if viewing) or append (if new)
        if (winnerSelect.value !== '' && document.querySelector('input[name="winMethod"]:checked')) {
          if (viewingRoundIndex === null) saveRound(null);
          else saveRound(viewingRoundIndex);
        }
      } catch (e) { /* ignore */ }

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
          deadwood: playerDeadwoodIds.map(id => $(id) ? (parseInt($(id).value) || 0) : 0)
        }
      };

      localStorage.setItem('tongitsSavedGame', JSON.stringify(savedGame));
      window.location.href = 'welcomepage.html';
    });
  }

  // -------------------------
  // Prev quick-load behaviour preserved (clicking once loads last round)
  // We'll initialize nav visibility
  // -------------------------
  function initializeRoundState() {
    // default to new round mode
    enterNewRoundMode();
    updateNavButtonsVisibility();
  }

  initializeRoundState();

  // -------------------------
  // Scoreboard modal + settlement matrix (keeps your existing logic)
  // (unchanged from previous implementation; uses replayAndComputeRounds)
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

  function formatNumber(n) {
    if (n === 0) return '0';
    return (n > 0 ? '+' : '') + String(n);
  }
/* ===== scoreboard: use static HTML modal (instead of creating it dynamically) ===== */

function createScoreboardModal() {
  // no-op because modal markup is now in HTML
  return;
}

function renderScoreboard() {
  const overlay = document.getElementById('scoreboardModal');
  if (!overlay) return;
  const content = overlay.querySelector('#scoreboardContent');
  if (!content) return;

  // show modal
  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');

  // clear
  content.innerHTML = '';

  // compute rounds and matrix (uses your existing replayAndComputeRounds + buildSettlementMatrix)
  const { computedRounds, netTotals } = replayAndComputeRounds();
  const matrix = buildSettlementMatrix(netTotals);

  // Build table (same structure as before)
const table = document.createElement('table');
table.className = 'scoreboard-table';
table.style.marginBottom = '12px';

/* lock column alignment */
const colgroup = document.createElement('colgroup');

/* name column */
const colName = document.createElement('col');
colName.style.width = '180px';
colgroup.appendChild(colName);

/* matrix columns */
for (let i = 0; i < nPlayers; i++) {
  const col = document.createElement('col');
  col.style.width = '90px';
  colgroup.appendChild(col);
}

/* net column */
const colNet = document.createElement('col');
colNet.style.width = '100px';
colgroup.appendChild(colNet);

table.appendChild(colgroup);

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  const headEmpty = document.createElement('th');
  headEmpty.textContent = 'Pays \\ Receives';
  headEmpty.style.padding = '8px';
  headEmpty.style.borderBottom = '1px solid #ddd';
  headEmpty.style.textAlign = 'left';
  headerRow.appendChild(headEmpty);

  for (let j = 0; j < nPlayers; j++) {
    const th = document.createElement('th');
    th.textContent = players[j];
    th.style.padding = '8px';
    th.style.borderBottom = '1px solid #ddd';
    headerRow.appendChild(th);
  }
  const netTh = document.createElement('th');
  netTh.textContent = 'Net';
  netTh.style.padding = '8px';
  netTh.style.borderBottom = '1px solid #ddd';
  headerRow.appendChild(netTh);

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (let i = 0; i < nPlayers; i++) {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.textContent = players[i];
    th.style.padding = '8px';
    th.style.borderBottom = '1px solid #eee';
    th.style.textAlign = 'left';
    tr.appendChild(th);

    for (let j = 0; j < nPlayers; j++) {
      const td = document.createElement('td');
      td.style.padding = '8px';
      td.style.borderBottom = '1px solid #eee';
      td.style.textAlign = 'center';
      if (i === j) {
        td.textContent = '—';
        td.style.opacity = '0.6';
      } else {
        const v = matrix[i][j] || 0;
        td.textContent = v === 0 ? '0' : String(v);
      }
      tr.appendChild(td);
    }

    const netTd = document.createElement('td');
    netTd.style.padding = '8px';
    netTd.style.borderBottom = '1px solid #eee';
    netTd.style.textAlign = 'center';
    const netVal = Math.round(netTotals[i]);
    netTd.textContent = formatNumber(netVal);
    netTd.style.fontWeight = '600';
    netTd.style.color = netVal > 0 ? 'green' : (netVal < 0 ? 'crimson' : '#333');
    tr.appendChild(netTd);

    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  content.appendChild(table);

  // summary area (same structure)
  const summary = document.createElement('div');
  summary.style.display = 'flex';
  summary.style.flexDirection = 'column';
  summary.style.gap = '6px';

  const totalsHeader = document.createElement('div');
  totalsHeader.textContent = 'Net totals:';
  totalsHeader.style.fontWeight = '600';
  summary.appendChild(totalsHeader);

  const totalsList = document.createElement('div');
  totalsList.style.display = 'grid';
  totalsList.style.gridTemplateColumns = 'repeat(auto-fit, minmax(120px, 1fr))';
  totalsList.style.gap = '8px';

  for (let i = 0; i < nPlayers; i++) {
    const card = document.createElement('div');
    card.style.border = '1px solid #eee';
    card.style.padding = '8px';
    card.style.borderRadius = '6px';
    const name = document.createElement('div');
    name.textContent = players[i];
    name.style.fontWeight = '600';
    const val = document.createElement('div');
    const netVal = Math.round(netTotals[i]);
    val.textContent = formatNumber(netVal);
    val.style.color = netVal > 0 ? 'green' : (netVal < 0 ? 'crimson' : '#333');
    val.style.fontWeight = '700';
    card.appendChild(name);
    card.appendChild(val);
    totalsList.appendChild(card);
  }
  summary.appendChild(totalsList);

  const roundsToggle = document.createElement('button');
  roundsToggle.textContent = 'Show per-round breakdown';
  roundsToggle.style.marginTop = '10px';
  roundsToggle.style.padding = '6px 10px';
  roundsToggle.style.border = 'none';
  roundsToggle.style.cursor = 'pointer';
  roundsToggle.style.borderRadius = '6px';
  roundsToggle.addEventListener('click', () => {
    if (roundsToggle._visible) {
      roundsToggle._visible = false;
      roundsBreakdown.style.display = 'none';
      roundsToggle.textContent = 'Show per-round breakdown';
    } else {
      roundsToggle._visible = true;
      roundsBreakdown.style.display = 'block';
      roundsToggle.textContent = 'Hide per-round breakdown';
    }
  });
  summary.appendChild(roundsToggle);

  const roundsBreakdown = document.createElement('div');
  roundsBreakdown.style.display = 'none';
  roundsBreakdown.style.marginTop = '10px';
  roundsBreakdown.style.maxHeight = '240px';
  roundsBreakdown.style.overflow = 'auto';
  roundsBreakdown.style.borderTop = '1px dashed #ddd';
  roundsBreakdown.style.paddingTop = '8px';

  computedRounds.forEach((cr, idx) => {
    const rdiv = document.createElement('div');
    rdiv.style.padding = '6px 0';
    rdiv.style.borderBottom = '1px solid #f7f7f7';
    const title = document.createElement('div');
    title.textContent = `Round ${cr.roundNumber} — Winner: ${cr.winnerName} (${cr.method})`;
    title.style.fontWeight = '600';
    rdiv.appendChild(title);

    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '12px';
    row.style.marginTop = '6px';
    row.style.justifyContent = 'space-between';
    for (let p = 0; p < nPlayers; p++) {
      const cell = document.createElement('div');
      cell.style.minWidth = '80px';
      cell.textContent = `${players[p]}: ${formatNumber(cr.computedPerPlayerNet[p])}`;
      row.appendChild(cell);
    }
    rdiv.appendChild(row);
    roundsBreakdown.appendChild(rdiv);
  });

  summary.appendChild(roundsBreakdown);
  content.appendChild(summary);
}

// hook: scoreboard button already defined earlier — keep this
if (scoreboardBtn) {
  scoreboardBtn.addEventListener('click', () => { renderScoreboard(); });
}

// close button: hide modal
const scoreboardCloseBtn = document.getElementById('scoreboardCloseBtn');
if (scoreboardCloseBtn) {
  scoreboardCloseBtn.addEventListener('click', () => {
    const overlay = document.getElementById('scoreboardModal');
    if (!overlay) return;
    overlay.style.display = 'none';
    overlay.setAttribute('aria-hidden', 'true');
  });
}

// clicking overlay background hides it
document.addEventListener('click', (e) => {
  const overlay = document.getElementById('scoreboardModal');
  if (!overlay) return;
  if (e.target === overlay) {
    overlay.style.display = 'none';
    overlay.setAttribute('aria-hidden', 'true');
  }
});

  // -------------------------
  // Back button behavior (save snapshot then go back)
  // -------------------------
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      if (!confirm('Go back to game rules? Unsaved round data will be kept for later.')) return;
      const savedGame = {
        rules,
        rounds: getRounds(),
        lastUpdated: Date.now()
      };
      localStorage.setItem('tongitsSavedGame', JSON.stringify(savedGame));
      window.location.href = 'gamerules.html';
    });
  }

  // Developer helpers for console (optional)
  window.overwriteRound = function(indexZeroBased, newRoundObj) {
    const rounds = getRounds();
    if (indexZeroBased < 0 || indexZeroBased >= rounds.length) { console.warn('invalid index'); return; }
    newRoundObj.id = newRoundObj.id || rounds[indexZeroBased].id;
    newRoundObj.roundNumber = rounds[indexZeroBased].roundNumber;
    rounds[indexZeroBased] = newRoundObj;
    setRounds(rounds);
    recomputeAndSaveAllRounds();
    console.log('Round overwritten', indexZeroBased, newRoundObj);
  };

  window.deleteRound = function(indexZeroBased) {
    const rounds = getRounds();
    if (indexZeroBased < 0 || indexZeroBased >= rounds.length) { console.warn('invalid index'); return; }
    rounds.splice(indexZeroBased, 1);
    for (let i = 0; i < rounds.length; i++) rounds[i].roundNumber = i + 1;
    setRounds(rounds);
    recomputeAndSaveAllRounds();
    console.log('Deleted round', indexZeroBased);
    enterNewRoundMode();
  };

  window.listRounds = function() { console.table(getRounds()); };

});
