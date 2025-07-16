const elements = {
  wordInput: document.getElementById('wordInput'),
  resultsDiv: document.getElementById('results'),
  wordTitle: document.getElementById('wordTitle'),
  phonetic: document.getElementById('phonetic'),
  speakBtn: document.getElementById('speakBtn'),
  favoriteBtn: document.getElementById('favoriteBtn'),
  suggestionsDiv: document.getElementById('suggestions'),
  historyList: document.getElementById('historyList'),
  clearHistoryBtn: document.getElementById('clearHistory'),
  historySection: document.getElementById('historySection'),
  wordOfTheDay: document.getElementById('wordOfTheDay'),
  favoritesList: document.getElementById('favoritesList'),
  themeToggle: document.getElementById('themeToggle'),
  readabilityToggle: document.getElementById('readabilityToggle'),
  advancedSearchToggle: document.getElementById('advancedSearchToggle'),
  advancedSearch: document.getElementById('advancedSearch'),
  posFilter: document.getElementById('posFilter'),
  lengthFilter: document.getElementById('lengthFilter'),
  randomBtn: document.getElementById('randomBtn'),
  trendsContainer: document.getElementById('trendsContainer')
};

const COMMON_WORDS = [
  'hello', 'world', 'apple', 'banana', 'computer', 'sun', 'moon', 
  'water', 'fire', 'earth', 'love', 'happy', 'sad', 'run', 'walk',
  'book', 'read', 'write', 'school', 'teacher', 'dog', 'cat', 
  'house', 'tree', 'car', 'friend', 'family', 'music', 'art'
];

const state = {
  currentWord: '',
  searchHistory: JSON.parse(localStorage.getItem('dictionaryHistory')) || [],
  favorites: JSON.parse(localStorage.getItem('dictionaryFavorites')) || [],
  currentTheme: localStorage.getItem('theme') || 'light',
  readabilityMode: localStorage.getItem('readability') === 'true',
  touchStartX: null,
  currentQuiz: null,
  flashcardWords: [],
  wordCache: JSON.parse(localStorage.getItem('wordCache')) || {},
  retryCount: 0
};

// Utility Functions
function debounce(func, timeout = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => { func.apply(this, args); }, timeout);
  };
}

function isValidWord(word) {
  return word && /^[a-zA-Z-]+$/.test(word) && word.length <= 20;
}

// Display Functions
function showLoading() {
  elements.resultsDiv.innerHTML = `
    <div class="loading">
      <i class="fas fa-spinner fa-spin fa-2x"></i>
      <p>Searching for "${elements.wordInput.value.trim()}"...</p>
    </div>
  `;
}

function showError(message) {
  elements.resultsDiv.innerHTML = `
    <div class="error-message">
      <i class="fas fa-exclamation-triangle"></i>
      <p>${message}</p>
      <button onclick="searchWord()" class="retry-btn">Retry</button>
    </div>
  `;
}

function hideSuggestions() {
  elements.suggestionsDiv.style.display = 'none';
}

// Dictionary Functions
async function fetchWordData(word) {
  // Check cache first
  if (state.wordCache[word.toLowerCase()]) {
    return state.wordCache[word.toLowerCase()];
  }

  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    
    if (response.status === 404) {
      throw new Error('Word not found');
    }
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data || !data[0] || !data[0].word) {
      throw new Error('Invalid word data received');
    }
    
    // Cache the successful response
    state.wordCache[word.toLowerCase()] = data[0];
    localStorage.setItem('wordCache', JSON.stringify(state.wordCache));
    
    return data[0];
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

async function searchWord() {
  const word = elements.wordInput.value.trim();
  
  if (!isValidWord(word)) {
    showError('Please enter a valid English word (letters/hyphens only, max 20 chars)');
    return;
  }

  state.currentWord = word;
  
  try {
    showLoading();
    const wordData = await fetchWordData(word);
    processWordData(wordData);
    addToHistory(word);
    hideSuggestions();
    updateFavoriteButton(word);
    state.retryCount = 0;
  } catch (error) {
    if (state.retryCount < 2) {
      state.retryCount++;
      await new Promise(resolve => setTimeout(resolve, 1000));
      return searchWord();
    }
    state.retryCount = 0;
    showError(error.message.includes('not found') 
      ? 'Word not found. Please try another word.'
      : 'Dictionary service unavailable. Please try again later.');
  }
}

