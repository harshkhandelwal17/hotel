/**
 * soundAlert.js
 * High-Volume Commercial Alert System (Rapido/Swiggy order chime style).
 * Plays high-energy 5.2s audio files with Web Audio API fallback.
 */

class SoundAlertManager {
  constructor() {
    this.ctx = null;
    this.masterOut = null;
    this.isMuted = typeof window !== 'undefined' ? localStorage.getItem('nx_alert_muted') === 'true' : false;
    this.hasInteracted = false;
    this.pendingVariant = null;
    this.currentAudio = null;

    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        this.hasInteracted = true;
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        if (this.pendingVariant) {
          const v = this.pendingVariant;
          this.pendingVariant = null;
          this.playHotelBell(v);
        }
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
      };
      window.addEventListener('click', unlockAudio, { passive: true });
      window.addEventListener('keydown', unlockAudio, { passive: true });
      window.addEventListener('touchstart', unlockAudio, { passive: true });
    }
  }

  getAudioContext() {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  getOutputNode(ctx) {
    if (!this.masterOut) {
      const preBoost = ctx.createGain();
      preBoost.gain.setValueAtTime(3.2, ctx.currentTime); // 320% loudness boost

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-14, ctx.currentTime);
      compressor.knee.setValueAtTime(8, ctx.currentTime);
      compressor.ratio.setValueAtTime(16, ctx.currentTime);
      compressor.attack.setValueAtTime(0.001, ctx.currentTime);
      compressor.release.setValueAtTime(0.12, ctx.currentTime);

      const postGain = ctx.createGain();
      postGain.gain.setValueAtTime(1.5, ctx.currentTime);

      preBoost.connect(compressor);
      compressor.connect(postGain);
      postGain.connect(ctx.destination);

      this.masterOut = preBoost;
    }
    return this.masterOut;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('nx_alert_muted', String(this.isMuted));
    }
    if (this.isMuted && this.currentAudio) {
      this.currentAudio.pause();
    }
    return this.isMuted;
  }

  getMuteState() {
    return this.isMuted;
  }

  hasAlertRung(stayId, alertType) {
    if (typeof window === 'undefined') return false;
    try {
      return sessionStorage.getItem(`nx_bell_${stayId}_${alertType}`) === 'true';
    } catch (e) {
      return false;
    }
  }

  markAlertRung(stayId, alertType) {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(`nx_bell_${stayId}_${alertType}`, 'true');
    } catch (e) {}
  }

  /**
   * Plays the ultra-loud Rapido-style alert sound (5.2 seconds)
   * Tries native HTML5 Audio element first for full hardware media volume,
   * with seamless fallback to multi-stage synthesized Web Audio.
   * 
   * @param {'single' | 'double'} variant
   * 'single': 5-second melodic reminder chime (for 10m upcoming checkout)
   * 'double': 5-second ultra-loud Rapido high alert (for 30m overdue checkout)
   */
  playHotelBell(variant = 'double') {
    if (this.isMuted) return;

    const base = (import.meta.env?.BASE_URL || '/').replace(/\/+$/, '') + '/';
    const fileName = variant === 'single' ? 'upcoming_alert.wav' : 'checkout_alert.wav';
    const fileUrl = `${base}sounds/${fileName}`;

    // 1. Try HTML5 Audio (full system hardware volume)
    if (typeof window !== 'undefined' && typeof Audio !== 'undefined') {
      try {
        if (this.currentAudio) {
          this.currentAudio.pause();
          this.currentAudio.currentTime = 0;
        }

        const audio = new Audio(fileUrl);
        audio.preload = 'auto';
        audio.volume = 1.0;
        this.currentAudio = audio;

        audio.onerror = () => {
          // If file could not load or 404, fallback to Web Audio synthesizer
          this.playSynthesizedFallback(variant);
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              // Successfully started hardware audio playback!
            })
            .catch(() => {
              // If browser blocked autoplay due to no interaction yet
              this.pendingVariant = variant;
              this.playSynthesizedFallback(variant);
            });
          return;
        }
      } catch (e) {
        // Fallback to Web Audio synthesis below
      }
    }

    // 2. Web Audio Synthesizer Fallback
    this.playSynthesizedFallback(variant);
  }

  playSynthesizedFallback(variant) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      this.pendingVariant = variant;
      ctx.resume().catch(() => {});
      return;
    }

    try {
      const output = this.getOutputNode(ctx);
      const ringDing = (startTime, pitch = 1175, masterVol = 1.0, decaySec = 2.4) => {
        const partials = [
          { freq: pitch, type: 'triangle', gain: 0.75, decay: decaySec },
          { freq: pitch * 1.5, type: 'sine', gain: 0.60, decay: decaySec * 0.9 },
          { freq: pitch * 2.0, type: 'sine', gain: 0.50, decay: decaySec * 0.75 },
          { freq: pitch * 0.5, type: 'triangle', gain: 0.45, decay: decaySec * 1.1 },
          { freq: pitch * 2.76, type: 'sine', gain: 0.35, decay: decaySec * 0.55 },
          { freq: pitch * 4.15, type: 'triangle', gain: 0.25, decay: 0.4 }
        ];

        partials.forEach(({ freq, type, gain: partGain, decay }) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();

          osc.type = type;
          osc.frequency.setValueAtTime(freq, startTime);

          gainNode.gain.setValueAtTime(0.0001, startTime);
          gainNode.gain.linearRampToValueAtTime(partGain * masterVol, startTime + 0.002);
          gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + decay);

          osc.connect(gainNode);
          gainNode.connect(output);

          osc.start(startTime);
          osc.stop(startTime + decay + 0.05);
        });
      };

      const now = ctx.currentTime;
      if (variant === 'single') {
        ringDing(now + 0.0, 1046.5, 1.0, 2.2);
        ringDing(now + 1.2, 1318.5, 1.0, 2.2);
        ringDing(now + 2.4, 1174.6, 1.0, 2.2);
        ringDing(now + 3.6, 1568.0, 1.0, 2.8);
      } else {
        // High rapid repetition like Rapido order alert
        ringDing(now + 0.0, 1318.5, 1.0, 0.4);
        ringDing(now + 0.2, 1568.0, 1.0, 0.4);
        ringDing(now + 0.4, 2093.0, 1.0, 0.6);

        ringDing(now + 1.2, 1318.5, 1.0, 0.4);
        ringDing(now + 1.4, 1568.0, 1.0, 0.4);
        ringDing(now + 1.6, 2093.0, 1.0, 0.6);

        ringDing(now + 2.4, 1318.5, 1.0, 0.4);
        ringDing(now + 2.6, 1568.0, 1.0, 0.4);
        ringDing(now + 2.8, 2093.0, 1.0, 0.6);

        ringDing(now + 3.6, 1568.0, 1.0, 0.4);
        ringDing(now + 3.9, 2349.3, 1.0, 2.5);
      }
    } catch (err) {
      console.warn('Audio alert fallback could not play:', err);
    }
  }

  playUpcomingBeep() {
    this.playHotelBell('single');
  }

  playOverdueBeep() {
    this.playHotelBell('double');
  }
}

export const soundAlert = new SoundAlertManager();
export default soundAlert;
