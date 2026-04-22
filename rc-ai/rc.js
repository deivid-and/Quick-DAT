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
const MAJOR_SECTION_HEADERS = [
  'bill to',
  'contact information',
  'reference',
  'total',
  'special instructions',
  'freight terms'
];
const GENERIC_STOP_ENTRY_HEADER_PATTERN = 'Stop\\s*#?\\s*\\d+\\b';
const PICKUP_ENTRY_HEADER_PATTERN = '(?:Pick\\s*Up\\s*#\\s*\\d+|Pickup\\s*#\\s*\\d+)\\b';
const DELIVERY_ENTRY_HEADER_PATTERN = 'Delivery\\s*#\\s*\\d+\\b';
const STOP_ENTRY_HEADER_PATTERN = `(?:${GENERIC_STOP_ENTRY_HEADER_PATTERN}|${PICKUP_ENTRY_HEADER_PATTERN}|${DELIVERY_ENTRY_HEADER_PATTERN})`;
const STOP_SECTION_HEADER_PATTERN = '(?:Pickup\\s+Information|Delivery\\s+Information|Origin|Destination)\\b';

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

function looksLikeLabel(text) {
  return /:$/i.test(text) || /\b(stop \d|total|bill to|reference|contact information|special instructions)\b/i.test(text);
}

function buildStructuredPageText(items) {
  let output = '';
  let previousItem = null;

  items.forEach(item => {
    const value = item.str ? item.str.trim() : '';
    if (!value) {
      return;
    }

    const largeGap = previousItem && item.transform && previousItem.transform
      ? Math.abs(item.transform[4] - previousItem.transform[4]) > 140 ||
        Math.abs(item.transform[5] - previousItem.transform[5]) > 14
      : false;
    const needsNewline = !previousItem || largeGap || looksLikeLabel(value);

    if (needsNewline) {
      output += `${output ? '\n' : ''}${value}`;
    } else {
      output += ` ${value}`;
    }

    previousItem = item;
  });

  return output
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*(Bill To:|Contact Information:|Reference:|Total:|Stop 1|Stop 2|Special Instructions)\s*/gi, '\n$1 ')
    .trim();
}

function scoreRateConfirmationText(text) {
  const lowerText = text.toLowerCase();
  return RC_KEYWORDS.reduce((score, keyword) => {
    return lowerText.includes(keyword.term) ? score + keyword.weight : score;
  }, 0);
}

function extractMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return '';
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findFirstHeaderMatch(text, headerVariants) {
  let bestMatch = null;

  headerVariants.forEach(header => {
    const regex = new RegExp(`(^|\\n)(${escapeRegex(header)}(?:\\s*\\d+)?\\b:?[^\\n]*)`, 'i');
    const match = regex.exec(text);
    if (!match) {
      return;
    }

    const startIndex = match.index + match[1].length;
    if (!bestMatch || startIndex < bestMatch.startIndex) {
      bestMatch = {
        startIndex,
        matchedText: match[2]
      };
    }
  });

  return bestMatch;
}

function findNextBoundaryIndex(text, startIndex) {
  const boundaryRegex = new RegExp(
    `\\n(?=(?:--- PAGE \\d+ ---|${STOP_ENTRY_HEADER_PATTERN}|${STOP_SECTION_HEADER_PATTERN}|${MAJOR_SECTION_HEADERS.map(escapeRegex).join('|')})\\s*:?)`,
    'i'
  );
  const remainingText = text.slice(startIndex);
  const match = boundaryRegex.exec(remainingText);
  return match ? startIndex + match.index : text.length;
}

function findNextSectionBoundaryIndex(text, startIndex) {
  const boundaryRegex = new RegExp(
    `\\n(?=(?:--- PAGE \\d+ ---|${STOP_SECTION_HEADER_PATTERN}|${MAJOR_SECTION_HEADERS.map(escapeRegex).join('|')})\\s*:?)`,
    'i'
  );
  const remainingText = text.slice(startIndex);
  const match = boundaryRegex.exec(remainingText);
  return match ? startIndex + match.index : text.length;
}

