require('dotenv').config();
const gTTS = require('gtts');
const path = require('path');
const blendShapeNames = require('./blendshapeNames');
const _ = require('lodash');
const { getAudioDurationInSeconds } = require('get-audio-duration'); // Library untuk durasi audio

const textToSpeech = async (text, voice) => {
  return new Promise((resolve, reject) => {
    const randomString = Math.random().toString(36).slice(2, 7);
    const filename = `/speech-${randomString}.mp3`;
    const outputPath = path.join(__dirname, '../public', `speech-${randomString}.mp3`);

    const gtts = new gTTS(text, voice || 'en');

    gtts.save(outputPath, async (err) => {
      if (err) {
        console.error('Error generating speech with gTTS:', err);
        return reject(err);
      }

      try {
        // Dapatkan durasi audio aktual
        const audioDuration = await getAudioDurationInSeconds(outputPath);
        const blendData = generateBlendData(text, audioDuration);
        resolve({ blendData, filename });
      } catch (durationErr) {
        console.error('Error getting audio duration:', durationErr);
        reject(durationErr);
      }
    });
  });
};

// Fungsi untuk menghasilkan blendData hanya untuk mulut dengan durasi audio
function generateBlendData(text, audioDuration) {
  const timeStep = 1 / 60; // 60 FPS
  const blendData = [];
  let timeStamp = 0;

  // Mapping fonem ke blend shapes hanya untuk mulut dan rahang
  const phonemeMap = {
    'a': { jawOpen: 0.7, mouthLowerDownLeft: 0.5, mouthLowerDownRight: 0.5, duration: 0.15 },
    'e': { jawOpen: 0.5, mouthLowerDownLeft: 0.4, mouthLowerDownRight: 0.4, duration: 0.12 },
    'i': { jawOpen: 0.3, mouthSmileLeft: 0.4, mouthSmileRight: 0.4, duration: 0.10 },
    'o': { jawOpen: 0.6, mouthFunnel: 0.5, duration: 0.15 },
    'u': { jawOpen: 0.4, mouthPucker: 0.6, duration: 0.12 },
    'b': { mouthClose: 0.9, mouthPressLeft: 0.5, mouthPressRight: 0.5, duration: 0.08 },
    'p': { mouthClose: 0.9, mouthPressLeft: 0.5, mouthPressRight: 0.5, duration: 0.08 },
    'm': { mouthClose: 0.9, mouthShrugUpper: 0.4, duration: 0.10 },
    'f': { mouthUpperUpLeft: 0.6, mouthUpperUpRight: 0.6, mouthLowerDownLeft: 0.3, duration: 0.08 },
    'v': { mouthUpperUpLeft: 0.6, mouthUpperUpRight: 0.6, mouthLowerDownLeft: 0.3, duration: 0.08 },
    's': { mouthSmileLeft: 0.4, mouthSmileRight: 0.4, mouthStretchLeft: 0.2, duration: 0.08 },
    'z': { mouthSmileLeft: 0.4, mouthSmileRight: 0.4, mouthStretchLeft: 0.2, duration: 0.08 },
    't': { jawOpen: 0.3, mouthShrugUpper: 0.3, duration: 0.07 },
    'd': { jawOpen: 0.3, mouthShrugUpper: 0.3, duration: 0.07 },
    ' ': { mouthClose: 0.8, duration: 0.05 },
    'default': { jawOpen: 0.1, duration: 0.05 }
  };

  // Hitung total durasi fonem untuk distribusi
  const chars = text.toLowerCase().split('');
  let totalPhonemeDuration = 0;
  chars.forEach((char) => {
    const phoneme = phonemeMap[char] || phonemeMap['default'];
    totalPhonemeDuration += phoneme.duration;
  });

  // Skala durasi fonem agar sesuai dengan audioDuration
  const scaleFactor = audioDuration / totalPhonemeDuration;

  chars.forEach((char, charIndex) => {
    const phoneme = phonemeMap[char] || phonemeMap['default'];
    const duration = phoneme.duration * scaleFactor; // Skala durasi
    const startTime = timeStamp;
    const endTime = startTime + duration;

    // Blend shapes dasar hanya untuk mulut
    const baseBlend = {};
    _.each(blendShapeNames, (shapeName) => {
      if (
        shapeName.includes('mouth') ||
        shapeName.includes('jaw') ||
        shapeName === 'tongueOut'
      ) {
        baseBlend[shapeName] = phoneme[shapeName] || 0;
      } else {
        baseBlend[shapeName] = 0;
      }
    });

    // Transisi halus ke blend shapes berikutnya
    for (let t = startTime; t < endTime; t += timeStep) {
      const frameBlend = { ...baseBlend };

      // Interpolasi untuk transisi mulut
      const progress = (t - startTime) / duration;
      const nextChar = chars[charIndex + 1] || ' ';
      const nextPhoneme = phonemeMap[nextChar] || phonemeMap['default'];
      _.each(blendShapeNames, (shapeName) => {
        if (
          shapeName.includes('mouth') ||
          shapeName.includes('jaw') ||
          shapeName === 'tongueOut'
        ) {
          const startValue = phoneme[shapeName] || 0;
          const endValue = nextPhoneme[shapeName] || 0;
          frameBlend[shapeName] = startValue + (endValue - startValue) * progress;
        } else {
          frameBlend[shapeName] = 0;
        }
      });

      blendData.push({
        time: t,
        blendshapes: frameBlend,
      });
      timeStamp = t + timeStep;
    }
  });

  // Pastikan blendData berhenti sesuai durasi audio
  while (timeStamp < audioDuration) {
    const frameBlend = {};
    _.each(blendShapeNames, (shapeName) => {
      frameBlend[shapeName] = shapeName.includes('mouth') || shapeName.includes('jaw') || shapeName === 'tongueOut' ? 0 : 0;
    });

    blendData.push({
      time: timeStamp,
      blendshapes: frameBlend,
    });
    timeStamp += timeStep;
  }

  return blendData;
}

module.exports = textToSpeech;