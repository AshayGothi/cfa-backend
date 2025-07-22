const express = require("express");
const cors = require("cors");
const { PDFDocument } = require("pdf-lib");
const fetch = require("node-fetch");
const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));

const GROQ_API_KEY = process.env.GROQ_API_KEY;
 // replace with your Groq key

app.post("/extract", async (req, res) => {
  try {
    const pdfBytes = Buffer.from(req.body.data, "base64");
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    let text = "";
    for (const page of pages) {
      const pageText = await page.getTextContent();
      text += pageText.items.map(i => i.str).join(" ");
    }

    const aiRes = await fetch("https://api.groq.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "mixtral-8x7b-32768",
        messages: [
          {
            role: "user",
            content: `Extract 10 CFA MCQ questions from this text. Format as [{"question":"...","options":["A","B","C","D"],"answer":"A"}]. Text: ${text}`
          }
        ]
      })
    });

    const aiData = await aiRes.json();
    const questions = JSON.parse(aiData.choices[0].message.content);
    res.json({ questions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/analyze", async (req, res) => {
  const { score, total } = req.body;

  const feedbackRes = await fetch("https://api.groq.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "mixtral-8x7b-32768",
      messages: [
        {
          role: "user",
          content: `I scored ${score}/${total} on a CFA mock test. Give me suggestions on how to improve and where to focus.`
        }
      ]
    })
  });

  const feedbackData = await feedbackRes.json();
  res.json({ feedback: feedbackData.choices[0].message.content });
});

app.get("/", (req, res) => {
  res.send("CFA Backend running!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

