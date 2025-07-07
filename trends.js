function loadTrendData(word) {
  const trendsContainer = document.getElementById('trendsContainer');
  trendsContainer.innerHTML = '<div class="loader"></div>';
  
  setTimeout(() => {
    const mockData = generateMockTrendData(word);
    displayTrendData(mockData);
  }, 1500);
}

function generateMockTrendData(word) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonth = new Date().getMonth();
  
  return {
    word: word,
    interestOverTime: months.map((month, index) => ({
      month,
      value: Math.floor(Math.random() * 100) + (index === currentMonth ? 30 : 0)
    })),
    relatedQueries: [
      {query: `what is ${word}`, value: Math.floor(Math.random() * 100)},
      {query: `${word} meaning`, value: Math.floor(Math.random() * 100)},
      {query: `how to use ${word}`, value: Math.floor(Math.random() * 100)},
      {query: `${word} synonym`, value: Math.floor(Math.random() * 100)}
    ],
    popularity: Math.floor(Math.random() * 100)
  };
}

function displayTrendData(data) {
  const trendsContainer = document.getElementById('trendsContainer');
  
  const trendBadge = document.getElementById('trendBadge');
  if (data.popularity > 70) {
    trendBadge.innerHTML = `<i class="fas fa-fire"></i> Trending`;
    trendBadge.style.backgroundColor = 'var(--error-color)';
  } else if (data.popularity > 30) {
    trendBadge.innerHTML = `<i class="fas fa-chart-line"></i> Popular`;
    trendBadge.style.backgroundColor = 'var(--accent-color)';
  } else {
    trendBadge.innerHTML = `<i class="fas fa-chart-line"></i> Average`;
    trendBadge.style.backgroundColor = 'var(--dark-gray)';
  }
  
  // Display trends data
  trendsContainer.innerHTML = `
    <div class="trend-chart">
      <h3>Interest Over Time</h3>
      <div class="chart">
        ${data.interestOverTime.map(d => `
          <div class="chart-bar-container">
            <div class="chart-bar" style="height: ${(d.value / 100) * 100}%"></div>
            <div class="chart-label">${d.month}</div>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="related-queries">
      <h3>Related Queries</h3>
      <ul>
        ${data.relatedQueries.map(q => `
          <li>
            <span class="query">${q.query}</span>
            <span class="score" style="width: ${q.value}%"></span>
          </li>
        `).join('')}
      </ul>
    </div>
  `;
}