function processWordData(wordData) {
  elements.wordTitle.textContent = wordData.word;
  elements.phonetic.textContent = wordData.phonetic || wordData.phonetics.find(p => p.text)?.text || '';
  
  let html = '';
  const filteredMeanings = filterMeanings(wordData.meanings);
  
  filteredMeanings.forEach(meaning => {
    html += `
      <div class="meaning">
        <h3><i class="fas fa-${getPartOfSpeechIcon(meaning.partOfSpeech)}"></i> ${meaning.partOfSpeech}</h3>
    `;
    
    meaning.definitions.forEach((def, index) => {
      html += `
        <div class="definition">
          <p><strong>${index + 1}.</strong> ${simplifyDefinition(def.definition)}</p>
          ${def.example ? `<div class="example">${def.example}</div>` : ''}
        </div>
      `;
    });
    
    if (meaning.synonyms.length > 0) {
      html += `<div class="synonyms-container"><strong>Synonyms:</strong> <div class="synonyms">`;
      html += meaning.synonyms.slice(0, 5).map(syn => `<span class="synonym">${syn}</span>`).join('');
      html += `</div></div>`;
    }
    
    html += `</div>`;
  });
  
  const audio = wordData.phonetics.find(p => p.audio)?.audio;
  if (audio) {
    elements.speakBtn.dataset.audio = audio;
    elements.speakBtn.style.display = 'flex';
  } else {
    elements.speakBtn.style.display = 'none';
  }
  
  document.getElementById('definitions-tab').innerHTML = html;
  switchTab('definitions');
}

// Word Suggestions
async function handleInput() {
  const query = elements.wordInput.value.trim();
  if (query.length > 1) {
    fetchSuggestions(query);
  } else {
    hideSuggestions();
  }
}

async function fetchSuggestions(query) {
  try {
    // First check common words
    const commonMatches = COMMON_WORDS.filter(w => 
      w.toLowerCase().startsWith(query.toLowerCase())
    ).slice(0, 5);
    
    if (commonMatches.length > 0) {
      showSuggestions(commonMatches);
      return;
    }
    
    // Then try API
    const response = await fetch(`https://api.datamuse.com/words?sp=${query}*&max=5`);
    if (!response.ok) throw new Error('No suggestions');
    const data = await response.json();
    showSuggestions(data.map(item => item.word));
  } catch (error) {
    hideSuggestions();
  }
}

function showSuggestions(suggestions) {
  if (!suggestions || !suggestions.length) {
    hideSuggestions();
    return;
  }
  elements.suggestionsDiv.innerHTML = suggestions.map(word => `
    <div class="suggestion-item" onclick="searchFromHistory('${word}')">${word}</div>
  `).join('');
  elements.suggestionsDiv.style.display = 'block';
}

// Random Word
async function getRandomWord() {
  try {
    // 80% chance of using common words
    if (Math.random() > 0.2) {
      const randomWord = COMMON_WORDS[Math.floor(Math.random() * COMMON_WORDS.length)];
      elements.wordInput.value = randomWord;
      searchWord();
      return;
    }
    
    // Fallback to API
    const response = await fetch('https://random-word-api.herokuapp.com/word?number=1');
    if (!response.ok) throw new Error('Failed to get random word');
    const [randomWord] = await response.json();
    elements.wordInput.value = randomWord;
    searchWord();
  } catch (error) {
    // Final fallback
    const randomWord = COMMON_WORDS[Math.floor(Math.random() * COMMON_WORDS.length)];
    elements.wordInput.value = randomWord;
    searchWord();
  }
}

// History and Favorites
function addToHistory(word) {
  const lowerWord = word.toLowerCase();
  if (!state.searchHistory.includes(lowerWord)) {
    state.searchHistory.unshift(lowerWord);
    if (state.searchHistory.length > 10) state.searchHistory.pop();
    localStorage.setItem('dictionaryHistory', JSON.stringify(state.searchHistory));
    displayHistory();
  }
}

