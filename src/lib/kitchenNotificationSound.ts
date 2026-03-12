/**
 * Plays a ~2 second notification chime when a new order is created in the kitchen view.
 * Uses Web Audio API - no external audio files required.
 */
export function playNewOrderNotificationSound(): void {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    const playTone = (frequency: number, startTime: number, duration: number, volume: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.02);
      gainNode.gain.setValueAtTime(volume, startTime + duration * 0.3);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    const play = () => {
      // Two-tone chime: C5 (523 Hz) then E5 (659 Hz), total ~2 seconds
      playTone(523.25, 0, 0.6, 0.25);
      playTone(659.25, 0.4, 1.6, 0.2);
    };

    if (audioContext.state === 'suspended') {
      audioContext.resume().then(play);
    } else {
      play();
    }
  } catch {
    // Silently ignore if Web Audio API is not supported or fails
  }
}
