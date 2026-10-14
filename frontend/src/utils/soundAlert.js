/**
 * soundAlert.js
 * Generates audio alerts using the Web Audio API without requiring any external mp3 files.
 * Works across modern browsers (Chrome, Safari, Edge, Firefox, Mobile).
 */

class SoundAlertManager {
  constructor() {
    this.ctx = null;
    this.isMuted = localStorage.getItem('nx_alert_muted') === 'true';
    this.hasInteracted = false;

    // Listen for any user click/tap to resume AudioContext (browser autoplay policy)
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        this.hasInteracted = true;
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume();
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

  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('nx_alert_muted', String(this.isMuted));
    return this.isMuted;
  }

  getMuteState() {
    return this.isMuted;
  }

  /**
   * High-alert loud dual-tone chime for overdue checkouts
   */
  playOverdueBeep() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Play 3 pulsing attention beeps: High-Low-High (880Hz -> 659Hz -> 880Hz)
      const playTone = (freq, startTime, duration, type = 'sine') => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);

        // Quick attack and release envelope to prevent clicking
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.35, startTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration + 0.05);
      };

      // Beep pattern
      playTone(880, now, 0.18, 'triangle');       // Note 1 (High A5)
      playTone(659.25, now + 0.22, 0.18, 'triangle'); // Note 2 (E5)
      playTone(987.77, now + 0.44, 0.28, 'sine');     // Note 3 (High B5 alert)
    } catch (err) {
      console.warn('Audio alert could not play:', err);
    }
  }

  /**
   * Gentle reminder chime when checkout is approaching (within 15-30 mins)
   */
  playUpcomingBeep() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const playChime = (freq, startTime, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.2, startTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration + 0.05);
      };

      playChime(587.33, now, 0.2); // D5
      playChime(880, now + 0.2, 0.35); // A5
    } catch (err) {
      console.warn('Audio alert could not play:', err);
    }
  }
}

export const soundAlert = new SoundAlertManager();
export default soundAlert;