function displayHistory() {
  if (!elements.historySection || !elements.historyList) return;
  if (state.searchHistory.length === 0) {
    elements.historySection.style.display = 'none';
    return;
  }
  elements.historySection.style.display = 'block';
  elements.historyList.innerHTML = state.searchHistory.map(word => `
    <div class="history-item" onclick="searchFromHistory('${word}')">${word}</div>
  `).join('');
}

function toggleFavorite() {
  if (!state.currentWord) return;
  
  const index = state.favorites.findIndex(fav => 
    fav.word.toLowerCase() === state.currentWord.toLowerCase()
  );
  
  if (index === -1) {
    state.favorites.unshift({ 
      word: state.currentWord, 
      date: new Date().toISOString() 
    });
    elements.favoriteBtn.innerHTML = '<i class="fas fa-star"></i>';
  } else {
    state.favorites.splice(index, 1);
    elements.favoriteBtn.innerHTML = '<i class="far fa-star"></i>';
  }
  
  localStorage.setItem('dictionaryFavorites', JSON.stringify(state.favorites));
  displayFavorites();
}

function displayFavorites() {
  elements.favoritesList.innerHTML = state.favorites.map(fav => `
    <div class="favorite-item" onclick="searchFromHistory('${fav.word}')">
      ${fav.word}
      <button class="remove-favorite" onclick="event.stopPropagation(); removeFavorite('${fav.word}')">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `).join('');
}

// Tab and UI Functions
function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  document.getElementById(`${tabName}-tab`).classList.add('active');
  document.querySelector(`.tab-btn[data-tab="${tabName}"]`).classList.add('active');
}

function toggleAdvancedSearch() {
  const advancedSearch = document.getElementById('advancedSearch');
  advancedSearch.style.display = advancedSearch.style.display === 'grid' ? 'none' : 'grid';
}

function setupAdvancedFeatures() {
  // Helper to robustly call feature init
  function safeInit(fnName) {
    if (typeof window[fnName] === 'function') {
      try {
        window[fnName]();
      } catch (e) {
        console.error(`Error running ${fnName}:`, e);
      }
    } else {
      console.warn(`Feature init function '${fnName}' not found.`);
    }
  }

  // Crossword tab
  const crosswordBtn = document.querySelector('.tab-btn[data-tab="crossword"]');
  if (crosswordBtn) {
    crosswordBtn.addEventListener('click', () => {
      switchTab('crossword');
      // Clear previous pattern/results
      const patternInput = document.getElementById('crosswordPattern');
      const resultsDiv = document.getElementById('crosswordResults');
      if (patternInput) patternInput.value = '';
      if (resultsDiv) resultsDiv.innerHTML = '';
      safeInit('initCrossword');
    });
  }

  // Quiz tab
  const quizBtn = document.querySelector('.tab-btn[data-tab="quiz"]');
  if (quizBtn) {
    quizBtn.addEventListener('click', () => {
      switchTab('quiz');
      safeInit('initQuiz');
    });
  }

  // Flashcards tab
  const flashcardsBtn = document.querySelector('.tab-btn[data-tab="flashcards"]');
  if (flashcardsBtn) {
    flashcardsBtn.addEventListener('click', () => {
      switchTab('flashcards');
      safeInit('initFlashcards');
    });
  }

  // Favorites tab
  const favoritesBtn = document.querySelector('.tab-btn[data-tab="favorites"]');
  if (favoritesBtn) {
    favoritesBtn.addEventListener('click', () => {
      switchTab('favorites');
      displayFavorites();
    });
  }

  // On DOMContentLoaded, try to initialize all features once in case their tabs are already visible
  document.addEventListener('DOMContentLoaded', () => {
    safeInit('initCrossword');
    safeInit('initQuiz');
    safeInit('initFlashcards');
  });
}

