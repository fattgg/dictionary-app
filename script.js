const wordInput = document.getElementById('wordInput');
const resultsDiv = document.getElementById('results');
const wordTitle = document.getElementById('wordTitle');
const phonetic = document.getElementById('phonetic');
const speakBtn = document.getElementById('speakBtn');
const favoriteBtn = document.getElementById('favoriteBtn');
const themeToggle = document.getElementById('themeToggle');
const suggestionsDiv = document.getElementById('suggestions');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistory');
const historySection = document.getElementById('historySection');
const wordOfTheDay = document.getElementById('wordOfTheDay');
const favoritesList = document.getElementById('favoritesList');
const crosswordResults = document.getElementById('crosswordResults');

let currentWord = '';
let searchHistory = JSON.parse(localStorage.getItem('dictionaryHistory')) || [];
let favorites = JSON.parse(localStorage.getItem('dictionaryFavorites')) || [];
let darkMode = JSON.parse(localStorage.getItem('darkMode')) || false;

function init() {
  checkDarkModePreference();
  setupEventListeners();
  displayHistory();
  displayFavorites();
  getWordOfTheDay();
}

function setupEventListeners() {
  wordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchWord();
    }
  });
  
  wordInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (wordInput.value.trim().length > 1) {
        fetchSuggestions(wordInput.value.trim());
      } else {
        hideSuggestions();
      }
    }, 300);
  });
  
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#suggestions') && e.target !== wordInput) {
      hideSuggestions();
    }
  });
  
  speakBtn.addEventListener('click', speakWord);
  favoriteBtn.addEventListener('click', toggleFavorite);
  themeToggle.addEventListener('click', toggleDarkMode);
  clearHistoryBtn.addEventListener('click', clearHistory);
  
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