function findAllHeaderMatches(text, headerPatterns, type, kind) {
  const matches = [];

  headerPatterns.forEach(pattern => {
    const regex = new RegExp(`(^|\\n)(${pattern}[^\\n]*)`, 'gi');
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        type,
        kind,
        index: match.index + match[1].length,
        matchedText: match[2]
      });
    }
  });

  return matches;
}

function collectStopSnippets(text) {
  const entryMatches = [
    ...findAllHeaderMatches(text, [GENERIC_STOP_ENTRY_HEADER_PATTERN], 'generic', 'entry'),
    ...findAllHeaderMatches(text, [PICKUP_ENTRY_HEADER_PATTERN], 'pickup', 'entry'),
    ...findAllHeaderMatches(text, [DELIVERY_ENTRY_HEADER_PATTERN], 'delivery', 'entry')
  ];
  const sectionMatches = [
    ...findAllHeaderMatches(text, ['(?:Pickup\\s+Information|Origin)\\b'], 'pickup', 'section'),
    ...findAllHeaderMatches(text, ['(?:Delivery\\s+Information|Destination)\\b'], 'delivery', 'section')
  ];

  const sectionResolvedMatches = sectionMatches.map(match => {
    const regionEnd = findNextSectionBoundaryIndex(text, match.index + match.matchedText.length);
    const sectionText = text.slice(match.index, regionEnd);
    const entryMatch = findFirstHeaderMatch(
      sectionText,
      match.type === 'pickup' ? ['Pick Up #', 'Pickup #', 'Stop'] : ['Delivery #', 'Stop']
    );
    const snippetStart = entryMatch ? match.index + entryMatch.startIndex : match.index;
    const headerText = entryMatch ? entryMatch.matchedText : match.matchedText;
    const endIndex = findNextBoundaryIndex(text, snippetStart + headerText.length);

    return {
      type: match.type,
      snippet: text.slice(snippetStart, endIndex).trim(),
      index: snippetStart
    };
  });

  const entrySnippets = entryMatches.map(match => {
    const endIndex = findNextBoundaryIndex(text, match.index + match.matchedText.length);
    return {
      type: match.type,
      snippet: text.slice(match.index, endIndex).trim(),
      index: match.index
    };
  });
  const orderedStops = [...entrySnippets, ...sectionResolvedMatches].sort((a, b) => a.index - b.index);

  return orderedStops.filter((stop, index, stops) => {
    if (!stop.snippet) {
      return false;
    }

    return index === 0 || stop.index !== stops[index - 1].index;
  });
}

function parseStopSnippet(snippet, type) {
  if (!snippet) {
    return {
      type,
      appointment: '',
      appointmentNumber: '',
      company: '',
      address: '',
      rawSnippet: ''
    };
  }

  const lines = snippet
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !/^comments?:?/i.test(line) && !/^items$/i.test(line) && !/^weight qty dimensions$/i.test(line) && !/^name not available$/i.test(line) && !/^\(0\b/.test(line));

  const contentLines = lines.filter(line => !/^stop \d/i.test(line));
  const appointment = contentLines.find(line => /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b\d{1,2}:\d{2}\b|\bAM\b|\bPM\b/i.test(line)) || '';
  const appointmentNumber = extractMatch(snippet, [
    /Appt\.?\s*Number:\s*([^\n]+)/i,
    /Appointment\s*Number:\s*([^\n]+)/i
  ]);

  const meaningfulLines = contentLines.filter(line => {
    if (line === appointment || line === appointmentNumber) return false;
    if (/Appt\.?\s*Number:/i.test(line) || /Appointment\s*Number:/i.test(line)) return false;
    return true;
  });

  return {
    type,
    appointment,
    appointmentNumber,
    company: meaningfulLines[0] || '',
    address: meaningfulLines.slice(1, 3).join(', '),
    rawSnippet: snippet
  };
}

