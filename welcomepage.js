document.addEventListener('DOMContentLoaded', () => {
    const continueBtn = document.querySelector('.continueGameBtn');
    const newGameBtn = document.querySelector('.newGameBtn');

    continueBtn.addEventListener('click', () => {
        const savedGameStr = localStorage.getItem('tongitsSavedGame');
        if (!savedGameStr) {
            alert('No previous game found.');
            return;
        }
        const savedGame = JSON.parse(savedGameStr);
        // Save the rules and rounds back to the localStorage keys used by scorer page
        localStorage.setItem('tongitsRules', JSON.stringify(savedGame.rules));
        localStorage.setItem('tongitsRounds', JSON.stringify(savedGame.rounds));

        // Redirect to scorer page
        window.location.href = 'scorer.html';
    });
     newGameBtn.addEventListener('click', () => {
        // Clear all previous game data
        localStorage.removeItem('tongitsRules');       // Game rules
        localStorage.removeItem('tongitsRounds');      // Rounds data
        localStorage.removeItem('tongitsSavedGame');   // Saved progress

        // Optionally, clear everything completely
        // localStorage.clear();

        // Redirect to the page where the game setup starts
        window.location.href = 'gamerules.html'; // or scorer.html if you start scoring immediately
    });

    // CONTINUE PREVIOUS GAME
    continueBtn.addEventListener('click', () => {
        const savedGameStr = localStorage.getItem('tongitsSavedGame');
        if (!savedGameStr) {
            alert('No previous game found.');
            return;
        }

        const savedGame = JSON.parse(savedGameStr);

        // Restore rules & rounds for scorer page
        localStorage.setItem('tongitsRules', JSON.stringify(savedGame.rules));
        localStorage.setItem('tongitsRounds', JSON.stringify(savedGame.rounds));

        // Go to scorer page
        window.location.href = 'scorer.html';
    });
});

