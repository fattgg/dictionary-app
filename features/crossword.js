

function initCrossword() {
  const findBtn = document.getElementById('findMatches');
  if (findBtn) {
    findBtn.removeEventListener('click', findCrosswordMatches);
    findBtn.addEventListener('click', findCrosswordMatches);
  }
}

// Also run on DOMContentLoaded for direct navigation
document.addEventListener('DOMContentLoaded', initCrossword);
async function findCrosswordMatches() {
  const pattern = document.getElementById('crosswordPattern').value.trim();
  const lengthFilter = document.getElementById('wordLength').value;
  
  if (!pattern.includes('_') && !pattern.includes('?')) {
    alert('Please enter a pattern with underscores (_) or question marks (?) for unknown letters');
    return;
  }

  const resultsContainer = document.getElementById('crosswordResults');
  resultsContainer.innerHTML = '<div class="loading">Searching for matches...</div>';

  try {
    const mockResults = generateMockCrosswordResults(pattern, lengthFilter);
    displayCrosswordResults(mockResults);
  } catch (error) {
    resultsContainer.innerHTML = '<div class="error">Error fetching crossword matches</div>';
    console.error('Crossword helper error:', error);
  }
}

function generateMockCrosswordResults(pattern, lengthFilter) {
  const wordList = [
    'apple', 'angle', 'adobe', 'amber', 'award',
    'brain', 'brave', 'bread', 'brick', 'brown',
    'cable', 'candy', 'chair', 'chest', 'cloud',
  ];

  const regexPattern = new RegExp('^' + pattern.toLowerCase().replace(/_/g, '.') + '$');
  let filtered = wordList.filter(word => regexPattern.test(word));

  if (lengthFilter !== 'any') {
    const [min, max] = lengthFilter === '3-5' ? [3,5] : 
                      lengthFilter === '6-8' ? [6,8] : [9,Infinity];
    filtered = filtered.filter(word => word.length >= min && word.length <= max);
  }

  return filtered.slice(0, 50);
}

function displayCrosswordResults(words) {
  const resultsContainer = document.getElementById('crosswordResults');
  
  if (words.length === 0) {
    resultsContainer.innerHTML = '<div class="no-results">No matching words found</div>';
    return;
  }

  resultsContainer.innerHTML = words.map(word => `
    <div class="crossword-word" onclick="useCrosswordWord('${word}')">
      ${word}
    </div>
  `).join('');
}

window.useCrosswordWord = function(word) {
  document.getElementById('wordInput').value = word;
  searchWord();
  switchTab('definitions');
};