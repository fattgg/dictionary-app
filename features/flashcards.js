let flashcardWords = [];
let currentCardIndex = 0;
let isFlipped = false;


  flashcardWords = [...state.favorites];
  
  if (flashcardWords.length === 0) {
    flashcardWords = [
      { word: "example", definition: "a representative form or pattern" },
      { word: "dictionary", definition: "a reference book containing words and their meanings" }
    ];
  }
  
  currentCardIndex = 0;
  isFlipped = false;
  displayCurrentCard();


function initFlashcards() {
  const flipBtn = document.getElementById('flipCard');
  const nextBtn = document.getElementById('nextCard');
  const prevBtn = document.getElementById('prevCard');
  const shuffleBtn = document.getElementById('shuffleCards');
  if (flipBtn) {
    flipBtn.removeEventListener('click', flipCard);
    flipBtn.addEventListener('click', flipCard);
  }
  if (nextBtn) {
    nextBtn.removeEventListener('click', showNextCard);
    nextBtn.addEventListener('click', showNextCard);
  }
  if (prevBtn) {
    prevBtn.removeEventListener('click', showPrevCard);
    prevBtn.addEventListener('click', showPrevCard);
  }
  if (shuffleBtn) {
    shuffleBtn.removeEventListener('click', shuffleFlashcards);
    shuffleBtn.addEventListener('click', shuffleFlashcards);
  }
  initializeFlashcards();
}

function initializeFlashcards() {
  flashcardWords = [...(window.state?.favorites || [])];
  if (flashcardWords.length === 0) {
    flashcardWords = [
      { word: "example", definition: "a representative form or pattern" },
      { word: "dictionary", definition: "a reference book containing words and their meanings" }
    ];
  }
  currentCardIndex = 0;
  isFlipped = false;
  displayCurrentCard();
}

// Also run on DOMContentLoaded for direct navigation
document.addEventListener('DOMContentLoaded', initFlashcards);

function displayCurrentCard() {
  if (flashcardWords.length === 0) {
    document.getElementById('flashcardFront').textContent = "No flashcards available";
    document.getElementById('flashcardBack').textContent = "Add words to favorites to create flashcards";
    return;
  }
  
  const currentWord = flashcardWords[currentCardIndex];
  document.getElementById('flashcardFront').textContent = currentWord.word;
  document.getElementById('flashcardBack').textContent = 
    typeof currentWord === 'string' ? "Definition would appear here" : currentWord.definition;
  
  if (isFlipped) {
    document.getElementById('flashcard').classList.add('flipped');
  } else {
    document.getElementById('flashcard').classList.remove('flipped');
  }
}

function flipCard() {
  isFlipped = !isFlipped;
  document.getElementById('flashcard').classList.toggle('flipped');
}

function showNextCard() {
  if (flashcardWords.length === 0) return;
  
  currentCardIndex = (currentCardIndex + 1) % flashcardWords.length;
  isFlipped = false;
  displayCurrentCard();
}

function showPrevCard() {
  if (flashcardWords.length === 0) return;
  
  currentCardIndex = (currentCardIndex - 1 + flashcardWords.length) % flashcardWords.length;
  isFlipped = false;
  displayCurrentCard();
}

function shuffleFlashcards() {
  flashcardWords = [...flashcardWords].sort(() => 0.5 - Math.random());
  currentCardIndex = 0;
  isFlipped = false;
  displayCurrentCard();
}