function cleanBrokerName(value) {
  if (!value) return '';
  return value
    .replace(/\s+\d{1,6}\s+.+$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function cleanContactName(value) {
  if (!value) return '';
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig, '')
    .replace(/\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/g, '')
    .replace(/\b(phone|email|tel|ext)\b[:\s]*/ig, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[|,;]\s*$/g, '')
    .trim();
}

function extractContactBlock(text) {
  const match = text.match(/Contact\s*Information:\s*([\s\S]{0,240})(?=\n(?:Reference:|Bill\s*To:|Total:|Stop \d|Special\s*Instructions)|\n\n--- PAGE|$)/i);
  return match ? match[1].trim() : '';
}

function extractPreferredPhone(text, contactBlock) {
  return extractMatch(contactBlock, [
    /(\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4})/i
  ]) || extractMatch(text, [
    /Phone:\s*([^\n]+)/i,
    /Tel(?:ephone)?:\s*([^\n]+)/i,
    /(\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4})/i
  ]);
}

function extractPreferredEmail(text, contactBlock) {
  const contactEmail = extractMatch(contactBlock, [
    /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i
  ]);
  if (contactEmail) {
    return contactEmail;
  }

  const emails = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig) || [];
  const nonInvoiceEmail = emails.find(email => !/invoice|billing|accounting|ap|ar|payment/i.test(email));
  return nonInvoiceEmail || emails[0] || '';
}

function extractFields(text) {
  const billToLine = extractMatch(text, [
    /Bill\s*To:\s*([^\n]+)/i,
    /Broker(?: Name)?:\s*([^\n]+)/i
  ]);
  const contactBlock = extractContactBlock(text);
  const rawContactName = extractMatch(text, [
    /Contact\s*Information:\s*([^\n]+)/i,
    /Contact(?: Name)?:\s*([^\n]+)/i,
    /Attention:\s*([^\n]+)/i
  ]);

  const stops = collectStopSnippets(text);
  const pickupEntry = stops.find(stop => stop.type === 'pickup' || stop.type === 'generic');
  const deliveryEntry = stops.find(stop => (stop.type === 'delivery' || stop.type === 'generic') && (!pickupEntry || stop.index > pickupEntry.index));
  const pickupSnippet = pickupEntry ? pickupEntry.snippet : '';
  const deliverySnippet = deliveryEntry ? deliveryEntry.snippet : '';

  return {
    brokerName: cleanBrokerName(billToLine),
    contactName: cleanContactName(rawContactName),
    contactPhone: extractPreferredPhone(text, contactBlock),
    contactEmail: extractPreferredEmail(text, contactBlock),
    referenceNumber: extractMatch(text, [
      /Reference:\s*([^\n]+)/i,
      /Reference\s*Number:\s*([^\n]+)/i,
      /Load\s*Reference:\s*([^\n]+)/i
    ]),
    totalRate: extractMatch(text, [
      /Total:\s*(\$[^\n]+)/i,
      /Total Rate:\s*(\$[^\n]+)/i,
      /Line Haul[\s\S]{0,40}?(\$[\d,]+(?:\.\d{2})?)/i
    ]),
    miles: extractMatch(text, [
      /(\d[\d,]*(?:\.\d+)?)\s*miles\b/i,
      /Miles:\s*([^\n]+)/i
    ]),
    pickupSnippet,
    deliverySnippet,
    pickupStop: parseStopSnippet(pickupSnippet, 'pickup'),
    deliveryStop: parseStopSnippet(deliverySnippet, 'delivery')
  };
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
    const rawPageText = buildStructuredPageText(content.items);
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
  const extractedFields = extractFields(fullText);

  console.log('Total pages extracted:', pdf.numPages);
  console.log('Pages kept:', pageBlocks.length);
  console.log('Pages filtered out:', filteredOutPages);
  console.log('Cleaned text length:', fullText.length);
  console.log('Keyword score:', keywordScore);
  console.log('Likely rate confirmation:', likelyRateConfirmation);
  console.log('Extracted fields:', extractedFields);
  console.log('Pickup stop:', extractedFields.pickupStop);
  console.log('Delivery stop:', extractedFields.deliveryStop);
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
    pre.textContent = `Extracted Fields:\n${JSON.stringify(extractedFields, null, 2)}\n\nLikely RC: ${likelyRateConfirmation ? 'Yes' : 'No'}\nKeyword Score: ${keywordScore}\n\n${fullText.trim()}`;
  }
});
