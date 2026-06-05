const voiceSelect = document.querySelector('#voiceSelect');
const playButton = document.querySelector('#playButton');
const textInput = document.querySelector('textarea');
const languageSelect = document.querySelector('#languageSelect');
const mascot = document.querySelector('#mascot');
const waves = document.querySelector('#waves');
const resultPanel = document.querySelector('#resultPanel');
const resultText = document.querySelector('#resultText');
const micButton = document.querySelector('#micButton');
const charCount = document.querySelector('#charCount');
const copyButton = document.querySelector('#copyButton');
const chips = document.querySelectorAll('.chip');

// Array of supported languages with their ISO codes
const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'ko', name: 'Korean' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'nl', name: 'Dutch' },
  { code: 'zh-HK', name: 'Cantonese (Hong Kong)' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)' },
];

// Populate language select box
languages.forEach(({ code, name }) => {
  const option = document.createElement('option');
  option.value = code;
  option.textContent = name;
  // Set the default selected option to Chinese (Simplified)
  if (code === 'zh-HK') {
    option.selected = true;
  }  
  languageSelect.appendChild(option);
});

// Load available voices
let voices = [];
function loadVoices() {
  voices = speechSynthesis.getVoices();
  voiceSelect.innerHTML = voices
    .map((voice, index) => {
      // Check if the voice is Chinese (Simplified) and set it as selected
      const isSelected = voice.lang === 'zh-HK' ? 'selected' : '';
      return `<option value="${index}" ${isSelected}>${voice.name} (${voice.lang})</option>`;
    })
    .join('');
}

// Trigger loading voices when they become available
speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

// Translate text with serverless function
async function translateText(text, targetLang) {
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        target: targetLang,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    return data.data.translations[0].translatedText;
  } catch (error) {
    console.error('Translation Error: ', error);
    alert('Failed to translate text');
    return text;
  }
}

// Visual helpers: start/stop the "speaking" animation
function setSpeaking(isSpeaking) {
  mascot.classList.toggle('speaking', isSpeaking);
  waves.classList.toggle('active', isSpeaking);
}

// Show the translated text in the result panel
function showResult(text) {
  resultText.textContent = text;
  resultPanel.classList.remove('hidden');
}

// TTS
function playText(text, voiceIndex) {
  const utterance = new SpeechSynthesisUtterance(text);
  if (voices[voiceIndex]) {
    utterance.voice = voices[voiceIndex];
  }
  utterance.onstart = () => setSpeaking(true);
  utterance.onend = () => setSpeaking(false);
  utterance.onerror = () => setSpeaking(false);
  speechSynthesis.speak(utterance);
}

// Handle button interaction
async function handleButtonClick() {
  const text = textInput.value.trim();
  const targetLang = languageSelect.value;
  const selectedVoiceIndex = voiceSelect.value;

  if (!text) {
    alert('Please enter some text!');
    return;
  }

  // Show loading state on the button
  const btnText = playButton.querySelector('.btn-text');
  const originalLabel = btnText ? btnText.textContent : '';
  playButton.classList.add('loading');
  if (btnText) btnText.textContent = 'Translating…';

  try {
    // Translate text
    const translatedText = await translateText(text, targetLang);
    // Show it on screen
    showResult(translatedText);
    // Play text
    playText(translatedText, selectedVoiceIndex);
  } catch (error) {
    console.error('Error during processing: ', error);
    alert('An error occurred');
  } finally {
    playButton.classList.remove('loading');
    if (btnText) btnText.textContent = originalLabel;
  }
}

// Add event listeners for both click and touch events
playButton.addEventListener('click', handleButtonClick);
playButton.addEventListener('touchend', (event) => {
  event.preventDefault(); // Prevent default behavior
  handleButtonClick();
});

// ---------- Live character counter ----------
function updateCharCount() {
  charCount.textContent = textInput.value.length;
}
textInput.addEventListener('input', updateCharCount);
updateCharCount();

// ---------- Sample phrase chips ----------
chips.forEach((chip) => {
  chip.addEventListener('click', () => {
    textInput.value = chip.textContent;
    updateCharCount();
    textInput.focus();
  });
});

// ---------- Copy translation ----------
copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(resultText.textContent);
    copyButton.classList.add('copied');
    copyButton.textContent = '✅ Copied';
    setTimeout(() => {
      copyButton.classList.remove('copied');
      copyButton.textContent = '📋 Copy';
    }, 1500);
  } catch (err) {
    console.error('Copy failed: ', err);
  }
});

// ---------- Voice input (speech-to-text) ----------
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isListening = false;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.interimResults = true;
  recognition.continuous = false;

  recognition.addEventListener('result', (event) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0].transcript)
      .join('');
    textInput.value = transcript;
    updateCharCount();
  });

  recognition.addEventListener('end', () => {
    isListening = false;
    micButton.classList.remove('listening');
    micButton.querySelector('.mic-label').textContent = 'Speak';
  });

  recognition.addEventListener('error', () => {
    isListening = false;
    micButton.classList.remove('listening');
    micButton.querySelector('.mic-label').textContent = 'Speak';
  });

  micButton.addEventListener('click', () => {
    if (isListening) {
      recognition.stop();
      return;
    }
    // Users speak in their own language; translation handles the target language
    recognition.lang = 'en-US';
    try {
      recognition.start();
      isListening = true;
      micButton.classList.add('listening');
      micButton.querySelector('.mic-label').textContent = 'Listening…';
    } catch (err) {
      console.error('Could not start voice input: ', err);
    }
  });
} else {
  // Browser doesn't support speech recognition — hide the mic button
  micButton.style.display = 'none';
}