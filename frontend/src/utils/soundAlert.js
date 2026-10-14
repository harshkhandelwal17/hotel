/**
 * soundAlert.js
 * High-fidelity, Loud Hotel Concierge Desk Bell synthesis using Web Audio API.
 * Synthesizes ~5 seconds of loud, clear acoustic brass bell chimes with dynamic compression.
 */

class SoundAlertManager {
  constructor() {
    this.ctx = null;
    this.compressor = null;
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

  getOutputNode(ctx) {
    if (!this.compressor) {
      // Hardware-quality dynamic compression to maximize loudness without clipping
      this.compressor = ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-14, ctx.currentTime);
      this.compressor.knee.setValueAtTime(25, ctx.currentTime);
      this.compressor.ratio.setValueAtTime(10, ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.002, ctx.currentTime);
      this.compressor.release.setValueAtTime(0.2, ctx.currentTime);
      this.compressor.connect(ctx.destination);
    }
    return this.compressor;
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
   * 'double': 5-second high-energy urgent double-ring bell sequence (for 30m overdue checkout)
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

      // Single strike of high-presence brass counter bell
      const ringDing = (startTime, pitch = 1568, masterVol = 0.85, decaySec = 2.2) => {
        const partials = [
          { ratio: 1.0, gain: 0.55, decay: decaySec },         // Crisp fundamental G6 (~1568Hz)
          { ratio: 0.50, gain: 0.35, decay: decaySec * 1.1 },   // Deep resonant body (~784Hz)
          { ratio: 1.50, gain: 0.40, decay: decaySec * 0.85 },  // Quint harmonic (~2352Hz)
          { ratio: 2.00, gain: 0.30, decay: decaySec * 0.7 },   // Upper octave (~3136Hz)
          { ratio: 2.75, gain: 0.22, decay: decaySec * 0.5 },   // Brass shimmer (~4312Hz)
          { ratio: 4.05, gain: 0.15, decay: 0.35 }              // Hard strike transient
        ];

        partials.forEach(({ ratio, gain: partGain, decay }) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(pitch * ratio, startTime);

          // Fast hammer strike attack (<2ms) and long smooth decay
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
        // 🔔 10-Minute Upcoming Reminder: 5-Second Concierge Melodic Chime Sequence
        // 4 ringing chimes across 5.2 seconds
        ringDing(now + 0.0, 1568, 0.85, 2.0); // 0.0s (Ding 1)
        ringDing(now + 1.2, 1760, 0.88, 2.0); // 1.2s (Ding 2)
        ringDing(now + 2.4, 1568, 0.88, 2.0); // 2.4s (Ding 3)
        ringDing(now + 3.6, 2093, 0.95, 2.5); // 3.6s (Ding 4 - high final note, rings till ~6s)
      } else {
        // 🚨 30-Minute Overdue Alert: 5-Second Loud Urgent Double-Bell Sequence
        // Rapid double dings repeating at 0s, 1.3s, 2.6s, 3.8s through 5.5s
        ringDing(now + 0.0, 1760, 0.90, 1.6);
        ringDing(now + 0.35, 1760, 0.95, 1.8);

        ringDing(now + 1.3, 1760, 0.90, 1.6);
        ringDing(now + 1.65, 1760, 0.95, 1.8);

        ringDing(now + 2.7, 1760, 0.90, 1.6);
        ringDing(now + 3.05, 1760, 0.95, 1.8);

        ringDing(now + 4.0, 1975, 1.00, 2.5); // High final alert note rings smoothly through second 5.5-6.0
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
