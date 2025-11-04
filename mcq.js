// --- Simple Automatic MCQ Generator ---

const inputText = document.getElementById("inputText");
const generateBtn = document.getElementById("generateBtn");
const outputCard = document.getElementById("outputCard");
const mcqList = document.getElementById("mcqList");
const qCount = document.getElementById("qCount");
const sourceCount = document.getElementById("sourceCount");
const maxQ = document.getElementById("maxQ");
const dCount = document.getElementById("dCount");
const mcqType = document.getElementById("mcqType");


let currentMCQs = [];

const stopwords = new Set([
  "the", "is", "in", "and", "a", "an", "of", "to", "for", "on", "with", "as", "by",
  "that", "this", "these", "those", "are", "be", "was", "were", "it", "at", "from"
]);

function splitSentences(text) {
  return text.replace(/\n+/g, " ")
             .split(/(?<=[.?!])\s+(?=[A-Z0-9])/)
             .map(s => s.trim())
             .filter(Boolean);
}

function extractCandidates(sentence) {
  const tokens = sentence.match(/[A-Za-z0-9\-]+/g) || [];
  return tokens.filter(t => {
    const lower = t.toLowerCase();
    return (t.length > 5 && !stopwords.has(lower)) || /^[A-Z]/.test(t);
  });
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
function generateMCQsFromText(text, maxQ = 5, dCount = 3 ,type = "medium") {
  const sentences = splitSentences(text);
  const globalCandidates = [];

  sentences.forEach(s => {
    extractCandidates(s).forEach(c => {
      if (!globalCandidates.includes(c)) globalCandidates.push(c);
    });
  });

  const mcqs = [];

  for (const s of sentences) {
    if (mcqs.length >= maxQ) break;
    const candidates = extractCandidates(s);
    const answer = candidates[0];
    if (!answer) continue;

    const question = s.replace(answer, "_____");
    let distractorPool = [...globalCandidates.filter(g => g !== answer)];

if (type === "easy") {
  distractorPool = distractorPool.slice(0, 10);
} else if (type === "medium") {
  distractorPool = distractorPool.slice(0, 30);
} else if (type === "hard") {
  distractorPool = distractorPool.slice(0, 100);
}

const distractors = distractorPool.slice(0, dCount - 1);
const options = [answer, ...distractors];
shuffle(options);

   

    mcqs.push({ question, answer, options });
  }

  return { mcqs, sentencesCount: sentences.length, candidatesCount: globalCandidates.length };
}

generateBtn.addEventListener("click", () => {
  const text = inputText.value.trim();
  if (!text) return alert("Please enter some text first.");

const res = generateMCQsFromText(
  text,
  Number(maxQ.value),
  Number(dCount.value),
  mcqType.value
);


  currentMCQs = res.mcqs;
  outputCard.style.display = "block";
  qCount.textContent = `${currentMCQs.length} Questions Generated`;
  sourceCount.textContent = `${res.sentencesCount} sentences • ${res.candidatesCount} candidates`;

  renderMCQs();
});

function renderMCQs() {
  mcqList.innerHTML = "";
  currentMCQs.forEach((q, i) => {
    const div = document.createElement("div");
    div.className = "mcq";
    div.innerHTML = `
      <strong>Q${i + 1}. ${q.question}</strong><br>
      ${q.options.map(o => `<span class="opt">${o}</span>`).join(" ")}
      <br><small>Answer: ${q.answer}</small>
    `;
    mcqList.appendChild(div);
  });
}

// Export / Copy / Clear buttons
document.getElementById("exportJSON").addEventListener("click", () => {
  downloadFile("mcqs.json", JSON.stringify(currentMCQs, null, 2));
});

document.getElementById("exportCSV").addEventListener("click", () => {
  const rows = ["Question,Option1,Option2,Option3,Option4,Answer"];
  currentMCQs.forEach(q => {
    const opts = q.options.slice(0, 4);
    while (opts.length < 4) opts.push("");
    rows.push(`"${q.question}","${opts[0]}","${opts[1]}","${opts[2]}","${opts[3]}","${q.answer}"`);
  });
  downloadFile("mcqs.csv", rows.join("\n"));
});

document.getElementById("copyToClipboard").addEventListener("click", async () => {
  await navigator.clipboard.writeText(JSON.stringify(currentMCQs, null, 2));
  alert("MCQs copied to clipboard!");
});

document.getElementById("clearAll").addEventListener("click", () => {
  inputText.value = "";
  outputCard.style.display = "none";
  mcqList.innerHTML = "";
});

function downloadFile(filename, content) {
  const blob = new Blob([content], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
// --- PDF & Image Upload Section ---

const pdfUpload = document.getElementById("pdfUpload");
const extractPdfBtn = document.getElementById("extractPdfBtn");
const imageUpload = document.getElementById("imageUpload");
const extractImgBtn = document.getElementById("extractImgBtn");

// Extract text from uploaded PDF
if (extractPdfBtn && pdfUpload) {
  extractPdfBtn.addEventListener("click", async () => {
    const file = pdfUpload.files[0];
    if (!file) return alert("Please select a PDF file first!");

    const text = await extractTextFromPDF(file);
    if (text) {
      inputText.value = text;
      alert("PDF  extracted successfully! Now click 'Generate MCQs'.");
    }
  });
}

// Placeholder for image upload (future OCR support)
if (extractImgBtn && imageUpload) {
  extractImgBtn.addEventListener("click", async () => {
    const file = imageUpload.files[0];
    if (!file) return alert("Please select an image file first!");

    try {
      const { data: { text } } = await Tesseract.recognize(file, 'eng', {
        logger: info => console.log(info) // optional progress logs
      });
      inputText.value = text.trim();
      alert("Image  extracted successfully! Now click 'Generate MCQs'.");
    } catch (err) {
      console.error("OCR Error:", err);
      alert("Failed to extract  image.");
    }
  });
}


// Function to extract text using PDF.js
async function extractTextFromPDF(file) {
  const fileReader = new FileReader();
  return new Promise((resolve, reject) => {
    fileReader.onload = async function () {
      const typedarray = new Uint8Array(this.result);
      try {
        const pdf = await pdfjsLib.getDocument(typedarray).promise;
        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const strings = content.items.map(item => item.str);
          text += strings.join(" ") + "\n";
        }
        resolve(text);
      } catch (error) {
        console.error("Error reading PDF:", error);
        reject(error);
      }
    };
    fileReader.readAsArrayBuffer(file);
  });
}