function toggleDarkMode() {
  darkMode = !darkMode;
  document.body.classList.toggle('dark-mode', darkMode);
  localStorage.setItem('darkMode', JSON.stringify(darkMode));
  themeToggle.innerHTML = darkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

function checkDarkModePreference() {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (prefersDark && !localStorage.getItem('darkMode')) {
    darkMode = true;
  }
  document.body.classList.toggle('dark-mode', darkMode);
  themeToggle.innerHTML = darkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

async function searchWord() {
  const word = wordInput.value.trim();
  currentWord = word;
  
  if (!word) {
    showError('Please enter a word.');
    return;
  }
  
  try {
    showLoading();
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    
    if (!response.ok) {
      throw new Error('Word not found');
    }
    
    const data = await response.json();
    displayResults(data);
    addToHistory(word);
    hideSuggestions();
    updateFavoriteButton(word);
  } catch (error) {
    showError('Word not found. Please try another word.');
    console.error('Error:', error);
  }
}

function displayResults(data) {
  const wordData = data[0];
  
  wordTitle.textContent = wordData.word;
  phonetic.textContent = wordData.phonetic || wordData.phonetics.find(p => p.text)?.text || 'N/A';
  
  let html = '';
  
  wordData.meanings.forEach(meaning => {
    html += `
      <div class="meaning">
        <h3><i class="fas fa-${getPartOfSpeechIcon(meaning.partOfSpeech)}"></i> ${meaning.partOfSpeech}</h3>
    `;
    
    meaning.definitions.forEach((def, index) => {
      html += `
        <div class="definition">
          <p><strong>${index + 1}.</strong> ${def.definition}</p>
          ${def.example ? `<div class="example">${def.example}</div>` : ''}
        </div>
      `;
    });
    
    if (meaning.synonyms.length > 0) {
      html += `<div class="synonyms-container"><strong>Synonyms:</strong> <div class="synonyms">`;
      html += meaning.synonyms.slice(0, 5).map(syn => `<span class="synonym">${syn}</span>`).join('');
      html += `</div></div>`;
    }
    
    if (meaning.antonyms.length > 0) {
      html += `<div class="antonyms-container"><strong>Antonyms:</strong> <div class="antonyms">`;
      html += meaning.antonyms.slice(0, 5).map(ant => `<span class="antonym">${ant}</span>`).join('');
      html += `</div></div>`;
    }
    
    html += `</div>`;
  });
  
  const audio = wordData.phonetics.find(p => p.audio)?.audio;
  if (audio) {
    speakBtn.dataset.audio = audio;
    speakBtn.style.display = 'flex';
  } else {
    speakBtn.style.display = 'none';
  }
  
  resultsDiv.innerHTML = html;
  switchTab('definitions');
}

function getPartOfSpeechIcon(pos) {
  const icons = {
    noun: 'book',
    verb: 'running',
    adjective: 'font',
    adverb: 'comment-alt',
    pronoun: 'user',
    preposition: 'map-marker-alt',
    conjunction: 'link',
    interjection: 'exclamation'
  };
  
  return icons[pos.toLowerCase()] || 'book';
}

function speakWord() {
  const audioSrc = speakBtn.dataset.audio;
  if (audioSrc) {
    const audio = new Audio(audioSrc);
    audio.play().catch(e => console.error('Error playing audio:', e));
  }
}

let debounceTimer;

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
  if (suggestions.length === 0) {
    hideSuggestions();
    return;
  }
  
  suggestionsDiv.innerHTML = suggestions.map(word => `
    <div class="suggestion-item" onclick="selectSuggestion('${word}')">${word}</div>
  `).join('');
  
  suggestionsDiv.style.display = 'block';
}

function hideSuggestions() {
  suggestionsDiv.style.display = 'none';
}

function selectSuggestion(word) {
  wordInput.value = word;
  searchWord();
}

function addToHistory(word) {
  if (!searchHistory.includes(word.toLowerCase())) {
    searchHistory.unshift(word.toLowerCase());
    if (searchHistory.length > 10) {
      searchHistory.pop();
    }
    localStorage.setItem('dictionaryHistory', JSON.stringify(searchHistory));
    displayHistory();
  }
}

function displayHistory() {
  if (searchHistory.length === 0) {
    historySection.style.display = 'none';
    return;
  }
  
  historySection.style.display = 'block';
  historyList.innerHTML = searchHistory.map(word => `
    <div class="history-item" onclick="searchFromHistory('${word}')">${word}</div>
  `).join('');
}

function searchFromHistory(word) {
  wordInput.value = word;
  searchWord();
}

function clearHistory() {
  searchHistory = [];
  localStorage.removeItem('dictionaryHistory');
  displayHistory();
}

function toggleFavorite() {
  if (!currentWord) return;
  
  const index = favorites.findIndex(fav => fav.word.toLowerCase() === currentWord.toLowerCase());
  
  if (index === -1) {
    favorites.unshift({
      word: currentWord,
      date: new Date().toISOString()
    });
    favoriteBtn.innerHTML = '<i class="fas fa-star"></i>';
  } else {
    favorites.splice(index, 1);
    favoriteBtn.innerHTML = '<i class="far fa-star"></i>';
  }
  
  localStorage.setItem('dictionaryFavorites', JSON.stringify(favorites));
  displayFavorites();
}

function displayFavorites() {
  favoritesList.innerHTML = favorites.map(fav => `
    <div class="favorite-item" onclick="searchFromHistory('${fav.word}')">
      ${fav.word}
      <button class="remove-favorite" onclick="removeFavorite(event, '${fav.word}')">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `).join('');
}

function removeFavorite(event, word) {
  event.stopPropagation();
  favorites = favorites.filter(fav => fav.word !== word);
  localStorage.setItem('dictionaryFavorites', JSON.stringify(favorites));
  displayFavorites();
  updateFavoriteButton(currentWord);
}

function updateFavoriteButton(word) {
  if (!word) return;
  const isFavorite = favorites.some(fav => fav.word.toLowerCase() === word.toLowerCase());
  favoriteBtn.innerHTML = isFavorite ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>';
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
  wordOfTheDay.innerHTML = `
    <h3>Word of the Day</h3>
    <p><strong>${word}</strong> - <a href="#" onclick="event.preventDefault(); searchFromHistory('${word}')">Look up</a></p>
  `;
}

async function searchCrossword() {
  const pattern = document.getElementById('crosswordPattern').value.trim().toLowerCase();
  
  if (!pattern || !pattern.includes('_')) {
    crosswordResults.innerHTML = '<p>Enter a pattern with underscores (e.g., "a__le")</p>';
    return;
  }
  
  try {
    const response = await fetch(`https://api.datamuse.com/words?sp=${pattern}&max=20`);
    const words = await response.json();
    
    if (words.length === 0) {
      crosswordResults.innerHTML = '<p>No matches found</p>';
      return;
    }
    
    crosswordResults.innerHTML = words
      .map(word => `<div class="crossword-word" onclick="searchFromHistory('${word.word}')">${word.word}</div>`)
      .join('');
  } catch (error) {
    crosswordResults.innerHTML = '<p>Error fetching crossword matches</p>';
  }
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-btn, .tab-content').forEach(el => {
    el.classList.remove('active');
  });
  
  document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add('active');
  document.getElementById(`${tabId}-tab`).classList.add('active');
}

async function getRandomWord() {
  try {
    const response = await fetch('https://random-word-api.herokuapp.com/word');
    if (!response.ok) throw new Error('Failed to get random word');
    
    const [randomWord] = await response.json();
    wordInput.value = randomWord;
    searchWord();
  } catch (error) {
    showError('Failed to get random word. Please try again.');
  }
}

function showLoading() {
  resultsDiv.innerHTML = `
    <div class="loading">
      <i class="fas fa-spinner fa-spin fa-2x"></i>
      <p>Searching for "${wordInput.value.trim()}"...</p>
    </div>
  `;
}

function showError(message) {
  resultsDiv.innerHTML = `
    <div class="error-message">
      <i class="fas fa-exclamation-triangle"></i>
      <p>${message}</p>
    </div>
  `;
}

init();