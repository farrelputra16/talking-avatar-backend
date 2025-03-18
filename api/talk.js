const axios = require('axios');
const textToSpeech = require('../helpers/tts'); // Sesuaikan path jika ada helper TTS

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { text } = req.body;
  const apiKey = process.env.GROQ_API_KEY; // Ambil dari environment variables
  const groqUrl = 'https://api.groq.com/openai/v1/chat/completions';

  try {
    const response = await axios.post(groqUrl, {
      model: 'gemma2-9b-it',
      messages: [{ role: 'user', content: text }]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });

    const answer = response.data.choices[0].message.content;
    const { blendData, filename } = await textToSpeech(answer, 'en'); // Sesuaikan dengan logika TTS Anda
    res.status(200).json({ blendData, filename });
  } catch (error) {
    console.error(error);
    res.status(500).send('Terjadi kesalahan di server');
  }
};