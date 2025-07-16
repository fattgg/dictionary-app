let currentQuiz = null;
let quizWords = [];


  quizWords = [...state.favorites.map(f => f.word), ...state.searchHistory];
  
  if (quizWords.length < 4) {
    quizWords = [...quizWords, ...['apple', 'brave', 'cloud', 'dream', 'earth']];
  }

  generateQuizQuestion();


function initQuiz() {
  const nextBtn = document.getElementById('nextQuestion');
  if (nextBtn) {
    nextBtn.removeEventListener('click', generateQuizQuestion);
    nextBtn.addEventListener('click', generateQuizQuestion);
  }
  initializeQuiz();
}

async function initializeQuiz() {
  quizWords = [...(window.state?.favorites?.map(f => f.word) || []), ...(window.state?.searchHistory || [])];
  if (quizWords.length < 4) {
    quizWords = [...quizWords, ...['apple', 'brave', 'cloud', 'dream', 'earth']];
  }
  generateQuizQuestion();
}

// Also run on DOMContentLoaded for direct navigation
document.addEventListener('DOMContentLoaded', initQuiz);

async function generateQuizQuestion() {
  const quizContainer = document.getElementById('quizContainer');
  const questionElement = document.getElementById('quizQuestion');
  const optionsElement = document.getElementById('quizOptions');
  const feedbackElement = document.getElementById('quizFeedback');
  
  feedbackElement.textContent = '';
  feedbackElement.className = 'quiz-feedback';
  
  if (quizWords.length < 4) {
    questionElement.textContent = "Not enough words for a quiz. Add more favorites!";
    optionsElement.innerHTML = '';
    return;
  }

  const correctWord = quizWords[Math.floor(Math.random() * quizWords.length)];
  
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${correctWord}`);
    if (!response.ok) throw new Error('Word not found');
    
    const data = await response.json();
    const wordData = data[0];
    const correctDefinition = wordData.meanings[0].definitions[0].definition;
    
    const otherWords = quizWords.filter(w => w !== correctWord)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    
    const options = await Promise.all(otherWords.map(async word => {
      try {
        const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        const data = await res.json();
        return data[0].meanings[0].definitions[0].definition;
      } catch {
        return `Definition of ${word}`;
      }
    }));
    
    const allOptions = [correctDefinition, ...options];
    currentQuiz = { correctWord, correctDefinition };
    
    questionElement.textContent = `What does "${correctWord}" mean?`;
    
    optionsElement.innerHTML = shuffleArray(allOptions).map(option => `
      <div class="quiz-option" onclick="checkQuizAnswer('${option.replace(/'/g, "\\'")}', '${correctDefinition.replace(/'/g, "\\'")}')">
        ${option}
      </div>
    `).join('');
    
  } catch (error) {
    questionElement.textContent = "Error loading quiz question";
    console.error('Quiz error:', error);
  }
}

window.checkQuizAnswer = function(selectedOption, correctDefinition) {
  const feedbackElement = document.getElementById('quizFeedback');
  const options = document.querySelectorAll('.quiz-option');
  
  options.forEach(opt => {
    opt.classList.remove('correct', 'incorrect');
    if (opt.textContent === correctDefinition) {
      opt.classList.add('correct');
    }
    if (opt.textContent === selectedOption && selectedOption !== correctDefinition) {
      opt.classList.add('incorrect');
    }
  });
  
  if (selectedOption === correctDefinition) {
    feedbackElement.textContent = "Correct! 🎉";
    feedbackElement.className = 'quiz-feedback correct';
  } else {
    feedbackElement.textContent = `Incorrect. The correct answer is: ${correctDefinition}`;
    feedbackElement.className = 'quiz-feedback incorrect';
  }
  feedbackElement.classList.add('show');
};

function shuffleArray(array) {
  return [...array].sort(() => 0.5 - Math.random());
}