// Helper Functions
// Readability Toggle
function toggleReadability() {
  state.readabilityMode = !state.readabilityMode;
  localStorage.setItem('readability', state.readabilityMode);
  document.documentElement.setAttribute('data-readability', state.readabilityMode);
}
function getPartOfSpeechIcon(pos) {
  const icons = {
    noun: 'book', verb: 'running', adjective: 'font', adverb: 'comment-alt',
    pronoun: 'user', preposition: 'map-marker-alt', conjunction: 'link', interjection: 'exclamation'
  };
  return icons[pos.toLowerCase()] || 'book';
}

function speakWord() {
  const audioSrc = elements.speakBtn.dataset.audio;
  if (audioSrc) new Audio(audioSrc).play().catch(e => console.error('Audio error:', e));
}

function simplifyDefinition(definition) {
  if (!state.readabilityMode) return definition;
  return definition
    .replace(/\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\b\w+ly\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function filterMeanings(meanings) {
  const posFilter = elements.posFilter.value;
  const lengthFilter = elements.lengthFilter.value;
  
  return meanings.filter(meaning => {
    if (posFilter && meaning.partOfSpeech !== posFilter) return false;
    if (lengthFilter) {
      const wordLength = state.currentWord.length;
      if (lengthFilter === 'short' && wordLength > 4) return false;
      if (lengthFilter === 'medium' && (wordLength < 5 || wordLength > 8)) return false;
      if (lengthFilter === 'long' && wordLength < 9) return false;
    }
    return true;
  });
}

// Word of the Day
async function getWordOfTheDay() {
  try {
    const today = new Date().toDateString();
    const cachedWord = localStorage.getItem('wordOfTheDay');
    
    if (cachedWord) {
      const { word, date } = JSON.parse(cachedWord);
      if (date === today) {
        displayWordOfTheDay(word);
        return;
      }
    }
    
    const word = COMMON_WORDS[Math.floor(Math.random() * COMMON_WORDS.length)];
    localStorage.setItem('wordOfTheDay', JSON.stringify({ word, date: today }));
    displayWordOfTheDay(word);
  } catch (error) {
    console.error('Failed to get word of the day:', error);
  }
}

function displayWordOfTheDay(word) {
  elements.wordOfTheDay.innerHTML = `
    <h3>Word of the Day</h3>
    <p><strong>${word}</strong> - <span class="word-link" onclick="searchFromHistory('${word}')">Look up</span></p>
  `;
}

// Window Functions
window.searchFromHistory = function(word) {
  elements.wordInput.value = word;
  searchWord();
};

window.removeFavorite = function(word) {
  state.favorites = state.favorites.filter(fav => fav.word !== word);
  localStorage.setItem('dictionaryFavorites', JSON.stringify(state.favorites));
  displayFavorites();
  updateFavoriteButton(state.currentWord);
};

function updateFavoriteButton(word) {
  if (!word) return;
  const isFavorite = state.favorites.some(fav => 
    fav.word.toLowerCase() === word.toLowerCase()
  );
  elements.favoriteBtn.innerHTML = isFavorite 
    ? '<i class="fas fa-star"></i>' 
    : '<i class="far fa-star"></i>';
}

// Initialize
function init() {
  applyTheme(state.currentTheme);
  setupEventListeners();
  displayHistory();
  displayFavorites();
  getWordOfTheDay();
  setupAdvancedFeatures();
}

function setupEventListeners() {
  elements.wordInput.addEventListener('keypress', (e) => e.key === 'Enter' && searchWord());
  elements.wordInput.addEventListener('input', debounce(handleInput, 300));
  
  elements.speakBtn.addEventListener('click', speakWord);
  elements.favoriteBtn.addEventListener('click', toggleFavorite);
  elements.clearHistoryBtn?.addEventListener('click', clearHistory);
  elements.readabilityToggle.addEventListener('click', toggleReadability);
  elements.advancedSearchToggle.addEventListener('click', toggleAdvancedSearch);
  elements.randomBtn.addEventListener('click', getRandomWord);
  
  document.querySelectorAll('.theme-options button').forEach(btn => {
    btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
  });
  
  // Remove default tab switching here, handled in setupAdvancedFeatures for correct feature initialization
  // document.querySelectorAll('.tab-btn').forEach(btn => {
  //   btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  // });
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  state.currentTheme = theme;
  localStorage.setItem('theme', theme);
}

init();