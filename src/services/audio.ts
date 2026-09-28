/**
 * Audio Notification Service
 * Supports Web Audio Synthesizer, custom audio uploads, and Multi-language / Thai-only Text-To-Speech (TTS)
 */

export type TTSLanguageOption = 'thai_only' | 'english_only' | 'all';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playSynthChime(volume = 0.8) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume * 0.4, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + duration);
    };

    playTone(587.33, now, 0.4);       // D5
    playTone(880.00, now + 0.12, 0.5); // A5
    playTone(1174.66, now + 0.25, 0.8);// D6
  } catch (err) {
    console.warn('Audio play error:', err);
  }
}

export function playWarningSiren(volume = 0.8) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    // Frequency sweep
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.linearRampToValueAtTime(880, now + 0.25);
    osc.frequency.linearRampToValueAtTime(520, now + 0.5);
    osc.frequency.linearRampToValueAtTime(880, now + 0.75);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume * 0.25, now + 0.05);
    gain.gain.setValueAtTime(volume * 0.25, now + 0.7);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.9);
  } catch (err) {
    console.warn('Siren play error:', err);
  }
}

export function playHorn(volume = 0.8) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      const start = now + idx * 0.1;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume * 0.35, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.4);
    });
  } catch (err) {
    console.warn('Horn play error:', err);
  }
}

export function play8Bit(volume = 0.8) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const freqs = [330, 392, 659, 523, 587, 784];
    freqs.forEach((freq, i) => {
      const start = now + i * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(volume * 0.15, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.16);
    });
  } catch (err) {
    console.warn('8bit play error:', err);
  }
}

export function playSciFi(volume = 0.8) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(1600, now + 0.35);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume * 0.3, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.5);
  } catch (err) {
    console.warn('SciFi play error:', err);
  }
}

export function playCustomAudio(audioUrl: string, volume = 0.8) {
  try {
    const audio = new Audio(audioUrl);
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.play().catch(err => console.warn('Custom audio playback error:', err));
  } catch (err) {
    console.warn('Failed to play custom audio:', err);
  }
}

/**
 * Smart Boss Name Extractor based on requested language
 * If 'thai_only': extracts only the Thai portion (e.g. "เทมเพสต์ - Valefar" -> "เทมเพสต์")
 * If 'english_only': extracts only the English portion (e.g. "เทมเพสต์ - Valefar" -> "Valefar")
 * If 'all': cleans dashes and keeps full name (e.g. "เทมเพสต์ Valefar")
 */
export function extractBossName(rawName: string, lang: TTSLanguageOption = 'thai_only'): string {
  if (!rawName) return '';
  const trimmed = rawName.trim();

  // If "all", replace hyphens and clean spaces
  if (lang === 'all') {
    return trimmed.replace(/\s*[-/|]\s*/g, ' ').replace(/\s+/g, ' ').trim();
  }

  const thaiRegex = /[\u0E00-\u0E7F]/;
  const englishRegex = /[a-zA-Z]/;

  // Split by common delimiters like "-" or "/"
  if (trimmed.includes('-') || trimmed.includes('/')) {
    const parts = trimmed.split(/[-/]/).map(p => p.trim()).filter(Boolean);

    if (lang === 'thai_only') {
      const thaiPart = parts.find(p => thaiRegex.test(p));
      if (thaiPart) {
        // Strip out any trailing English in parenthesis or brackets
        const clean = thaiPart.replace(/\([A-Za-z0-9\s]+\)/g, '').replace(/[a-zA-Z]+/g, '').trim();
        return clean.length > 0 ? clean : thaiPart;
      }
    } else if (lang === 'english_only') {
      const engPart = parts.find(p => englishRegex.test(p));
      if (engPart) {
        const clean = engPart.replace(/[\u0E00-\u0E7F]+/g, '').trim();
        return clean.length > 0 ? clean : engPart;
      }
    }
  }

  // If no delimiter found, extract by matching characters
  if (lang === 'thai_only') {
    if (thaiRegex.test(trimmed)) {
      const thaiMatches = trimmed.match(/[\u0E00-\u0E7F0-9\s]+/g);
      if (thaiMatches) {
        const cleaned = thaiMatches.join(' ').replace(/\s+/g, ' ').trim();
        if (cleaned.length > 0) return cleaned;
      }
    }
  } else if (lang === 'english_only') {
    if (englishRegex.test(trimmed)) {
      const engMatches = trimmed.match(/[a-zA-Z0-9'\s]+/g);
      if (engMatches) {
        const cleaned = engMatches.join(' ').replace(/\s+/g, ' ').trim();
        if (cleaned.length > 0) return cleaned;
      }
    }
  }

  // Fallback if desired script wasn't found
  return trimmed.replace(/\s*[-/|]\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Text-to-Speech synthesis with voice and rate control
 */
export function speakText(
  text: string, 
  options: { 
    volume?: number; 
    rate?: number; 
    lang?: string;
  } = {}
) {
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const targetLang = options.lang || 'th-TH';
    utterance.lang = targetLang;
    utterance.volume = options.volume ?? 0.8;
    utterance.rate = options.rate ?? 1.05;

    // Pick appropriate voice
    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find(v => v.lang.toLowerCase().includes(targetLang.toLowerCase().slice(0, 2)));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('TTS error:', err);
  }
}

export function speakThai(text: string, volume = 0.8, rate = 1.05) {
  speakText(text, { volume, rate, lang: 'th-TH' });
}

export function playBossAlert(
  soundType: string,
  volume = 0.8,
  customUrl?: string,
  bossInfo?: { name: string; server: 'main' | 'sub'; serverTag?: string; minutesLeft: number },
  ttsLanguage: TTSLanguageOption = 'thai_only',
  ttsSpeed = 1.05
) {
  if (soundType === 'tts_thai' && bossInfo) {
    const serverLabel = bossInfo.serverTag || (bossInfo.server === 'main' ? 'เซิร์ฟหลัก' : 'เซิร์ฟรอง');
    const spokenBossName = extractBossName(bossInfo.name, ttsLanguage);

    let textToSpeak = '';
    if (ttsLanguage === 'english_only') {
      textToSpeak = `${spokenBossName} ${serverLabel} spawning in ${bossInfo.minutesLeft} minutes`;
      speakText(textToSpeak, { volume, rate: ttsSpeed, lang: 'en-US' });
    } else {
      // thai_only or all
      textToSpeak = `${spokenBossName} ${serverLabel} กำลังจะเกิดในอีก ${bossInfo.minutesLeft} นาที`;
      speakThai(textToSpeak, volume, ttsSpeed);
    }
    return;
  }

  if (soundType === 'custom' && customUrl) {
    playCustomAudio(customUrl, volume);
    return;
  }

  switch (soundType) {
    case 'warning_siren':
      playWarningSiren(volume);
      break;
    case 'horn':
      playHorn(volume);
      break;
    case '8bit':
      play8Bit(volume);
      break;
    case 'sci_fi':
      playSciFi(volume);
      break;
    case 'tts_thai': {
      const bossName = bossInfo ? extractBossName(bossInfo.name, ttsLanguage) : 'บอส';
      speakThai(`${bossName} กำลังจะเกิด`, volume, ttsSpeed);
      break;
    }
    case 'synth_chime':
    default:
      playSynthChime(volume);
      break;
  }
}
