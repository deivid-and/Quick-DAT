const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.panel');
const fileInput = document.getElementById('rcFile');
const analyzeBtn = document.getElementById('analyzeBtn');
const fileLabel = document.querySelector('.file-input span');
const defaultLabelText = 'Upload Rate Confirmation (PDF)';
const jsonPanel = document.querySelector('.panel[data-panel="json"]');
let selectedFile = null;

if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('rc-ai/lib/pdfjs/pdf.worker.min.js');
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

  let fullText = '';
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ').trim();
    fullText += `\\n\\n--- PAGE ${pageNum} ---\\n\\n${pageText}`;
  }

  console.log('Pages:', pdf.numPages, 'Text length:', fullText.length);
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
    pre.textContent = fullText.trim();
  }
});
