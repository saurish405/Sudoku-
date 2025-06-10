document.addEventListener('DOMContentLoaded', () => {
    // Game state
    const gameState = {
        board: Array(9).fill().map(() => Array(9).fill(0)),
        solution: Array(9).fill().map(() => Array(9).fill(0)),
        fixedCells: Array(9).fill().map(() => Array(9).fill(false)),
        timer: null,
        seconds: 0,
        solvedCount: parseInt(localStorage.getItem('solvedCount')) || 0,
        bestTime: parseInt(localStorage.getItem('bestTime')) || null
    };

    // DOM elements
    const boardElement = document.getElementById('board');
    const timeElement = document.getElementById('time');
    const solvedCountElement = document.getElementById('solved-count');
    const messageElement = document.getElementById('message');
    const newGameButton = document.getElementById('new-game');
    const checkSolutionButton = document.getElementById('check-solution');
    const resetButton = document.getElementById('reset');
    const hintButton = document.getElementById('hint');
    const difficultySelect = document.getElementById('difficulty');
    const modal = document.getElementById('confirmation-modal');
    const confirmResetButton = document.getElementById('confirm-reset');
    const cancelResetButton = document.getElementById('cancel-reset');

    // Initialize game
    initGame();

    // Event listeners
    newGameButton.addEventListener('click', initGame);
    checkSolutionButton.addEventListener('click', checkSolution);
    resetButton.addEventListener('click', showResetConfirmation);
    confirmResetButton.addEventListener('click', resetGame);
    cancelResetButton.addEventListener('click', hideResetConfirmation);
    hintButton.addEventListener('click', giveHint);

    // Functions
    function initGame() {
        // Stop any running timer
        if (gameState.timer) {
            clearInterval(gameState.timer);
            gameState.timer = null;
        }

        // Reset timer
        gameState.seconds = 0;
        updateTimerDisplay();

        // Clear any messages
        clearMessage();

        // Generate a new puzzle
        generatePuzzle();

        // Start timer
        gameState.timer = setInterval(() => {
            gameState.seconds++;
            updateTimerDisplay();
        }, 1000);

        // Update solved count display
        updateSolvedCount();
    }

    function generatePuzzle() {
        // Generate a complete solution
        generateSolution();

        // Copy solution to board
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                gameState.board[i][j] = gameState.solution[i][j];
                gameState.fixedCells[i][j] = false;
            }
        }

        // Remove numbers based on difficulty
        const difficulty = difficultySelect.value;
        let cellsToRemove;

        switch (difficulty) {
            case 'easy':
                cellsToRemove = 40; // Leaves 41 clues
                break;
            case 'hard':
                cellsToRemove = 60; // Leaves 21 clues
                break;
            case 'medium':
            default:
                cellsToRemove = 50; // Leaves 31 clues
        }

        removeNumbers(cellsToRemove);

        // Render the board
        renderBoard();
    }

    function generateSolution() {
        // Create an empty board
        const emptyBoard = Array(9).fill().map(() => Array(9).fill(0));

        // Fill the board using backtracking
        fillBoard(emptyBoard);

        // Copy to solution
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                gameState.solution[i][j] = emptyBoard[i][j];
            }
        }
    }

    function fillBoard(board, row = 0, col = 0) {
        if (row === 9) return true; // Reached the end
        if (col === 9) return fillBoard(board, row + 1, 0); // Move to next row
        if (board[row][col] !== 0) return fillBoard(board, row, col + 1); // Skip filled cells

        // Try numbers 1-9 in random order
        const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        shuffleArray(numbers);

        for (const num of numbers) {
            if (isValidPlacement(board, row, col, num)) {
                board[row][col] = num;
                if (fillBoard(board, row, col + 1)) {
                    return true;
                }
                board[row][col] = 0; // Backtrack
            }
        }

        return false; // Trigger backtracking
    }

    function removeNumbers(cellsToRemove) {
        let removed = 0;
        const positions = [];

        // Create array of all positions
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                positions.push([i, j]);
            }
        }

        // Shuffle positions
        shuffleArray(positions);

        // Try to remove numbers while ensuring unique solution
        for (const [i, j] of positions) {
            if (removed >= cellsToRemove) break;

            const temp = gameState.board[i][j];
            gameState.board[i][j] = 0;

            // Check if the puzzle still has a unique solution
            if (hasUniqueSolution()) {
                gameState.fixedCells[i][j] = false;
                removed++;
            } else {
                gameState.board[i][j] = temp; // Put it back
                gameState.fixedCells[i][j] = true; // Mark as fixed
            }
        }
    }

    function hasUniqueSolution() {
        // Make a copy of the current board
        const boardCopy = gameState.board.map(row => [...row]);
        
        // Count solutions (should be exactly 1)
        return countSolutions(boardCopy) === 1;
    }

    function countSolutions(board, row = 0, col = 0, count = 0) {
        if (row === 9) return count + 1; // Found a solution
        if (col === 9) return countSolutions(board, row + 1, 0, count);
        if (board[row][col] !== 0) return countSolutions(board, row, col + 1, count);

        // Try numbers 1-9
        for (let num = 1; num <= 9 && count < 2; num++) {
            if (isValidPlacement(board, row, col, num)) {
                board[row][col] = num;
                count = countSolutions(board, row, col + 1, count);
                board[row][col] = 0; // Backtrack
            }
        }

        return count;
    }

    function isValidPlacement(board, row, col, num) {
        // Check row
        for (let j = 0; j < 9; j++) {
            if (board[row][j] === num) return false;
        }

        // Check column
        for (let i = 0; i < 9; i++) {
            if (board[i][col] === num) return false;
        }

        // Check 3x3 box
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        
        for (let i = boxRow; i < boxRow + 3; i++) {
            for (let j = boxCol; j < boxCol + 3; j++) {
                if (board[i][j] === num) return false;
            }
        }

        return true;
    }

    function renderBoard() {
        boardElement.innerHTML = '';
        
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                
                if (gameState.fixedCells[i][j]) {
                    cell.classList.add('fixed');
                    cell.textContent = gameState.board[i][j];
                } else {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.maxLength = 1;
                    input.value = gameState.board[i][j] !== 0 ? gameState.board[i][j] : '';
                    
                    // Add event listeners
                    input.addEventListener('input', (e) => {
                        const value = e.target.value;
                        if (/^[1-9]$/.test(value)) {
                            gameState.board[i][j] = parseInt(value);
                            e.target.value = value;
                            clearCellError(i, j);
                        } else {
                            gameState.board[i][j] = 0;
                            e.target.value = '';
                        }
                    });
                    
                    input.addEventListener('keydown', (e) => {
                        // Allow navigation with arrow keys
                        if (e.key.startsWith('Arrow')) {
                            moveFocus(i, j, e.key);
                        }
                    });
                    
                    cell.appendChild(input);
                }
                
                boardElement.appendChild(cell);
            }
        }
    }

    function moveFocus(row, col, direction) {
        let newRow = row;
        let newCol = col;
        
        switch (direction) {
            case 'ArrowUp': newRow = Math.max(0, row - 1); break;
            case 'ArrowDown': newRow = Math.min(8, row + 1); break;
            case 'ArrowLeft': newCol = Math.max(0, col - 1); break;
            case 'ArrowRight': newCol = Math.min(8, col + 1); break;
        }
        
        // Calculate the index in the boardElement's children
        const index = newRow * 9 + newCol;
        const newCell = boardElement.children[index];
        const input = newCell.querySelector('input');
        
        if (input) {
            input.focus();
        }
    }

    function checkSolution() {
        // Check if the board is complete
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                if (gameState.board[i][j] === 0) {
                    showMessage('Please fill in all cells before checking.', 'error');
                    return;
                }
            }
        }

        // Check if the solution matches
        let isValid = true;
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                if (gameState.board[i][j] !== gameState.solution[i][j]) {
                    markCellError(i, j);
                    isValid = false;
                }
            }
        }

        if (isValid) {
            // Puzzle solved successfully
            showMessage('Congratulations! You solved the puzzle correctly!', 'success');
            
            // Stop timer
            clearInterval(gameState.timer);
            gameState.timer = null;
            
            // Update stats
            gameState.solvedCount++;
            updateSolvedCount();
            
            // Check for best time
            if (gameState.bestTime === null || gameState.seconds < gameState.bestTime) {
                gameState.bestTime = gameState.seconds;
            }
            
            // Save to localStorage
            localStorage.setItem('solvedCount', gameState.solvedCount.toString());
            localStorage.setItem('bestTime', gameState.bestTime.toString());
        } else {
            showMessage('There are errors in your solution. Incorrect cells are highlighted.', 'error');
        }
    }

    function markCellError(row, col) {
        const index = row * 9 + col;
        const cell = boardElement.children[index];
        cell.classList.add('error');
    }

    function clearCellError(row, col) {
        const index = row * 9 + col;
        const cell = boardElement.children[index];
        cell.classList.remove('error');
    }

    function resetGame() {
        hideResetConfirmation();
        
        // Reset only user-entered numbers
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                if (!gameState.fixedCells[i][j]) {
                    gameState.board[i][j] = 0;
                }
            }
        }
        
        renderBoard();
        clearMessage();
    }

    function giveHint() {
        // Find all empty cells
        const emptyCells = [];
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                if (gameState.board[i][j] === 0 && !gameState.fixedCells[i][j]) {
                    emptyCells.push([i, j]);
                }
            }
        }
        
        if (emptyCells.length === 0) {
            showMessage('No empty cells left for hints!', 'error');
            return;
        }
        
        // Pick a random empty cell
        const [i, j] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        
        // Fill in the correct number
        gameState.board[i][j] = gameState.solution[i][j];
        
        // Re-render the board
        renderBoard();
        
        // Highlight the hinted cell
        const index = i * 9 + j;
        const cell = boardElement.children[index];
        cell.classList.add('highlight');
        
        // Remove highlight after 2 seconds
        setTimeout(() => {
            cell.classList.remove('highlight');
        }, 2000);
        
        showMessage(`Hint: Cell (${i+1}, ${j+1}) filled correctly.`, 'success');
    }

    function showResetConfirmation() {
        modal.style.display = 'flex';
    }

    function hideResetConfirmation() {
        modal.style.display = 'none';
    }

    function showMessage(text, type) {
        messageElement.textContent = text;
        messageElement.className = 'message ' + type;
    }

    function clearMessage() {
        messageElement.textContent = '';
        messageElement.className = 'message';
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(gameState.seconds / 60);
        const seconds = gameState.seconds % 60;
        timeElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function updateSolvedCount() {
        solvedCountElement.textContent = gameState.solvedCount;
    }

    // Utility functions
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
});