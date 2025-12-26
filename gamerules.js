// ================== Player Names Dynamic Generation ==================
const numPlayersSelect = document.getElementById('numPlayers');
const playerNamesContainer = document.getElementById('playerNames');

numPlayersSelect.addEventListener('change', () => {
    const numPlayers = parseInt(numPlayersSelect.value);
    playerNamesContainer.innerHTML = ''; // clear previous inputs

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

        div.appendChild(label);
        div.appendChild(input);
        playerNamesContainer.appendChild(div);
    }
});

// ================== Helper Function to Get Checkbox + Number Values ==================
function getCheckboxValue(idCheckbox, idNumber) {
    const isChecked = document.getElementById(idCheckbox).checked;
    const value = parseInt(document.getElementById(idNumber).value) || 0;
    return { enabled: isChecked, value };
}

// ================== +/- Buttons Functionality ==================
function findNumberInput(btn) {
    let parent = btn.parentElement;
    while (parent && parent !== document.body) {
        const input = parent.querySelector('input[type="number"]');
        if (input) return input;
        parent = parent.parentElement;
    }
    return null;
}

function initPlusMinusButtons() {
    document.querySelectorAll('.increaseBtn').forEach(btn => {
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

// ================== Win Streak Section ==================
const stackableSelect = document.getElementById('stackableStreak');
const streakBaseInput = document.getElementById('streakBase');
const streakPerStackWrap = document.getElementById('streakPerStackWrap');
const streakPerStackInput = document.getElementById('streakPerStack');

function updateStreakVisibility() {
    const stackable = stackableSelect.value === 'yes';
    streakPerStackWrap.style.display = stackable ? 'flex' : 'none';
}
// initialize
updateStreakVisibility();
stackableSelect.addEventListener('change', updateStreakVisibility);

// ================== Fight Rules Section ==================
const fighterChk = document.getElementById('fighterPaysMoreChk');

// Elements to show/hide when checkbox is checked
const fightDetailRows = [
    document.getElementById('fighterLoss').parentElement, // Fighter loss row
    document.getElementById('nonFighterLoss').parentElement, // Non-fighter loss row
    document.getElementById('countDeadwoodChk').parentElement, // Count deadwood row
    document.getElementById('deadwoodValue').parentElement // Deadwood value row (if separate)
];

function updateFightVisibility() {
    const show = fighterChk.checked;
    fightDetailRows.forEach(row => {
        row.style.display = show ? 'flex' : 'none';
    });
}

// Initialize visibility on page load
updateFightVisibility();

// Add event listener to toggle visibility when checkbox changes
fighterChk.addEventListener('change', updateFightVisibility);

fighterChk.addEventListener('change', updateFightVisibility);
updateFightVisibility();

// ================== Save Rules to localStorage ==================
const saveBtn = document.getElementById('saveRulesBtn');
saveBtn.addEventListener('click', () => {
    const rulesData = {};

    // ----- Players -----
    const numPlayers = parseInt(numPlayersSelect.value);
    rulesData.players = [];
    for (let i = 1; i <= numPlayers; i++) {
        const playerInput = document.getElementById(`player${i}Name`);
        rulesData.players.push(playerInput ? playerInput.value : `Player ${i}`);
    }

    // ----- Card Values -----
    rulesData.cardValues = {
        king: getCheckboxValue('kingChk', 'kingValue'),
        queen: getCheckboxValue('queenChk', 'queenValue'),
        jack: getCheckboxValue('jackChk', 'jackValue'),
        ace: getCheckboxValue('aceChk', 'aceValue')
    };

    // ----- Win Bonuses -----
    rulesData.winBonuses = {
        tongits: getCheckboxValue('tongitsChk', 'tongitsValue'),
        normalWin: getCheckboxValue('normalWinChk', 'normalWinValue'),
        fight: getCheckboxValue('fightWinChk', 'fightWinValue')
    };

    // ----- Melds -----
    rulesData.melds = {
        quadra: getCheckboxValue('quadraMeldChk', 'quadraMeldValue'),
        quadraUpgrade: getCheckboxValue('kindUpgradeChk', 'quadraMeldValue'),
        straight: getCheckboxValue('straightChk', 'straightValue'),
        multipleMelds: getCheckboxValue('multipleMeldChk', 'multipleMeldValue'),
        noMeld: getCheckboxValue('noMeldChk', 'noMeldValue')
    };

    // ----- Win Streak -----
    rulesData.winStreak = {
        stackable: stackableSelect.value === 'yes',
        base: parseInt(streakBaseInput.value) || 0,
        perStack: parseInt(streakPerStackInput.value) || 0
    };

    // ----- Fight Rules -----
    rulesData.fightRules = {
        fighterPaysMore: fighterChk.checked,
        fighterLoss: parseInt(document.getElementById('fighterLoss').value) || 0,
        nonFighterLoss: parseInt(document.getElementById('nonFighterLoss').value) || 0,
        countDeadwood: document.getElementById('countDeadwoodChk').checked,
        deadwoodValue: parseInt(document.getElementById('deadwoodValue').value) || 0
    };

    localStorage.setItem('tongitsRules', JSON.stringify(rulesData));
    alert('Rules saved successfully!');
    window.location.href = 'scorer.html'; // change if different
});

// ================== Reset Button ==================
const resetBtn = document.getElementById('resetRulesBtn');
resetBtn.addEventListener('click', () => {
    localStorage.removeItem('tongitsRules');
    document.querySelectorAll('input[type="text"], input[type="number"]').forEach(input => input.value = '');
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => checkbox.checked = false);
    numPlayersSelect.value = '';
    stackableSelect.value = 'yes';
    playerNamesContainer.innerHTML = '';
    streakBaseInput.value = '0';
    streakPerStackInput.value = '0';
    updateStreakVisibility();
    updateFightVisibility();
});
// ================== Back Button ==================
const backBtn = document.querySelector('.gamerulesHeader .returnBtn');

backBtn.addEventListener('click', () => {
    // Go back to Page 1
    window.location.href = 'index.html'; // change this to your actual Page 1 filename
    // OR if you just want browser history:
    // window.history.back();
});

