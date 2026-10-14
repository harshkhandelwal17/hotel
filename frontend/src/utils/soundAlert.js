/**
 * soundAlert.js
 * High-fidelity Hotel Concierge Desk Bell synthesis using the Web Audio API.
 * Synthesizes realistic acoustic brass bell harmonics without external MP3 files.
 */

class SoundAlertManager {
  constructor() {
    this.ctx = null;
    this.isMuted = typeof window !== 'undefined' ? localStorage.getItem('nx_alert_muted') === 'true' : false;
    this.hasInteracted = false;
    this.pendingVariant = null;

    // Listen for any user click/tap/keypress to resume AudioContext (browser autoplay policy)
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        this.hasInteracted = true;
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().then(() => {
            if (this.pendingVariant) {
              const v = this.pendingVariant;
              this.pendingVariant = null;
              this.playHotelBell(v);
            }
          }).catch(() => {});
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
    if (typeof window !== 'undefined') {
      localStorage.setItem('nx_alert_muted', String(this.isMuted));
    }
    return this.isMuted;
  }

  getMuteState() {
    return this.isMuted;
  }

  /**
   * Check if sound was already played for this stay and stage
   * Uses sessionStorage so it persists across page transitions but resets on new session
   */
  hasAlertRung(stayId, alertType) {
    if (typeof window === 'undefined') return false;
    try {
      return sessionStorage.getItem(`nx_bell_${stayId}_${alertType}`) === 'true';
    } catch (e) {
      return false;
    }
  }

  /**
   * Mark alert as played so it NEVER rings again for this stay
   */
  markAlertRung(stayId, alertType) {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(`nx_bell_${stayId}_${alertType}`, 'true');
    } catch (e) {}
  }

  /**
   * Plays a high-fidelity hotel front-desk service bell (brass concierge chime)
   * @param {'single' | 'double'} variant
   * 'single': 1 crisp brass bell ring (for 10-minute upcoming reminder)
   * 'double': 2 distinct brass bell rings (for 30-minute overdue alert)
   */
  playHotelBell(variant = 'single') {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      this.pendingVariant = variant;
      ctx.resume().catch(() => {});
      return;
    }

    try {
      const ringDing = (startTime, masterVol = 0.4) => {
        // Physical brass bell acoustic overtone series
        const partials = [
          { ratio: 1.0, gain: 0.35, decay: 2.2 },   // Fundamental crystal chime (~1568Hz / G6)
          { ratio: 0.54, gain: 0.16, decay: 2.5 },  // Warm brass body hum (~846Hz)
          { ratio: 1.52, gain: 0.22, decay: 1.8 },  // Quint overtone (~2383Hz)
          { ratio: 2.01, gain: 0.18, decay: 1.4 },  // High octave resonance (~3151Hz)
          { ratio: 2.76, gain: 0.12, decay: 0.9 },  // Metallic ring shimmer (~4327Hz)
          { ratio: 4.15, gain: 0.08, decay: 0.45 }  // Initial strike impact transient
        ];

        const baseFreq = 1568; // G6 note - crystal clear bright concierge bell

        partials.forEach(({ ratio, gain: partGain, decay }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(baseFreq * ratio, startTime);

          // Fast hammer strike attack (<3ms) followed by natural exponential decay
          gain.gain.setValueAtTime(0.0001, startTime);
          gain.gain.linearRampToValueAtTime(partGain * masterVol, startTime + 0.003);
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + decay);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(startTime);
          osc.stop(startTime + decay + 0.05);
        });
      };

      const now = ctx.currentTime;
      if (variant === 'single') {
        // 10 mins before checkout: 1 classic hotel desk chime
        ringDing(now, 0.4);
      } else if (variant === 'double') {
        // 30 mins overdue: 2 distinct firm hotel desk chimes
        ringDing(now, 0.42);
        ringDing(now + 0.38, 0.48);
      }
    } catch (err) {
      console.warn('Hotel bell alert could not play:', err);
    }
  }

  // Backwards compatibility aliases
  playUpcomingBeep() {
    this.playHotelBell('single');
  }

  playOverdueBeep() {
    this.playHotelBell('double');
  }
}

export const soundAlert = new SoundAlertManager();
export default soundAlert;
