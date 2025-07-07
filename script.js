async function searchWord() {
  const word = document.getElementById("wordInput").value.trim();
  const resultDiv = document.getElementById("result");

  if (!word) {
    resultDiv.innerHTML = "<p>Please enter a word.</p>";
    return;
  }

  resultDiv.innerHTML = "<p>Loading...</p>";

  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    if (!res.ok) throw new Error("Word not found");

    const data = await res.json();
    const definition = data[0].meanings[0].definitions[0].definition;
    const example = data[0].meanings[0].definitions[0].example || "No example.";
    const phonetic = data[0].phonetic || "N/A";

    resultDiv.innerHTML = `
      <h2>${word}</h2>
      <p><strong>Phonetic:</strong> ${phonetic}</p>
      <p><strong>Definition:</strong> ${definition}</p>
      <p><strong>Example:</strong> ${example}</p>
    `;
  } catch (error) {
    resultDiv.innerHTML = "<p>Word not found. Try another.</p>";
  }
}