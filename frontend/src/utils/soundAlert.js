/**
 * soundAlert.js
 * Ultra-High Volume Hotel Concierge Desk Bell synthesis using Web Audio API.
 * Uses harmonic multi-wave synthesis (Triangle + Sine) + Multi-stage Dynamic Booster
 * to produce maximum room-filling loudness on laptop and mobile speakers without distortion.
 */

class SoundAlertManager {
  constructor() {
    this.ctx = null;
    this.masterOut = null;
    this.isMuted = typeof window !== 'undefined' ? localStorage.getItem('nx_alert_muted') === 'true' : false;
    this.hasInteracted = false;
    this.pendingVariant = null;

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

  /**
   * Multi-stage high-gain mastering chain:
   * High Pre-Amp (3.0x Boost) -> Fast Brickwall Limiter/Compressor -> Output
   * Guarantees maximum acoustic loudness without speaker crackle.
   */
  getOutputNode(ctx) {
    if (!this.masterOut) {
      const preBoost = ctx.createGain();
      preBoost.gain.setValueAtTime(3.0, ctx.currentTime); // 300% loudness boost

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-14, ctx.currentTime);
      compressor.knee.setValueAtTime(8, ctx.currentTime);
      compressor.ratio.setValueAtTime(16, ctx.currentTime);
      compressor.attack.setValueAtTime(0.001, ctx.currentTime);
      compressor.release.setValueAtTime(0.12, ctx.currentTime);

      const postGain = ctx.createGain();
      postGain.gain.setValueAtTime(1.4, ctx.currentTime); // Extra final boost

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
   * Plays a loud, 5-second continuous hotel desk concierge bell sequence
   * @param {'single' | 'double'} variant
   * 'single': 5-second rhythmic melodic concierge chimes (for 10m upcoming checkout)
   * 'double': 5-second loud high-presence urgent double-bell sequence (for 30m overdue checkout)
   */
  playHotelBell(variant = 'double') {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      this.pendingVariant = variant;
      ctx.resume().catch(() => {});
      return;
    }

    try {
      const output = this.getOutputNode(ctx);

      // Single powerful strike of high-presence brass counter bell
      const ringDing = (startTime, pitch = 1175, masterVol = 1.0, decaySec = 2.4) => {
        // Multi-frequency harmonic spectrum:
        // Triangle wave provides rich body harmonics that cut through room noise,
        // Sine wave adds bright crystal overtones.
        const partials = [
          { freq: pitch, type: 'triangle', gain: 0.70, decay: decaySec },           // Primary body (loud punch)
          { freq: pitch * 1.5, type: 'sine', gain: 0.60, decay: decaySec * 0.9 },   // Quint harmonic
          { freq: pitch * 2.0, type: 'sine', gain: 0.50, decay: decaySec * 0.75 },  // Upper chime
          { freq: pitch * 0.5, type: 'triangle', gain: 0.40, decay: decaySec * 1.1 },// Deep brass resonance
          { freq: pitch * 2.76, type: 'sine', gain: 0.35, decay: decaySec * 0.55 }, // Metallic shimmer
          { freq: pitch * 4.15, type: 'triangle', gain: 0.25, decay: 0.4 }          // Crisp hammer transient
        ];

        partials.forEach(({ freq, type, gain: partGain, decay }) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();

          osc.type = type;
          osc.frequency.setValueAtTime(freq, startTime);

          // Instant strike attack (<2ms) and long smooth decay
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
        // 🔔 10-Minute Upcoming Reminder: 5-Second Melodic Concierge Chime Sequence
        // 4 loud, crystal-clear brass chimes across 5.5 seconds
        ringDing(now + 0.0, 1046.5, 1.0, 2.2); // 0.0s (C6 - rich chime)
        ringDing(now + 1.2, 1318.5, 1.0, 2.2); // 1.2s (E6 - melodic harmony)
        ringDing(now + 2.4, 1174.6, 1.0, 2.2); // 2.4s (D6)
        ringDing(now + 3.6, 1568.0, 1.0, 2.8); // 3.6s (G6 - high final chime, rings till ~6.2s)
      } else {
        // 🚨 30-Minute Overdue Alert: 5-Second Loud Urgent Double-Bell Sequence
        // Rapid double dings repeating at 0s, 1.3s, 2.6s, 3.8s through 5.5s
        ringDing(now + 0.0, 1318.5, 1.0, 1.8);
        ringDing(now + 0.32, 1568.0, 1.0, 1.8);

        ringDing(now + 1.3, 1318.5, 1.0, 1.8);
        ringDing(now + 1.62, 1568.0, 1.0, 1.8);

        ringDing(now + 2.6, 1318.5, 1.0, 1.8);
        ringDing(now + 2.92, 1568.0, 1.0, 1.8);

        ringDing(now + 3.9, 1760.0, 1.0, 2.8); // High loud final chime ringing smoothly to 6.5s!
      }
    } catch (err) {
      console.warn('Hotel bell alert could not play:', err);
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
