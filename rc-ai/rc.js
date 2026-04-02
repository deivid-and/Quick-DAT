const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.panel');
const fileInput = document.getElementById('rcFile');
const analyzeBtn = document.getElementById('analyzeBtn');
const fileLabel = document.querySelector('.file-input span');
const defaultLabelText = 'Upload Rate Confirmation (PDF)';
const jsonPanel = document.querySelector('.panel[data-panel="json"]');
let selectedFile = null;

const FILTER_TERMS = [
  'highway audit report',
  'activity history',
  'viewed',
  'terms accepted',
  'digital signature audit trail'
];
const RC_KEYWORDS = [
  { term: 'load tender', weight: 3 },
  { term: 'rate confirmation', weight: 3 },
  { term: 'carrier', weight: 2 },
  { term: 'pickup', weight: 2 },
  { term: 'drop', weight: 1 },
  { term: 'delivery', weight: 2 },
  { term: 'reference', weight: 1 },
  { term: 'bill to', weight: 2 },
  { term: 'special instructions', weight: 2 },
  { term: 'line haul', weight: 2 },
  { term: 'fuel', weight: 1 },
  { term: 'total', weight: 1 },
  { term: 'freight terms', weight: 2 },
  { term: 'appointment', weight: 1 },
  { term: 'stop 1', weight: 2 },
  { term: 'stop 2', weight: 2 }
];

if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('rc-ai/lib/pdfjs/pdf.worker.min.js');
}

function normalizePageText(text) {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .trim();
}

function shouldFilterPage(text) {
  const lowerText = text.toLowerCase();
  const matchCount = FILTER_TERMS.filter(term => lowerText.includes(term)).length;
  return matchCount >= 2;
}

function scoreRateConfirmationText(text) {
  const lowerText = text.toLowerCase();
  return RC_KEYWORDS.reduce((score, keyword) => {
    return lowerText.includes(keyword.term) ? score + keyword.weight : score;
  }, 0);
}

function setActiveTab(tab) {
  const key = tab.getAttribute('data-tab');

  tabs.forEach(btn => {
    const isActive = btn === tab;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  panels.forEach(panel => {
    const isMatch = panel.getAttribute('data-panel') === key;
    panel.classList.toggle('hidden', !isMatch);
  });
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => setActiveTab(tab));
});

function setAnalyzeEnabled(enabled) {
  analyzeBtn.disabled = !enabled;
}

setAnalyzeEnabled(false);

fileInput.addEventListener('change', (event) => {
  const file = event.target.files && event.target.files[0];
  if (file && file.type === 'application/pdf') {
    console.log('Selected file:', file.name);
    if (fileLabel) {
      fileLabel.textContent = `Selected: ${file.name}`;
    }
    selectedFile = file;
    setAnalyzeEnabled(true);
    return;
  }

  if (fileLabel) {
    fileLabel.textContent = defaultLabelText;
  }
  selectedFile = null;
  setAnalyzeEnabled(false);
});

analyzeBtn.addEventListener('click', async () => {
  if (!selectedFile) return;
  if (typeof pdfjsLib === 'undefined') {
    console.warn('pdfjsLib is not available. Ensure pdf.min.js is loaded.');
    return;
  }

  console.log('Analyze clicked');
  const arrayBuffer = await selectedFile.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pageBlocks = [];
  let filteredOutPages = 0;
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const rawPageText = content.items.map(item => item.str).join(' ').trim();
    const normalizedPageText = normalizePageText(rawPageText);

    if (!normalizedPageText) {
      continue;
    }

    if (shouldFilterPage(normalizedPageText)) {
      filteredOutPages += 1;
      continue;
    }

    pageBlocks.push(`--- PAGE ${pageNum} ---\n\n${normalizedPageText}`);
  }

  const fullText = pageBlocks.join('\n\n');
  const keywordScore = scoreRateConfirmationText(fullText);
  const likelyRateConfirmation = keywordScore >= 6;

  console.log('Total pages extracted:', pdf.numPages);
  console.log('Pages kept:', pageBlocks.length);
  console.log('Pages filtered out:', filteredOutPages);
  console.log('Cleaned text length:', fullText.length);
  console.log('Keyword score:', keywordScore);
  console.log('Likely rate confirmation:', likelyRateConfirmation);
  if (fullText.length < 500) {
    console.log('Likely scanned PDF (no embedded text).');
  }

  if (jsonPanel) {
    let pre = jsonPanel.querySelector('pre');
    if (!pre) {
      pre = document.createElement('pre');
      jsonPanel.innerHTML = '';
      jsonPanel.appendChild(pre);
    }
    pre.textContent = `Likely RC: ${likelyRateConfirmation ? 'Yes' : 'No'}\nKeyword Score: ${keywordScore}\n\n${fullText.trim()}`;
  }
});
