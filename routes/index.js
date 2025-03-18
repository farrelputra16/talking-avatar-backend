var express = require('express');
var router = express.Router();
var axios = require('axios');
var textToSpeech = require('../helpers/tts'); // Impor fungsi TTS

const apiKey = process.env.GROQ_API_KEY;
const groqUrl = 'https://api.groq.com/openai/v1/chat/completions';

router.post('/talk', async function(req, res, next) {
  const { text } = req.body;

  try {
    // Langkah 1: Kirim permintaan ke Groq API
    const response = await axios.post(groqUrl, {
      model: 'gemma2-9b-it', // Pastikan model mendukung bahasa Inggris
      messages: [{ role: 'user', content: text }]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });

    // Langkah 2: Ambil jawaban dari Groq
    const answer = response.data.choices[0].message.content;
    console.log('Pertanyaan:', text);
    console.log('Jawaban dari Grok:', answer);
    // Langkah 3: Hasilkan audio dan blendData dengan textToSpeech
    const { blendData, filename } = await textToSpeech(answer, 'en');

    // Langkah 4: Kembalikan respons JSON
    res.json({ blendData, filename });
  } catch (error) {
    console.error(error);
    res.status(500).send('Terjadi kesalahan di server');
  }
});

module.exports = router;