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

const state = {
  currentWord: '',
  searchHistory: JSON.parse(localStorage.getItem('dictionaryHistory')) || [],
  favorites: JSON.parse(localStorage.getItem('dictionaryFavorites')) || [],
  currentTheme: localStorage.getItem('theme') || 'light',
  readabilityMode: localStorage.getItem('readability') === 'true',
  touchStartX: null
};

function debounce(func, timeout = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => { func.apply(this, args); }, timeout);
  };
}

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
    </div>
  `;
}

function hideSuggestions() {
  elements.suggestionsDiv.style.display = 'none';
}

function handleInput() {
  const query = elements.wordInput.value.trim();
  if (query.length > 1) {
    fetchSuggestions(query);
  } else {
    hideSuggestions();
  }
}

async function fetchSuggestions(query) {
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${query}`);
    if (!response.ok) throw new Error('No suggestions');
    const data = await response.json();
    showSuggestions([data[0].word]);
  } catch (error) {
    hideSuggestions();
  }
}

function showSuggestions(suggestions) {
  if (!suggestions.length) {
    hideSuggestions();
    return;
  }
  elements.suggestionsDiv.innerHTML = suggestions.map(word => `
    <div class="suggestion-item" onclick="searchFromHistory('${word}')">${word}</div>
  `).join('');
  elements.suggestionsDiv.style.display = 'block';
}

function init() {
  applyTheme(state.currentTheme);
  setupEventListeners();
  loadPreferences();
  displayHistory();
  displayFavorites();
  getWordOfTheDay();
  setupTouchGestures();
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
  
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

async function searchWord() {
  const word = elements.wordInput.value.trim();
  if (!word) {
    showError('Please enter a word.');
    return;
  }

  state.currentWord = word;
  
  try {
    showLoading();
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    if (!response.ok) throw new Error('Word not found');
    
    const data = await response.json();
    processWordData(data[0]);
    addToHistory(word);
    hideSuggestions();
    updateFavoriteButton(word);
    loadTrendData(word);
  } catch (error) {
    showError('Word not found. Please try another word.');
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

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  state.currentTheme = theme;
  localStorage.setItem('theme', theme);
}

function toggleReadability() {
  state.readabilityMode = !state.readabilityMode;
  document.documentElement.setAttribute('data-readability', state.readabilityMode);
  localStorage.setItem('readability', state.readabilityMode);
  elements.readabilityToggle.innerHTML = state.readabilityMode 
    ? '<i class="fas fa-text-height"></i>'
    : '<i class="fas fa-text-width"></i>';
  
  if (state.currentWord) searchWord();
}

function toggleAdvancedSearch() {
  elements.advancedSearch.style.display = 
    elements.advancedSearch.style.display === 'block' ? 'none' : 'block';
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-btn, .tab-content').forEach(el => {
    el.classList.remove('active');
  });
  document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add('active');
  document.getElementById(`${tabId}-tab`).classList.add('active');
}

function addToHistory(word) {
  if (!state.searchHistory.includes(word.toLowerCase())) {
    state.searchHistory.unshift(word.toLowerCase());
    if (state.searchHistory.length > 10) state.searchHistory.pop();
    localStorage.setItem('dictionaryHistory', JSON.stringify(state.searchHistory));
    displayHistory();
  }
}

function displayHistory() {
  if (state.searchHistory.length === 0) {
    elements.historySection.style.display = 'none';
    return;
  }
  elements.historySection.style.display = 'block';
  elements.historyList.innerHTML = state.searchHistory.map(word => `
    <div class="history-item" onclick="searchFromHistory('${word}')">${word}</div>
  `).join('');
}

function clearHistory() {
  state.searchHistory = [];
  localStorage.removeItem('dictionaryHistory');
  displayHistory();
}

function toggleFavorite() {
  if (!state.currentWord) return;
  
  const index = state.favorites.findIndex(fav => fav.word.toLowerCase() === state.currentWord.toLowerCase());
  
  if (index === -1) {
    state.favorites.unshift({ word: state.currentWord, date: new Date().toISOString() });
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

function loadPreferences() {
  if (state.readabilityMode) {
    document.documentElement.setAttribute('data-readability', 'true');
    elements.readabilityToggle.innerHTML = '<i class="fas fa-text-height"></i>';
  }
}

function setupTouchGestures() {
  document.addEventListener('touchstart', (e) => {
    state.touchStartX = e.touches[0].clientX;
  });
  
  document.addEventListener('touchend', (e) => {
    if (!state.touchStartX) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = state.touchStartX - touchEndX;
    
    if (Math.abs(diff) > 50) {
      const tabs = Array.from(document.querySelectorAll('.tab-btn'));
      const currentTab = document.querySelector('.tab-btn.active');
      const currentIndex = tabs.indexOf(currentTab);
      
      if (diff > 0 && currentIndex < tabs.length - 1) {
        switchTab(tabs[currentIndex + 1].dataset.tab);
      } else if (diff < 0 && currentIndex > 0) {
        switchTab(tabs[currentIndex - 1].dataset.tab);
      }
    }
  });
}

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
    
    const response = await fetch('https://random-word-api.herokuapp.com/word?number=1');
    const [word] = await response.json();
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

async function getRandomWord() {
  try {
    const response = await fetch('https://random-word-api.herokuapp.com/word');
    if (!response.ok) throw new Error('Failed to get random word');
    const [randomWord] = await response.json();
    elements.wordInput.value = randomWord;
    searchWord();
  } catch (error) {
    showError('Failed to get random word. Please try again.');
  }
}

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
  const isFavorite = state.favorites.some(fav => fav.word.toLowerCase() === word.toLowerCase());
  elements.favoriteBtn.innerHTML = isFavorite ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>';
}

init();