// Audio utility for notification sounds
class AudioAlert {
  private audioContext: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying = false;
  private userInteracted = false;
  private initialized = false;
  private html5Audio: HTMLAudioElement | null = null; // added
  private lastPlayTimestamp = 0; // added
  private minPlayIntervalMs = 1500; // added throttle

  constructor() {
    console.log('🎵 [AudioAlert] Audio alert system initializing...');
    // Try to initialize immediately if possible
    this.tryInitializeAudio();
    // Set up user interaction listeners as backup
    this.setupUserInteractionListener();
    console.log('🎵 [AudioAlert] Audio alert system initialized');
  }

  // Try to initialize audio immediately (works if user has already interacted)
  private async tryInitializeAudio() {
    if (this.initialized) return;
    
    try {
      console.log('🎵 [AudioAlert] Attempting immediate audio initialization...');
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (this.audioContext.state === 'running') {
        this.userInteracted = true;
        this.initialized = true;
        console.log('✅ [AudioAlert] Audio context ready immediately!');
      } else {
        console.log('🎵 [AudioAlert] Audio context created but suspended:', this.audioContext.state);
      }
    } catch (error) {
      console.log('⚠️ [AudioAlert] Immediate initialization failed, will wait for user interaction:', error);
    }

    // Prepare HTML5 fallback element early
    this.ensureHtml5Audio();
  }

  private async initAudioContext() {
    try {
      if (!this.audioContext) {
        console.log('❌ [AudioAlert] No audio context - user interaction required first');
        return false;
      }
      
      // Resume audio context if it's suspended
      if (this.audioContext.state === 'suspended') {
        console.log('🎵 [AudioAlert] Resuming suspended audio context...');
        await this.audioContext.resume();
        console.log('🎵 [AudioAlert] Audio context resumed, state:', this.audioContext.state);
      }
      
      return this.audioContext.state === 'running';
    } catch (error) {
      console.error('❌ [AudioAlert] Failed to initialize audio context:', error);
      return false;
    }
  }

  // Initialize audio on first user interaction
  private setupUserInteractionListener() {
    if (this.userInteracted || this.initialized) return;

    const handleInteraction = async (event: Event) => {
      console.log('👆 [AudioAlert] User interaction detected:', event.type);
      
      try {
        // Create audio context INSIDE the user gesture event handler
        if (!this.audioContext) {
          console.log('🎵 [AudioAlert] Creating AudioContext within user gesture...');
          this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          console.log('🎵 [AudioAlert] AudioContext created, state:', this.audioContext.state);
        }
        
        // Resume if suspended
        if (this.audioContext.state === 'suspended') {
          console.log('🎵 [AudioAlert] Resuming AudioContext...');
          await this.audioContext.resume();
          console.log('🎵 [AudioAlert] AudioContext resumed, state:', this.audioContext.state);
        }
        
        if (this.audioContext.state === 'running') {
          this.userInteracted = true;
          this.initialized = true;
          console.log('✅ [AudioAlert] Audio ready for playback after user interaction (no test beep).');
        } else {
          console.error('❌ [AudioAlert] AudioContext not running after user interaction:', this.audioContext.state);
        }
      } catch (error) {
        console.error('❌ [AudioAlert] Failed to create AudioContext in user gesture:', error);
      }
    };

    // Listen for multiple types of interactions with more aggressive approach
    const events = ['click', 'keydown', 'touchstart', 'mousedown', 'pointerdown'];
    
    events.forEach(eventType => {
      document.addEventListener(eventType, handleInteraction, { 
        once: true, 
        passive: false,
        capture: true 
      });
    });
    
    console.log('🎵 [AudioAlert] Listening for user interactions to enable audio:', events);
  }

  // Create or reuse a lightweight HTML5 <audio> element with an embedded beep
  private ensureHtml5Audio() {
    if (this.html5Audio) return;
    try {
      const beepData = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAAA//////////////////////////8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA';
      const audio = new Audio(beepData);
      audio.preload = 'auto';
      audio.volume = 0.6;
      this.html5Audio = audio;
      console.log('🎵 [AudioAlert] HTML5 fallback audio prepared');
    } catch (e) {
      console.warn('⚠️ [AudioAlert] Failed to prepare HTML5 audio fallback', e);
    }
  }

  private throttled(): boolean {
    const now = Date.now();
    if (now - this.lastPlayTimestamp < this.minPlayIntervalMs) {
      console.log('⏱️ [AudioAlert] Sound throttled to prevent duplicates');
      return true;
    }
    this.lastPlayTimestamp = now;
    return false;
  }

  async playNotificationSound(duration: number = 2500) {
    if (this.throttled()) return;
    if (this.isPlaying) {
      console.log('🔇 [AudioAlert] Already playing, skipping notification sound');
      return;
    }

    // User interaction is already set up in constructor

    try {
      console.log('🎵 [AudioAlert] Attempting to play notification sound...');
      
      if (!this.userInteracted) {
        console.log('⚠️ [AudioAlert] Waiting for user interaction before playing sound...');
        return;
      }
      
      const success = await this.initAudioContext();
      if (!success || !this.audioContext) {
        console.error('❌ [AudioAlert] Audio context not ready');
        throw new Error('Audio context not available');
      }

      if (this.audioContext.state !== 'running') {
        console.error('❌ [AudioAlert] Audio context not running:', this.audioContext.state);
        throw new Error('Audio context not running');
      }

      this.isPlaying = true;
      console.log('🎵 [AudioAlert] Creating notification sound...');

      // Create oscillator for the sound
      this.oscillator = this.audioContext.createOscillator();
      this.gainNode = this.audioContext.createGain();

      // Connect nodes
      this.oscillator.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

      // Configure sound (notification bell-like tone)
      this.oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
      this.oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime + 0.1);
      this.oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime + 0.2);
      this.oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime + 0.3);
      
      // Set volume (loud but not overwhelming)
      this.gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
      this.gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration / 1000);

      // Start and stop the sound
      this.oscillator.start(this.audioContext.currentTime);
      this.oscillator.stop(this.audioContext.currentTime + duration / 1000);

      console.log('✅ [AudioAlert] Notification sound started');

      // Clean up after sound ends
      this.oscillator.onended = () => {
        console.log('🎵 [AudioAlert] Notification sound ended');
        this.isPlaying = false;
        this.oscillator = null;
        this.gainNode = null;
      };

    } catch (error) {
      console.error('❌ [AudioAlert] Error playing notification sound:', error);
      this.isPlaying = false;
      // Fallback to HTML5 audio
      await this.playHtml5Fallback();
    }
  }

  async playBookingSound(duration: number = 4000): Promise<boolean> {
    if (this.throttled()) return false;
    if (this.isPlaying) {
      console.log('🔇 [AudioAlert] Already playing, skipping booking sound');
      return false;
    }

    // User interaction is already set up in constructor

    try {
      console.log('🚨 [AudioAlert] Attempting to play URGENT booking sound...');
      
      if (!this.userInteracted) {
        console.log('⚠️ [AudioAlert] Waiting for user interaction before playing booking sound...');
        return false;
      }
      
      // Check if page is visible - important for background tab audio
      const isPageVisible = document.visibilityState === 'visible';
      console.log('👁️ [AudioAlert] Page visibility state:', document.visibilityState, 'isVisible:', isPageVisible);
      
      const success = await this.initAudioContext();
      if (!success || !this.audioContext) {
        console.error('❌ [AudioAlert] Audio context not ready for booking sound');
        throw new Error('Audio context not available');
      }

      if (this.audioContext.state !== 'running') {
        console.error('❌ [AudioAlert] Audio context not running for booking sound:', this.audioContext.state);
        throw new Error('Audio context not running');
      }

      this.isPlaying = true;
      console.log('🚨 [AudioAlert] Creating URGENT booking alert sound...');

      // Create a much more attention-grabbing sound for booking alerts
      this.oscillator = this.audioContext.createOscillator();
      this.gainNode = this.audioContext.createGain();

      this.oscillator.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

      // Urgent alarm-like pattern - much louder and more distinctive
      this.oscillator.frequency.setValueAtTime(1200, this.audioContext.currentTime);
      this.oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime + 0.15);
      this.oscillator.frequency.setValueAtTime(1200, this.audioContext.currentTime + 0.3);
      this.oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime + 0.45);
      this.oscillator.frequency.setValueAtTime(1200, this.audioContext.currentTime + 0.6);
      this.oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime + 0.75);
      this.oscillator.frequency.setValueAtTime(1200, this.audioContext.currentTime + 0.9);
      this.oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime + 1.05);
      this.oscillator.frequency.setValueAtTime(1200, this.audioContext.currentTime + 1.2);
      this.oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime + 1.35);
      this.oscillator.frequency.setValueAtTime(1200, this.audioContext.currentTime + 1.5);
      this.oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime + 1.65);
      this.oscillator.frequency.setValueAtTime(1200, this.audioContext.currentTime + 1.8);
      this.oscillator.frequency.linearRampToValueAtTime(600, this.audioContext.currentTime + 2.2);

      // Much louder volume - hard to miss!
      this.gainNode.gain.setValueAtTime(0.7, this.audioContext.currentTime);
      this.gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime + 0.1);
      this.gainNode.gain.setValueAtTime(0.7, this.audioContext.currentTime + 0.2);
      this.gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime + 0.3);
      this.gainNode.gain.setValueAtTime(0.7, this.audioContext.currentTime + 0.4);
      this.gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime + 0.5);
      this.gainNode.gain.setValueAtTime(0.7, this.audioContext.currentTime + 0.6);
      this.gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime + 0.7);
      this.gainNode.gain.setValueAtTime(0.7, this.audioContext.currentTime + 0.8);
      this.gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime + 0.9);
      this.gainNode.gain.setValueAtTime(0.7, this.audioContext.currentTime + 1.0);
      this.gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime + 1.1);
      this.gainNode.gain.setValueAtTime(0.7, this.audioContext.currentTime + 1.2);
      this.gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime + 1.3);
      this.gainNode.gain.setValueAtTime(0.7, this.audioContext.currentTime + 1.4);
      this.gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime + 1.5);
      this.gainNode.gain.setValueAtTime(0.7, this.audioContext.currentTime + 1.6);
      this.gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration / 1000);

      this.oscillator.start(this.audioContext.currentTime);
      this.oscillator.stop(this.audioContext.currentTime + duration / 1000);

      console.log('✅ [AudioAlert] URGENT booking sound started');

      this.oscillator.onended = () => {
        console.log('🚨 [AudioAlert] URGENT booking sound completed');
        this.isPlaying = false;
        this.oscillator = null;
        this.gainNode = null;
      };

    } catch (error) {
      console.error('❌ [AudioAlert] Error playing booking sound:', error);
      this.isPlaying = false;
      // Fallback to HTML5 audio
      return await this.playHtml5Fallback();
    }
    return true;
  }

  stop() {
    if (this.oscillator && this.isPlaying) {
      this.oscillator.stop();
      this.isPlaying = false;
    }
  }

  // Test method to verify audio is working
  async testSound() {
    console.log('🧪 [AudioAlert] Testing audio system...');
    console.log('🧪 [AudioAlert] Current status:', this.getStatus());
    
    try {
      await this.playNotificationSound(1000);
      console.log('✅ [AudioAlert] Test sound completed');
      return true;
    } catch (error) {
      console.error('❌ [AudioAlert] Test sound failed:', error);
      return false;
    }
  }

  // Emergency manual audio initialization (silent)
  async emergencyAudioInit() {
    console.log('🚨 [AudioAlert] EMERGENCY AUDIO INIT - Manual activation');
    
    try {
      // Force create new context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('🚨 [AudioAlert] Emergency context created:', this.audioContext.state);
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        console.log('🚨 [AudioAlert] Emergency context resumed:', this.audioContext.state);
      }
      
      this.userInteracted = true;
      this.initialized = true;
      // Unlock iOS by playing a silent buffer
      try {
        const buffer = this.audioContext.createBuffer(1, 1, 22050);
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);
        source.start(0);
      } catch {}
      // Prepare HTML5 audio fallback
      this.ensureHtml5Audio();
      console.log('✅ [AudioAlert] Emergency init successful (silent).');
      return true;
    } catch (error) {
      console.error('❌ [AudioAlert] Emergency init failed:', error);
      return false;
    }
  }

  // Get current audio status
  getStatus() {
    return {
      hasAudioContext: !!this.audioContext,
      audioContextState: this.audioContext?.state,
      userInteracted: this.userInteracted,
      isPlaying: this.isPlaying,
      pageVisibility: document.visibilityState
    };
  }

  // Force resume audio context (useful for background tabs)
  async forceResumeAudio() {
    console.log('🔧 [AudioAlert] Force resuming audio context...');
    
    // Create audio context if it doesn't exist (for real-time events)
    if (!this.audioContext && this.userInteracted) {
      console.log('🔧 [AudioAlert] Creating new AudioContext for force resume...');
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('✅ [AudioAlert] New AudioContext created, state:', this.audioContext.state);
      } catch (error) {
        console.error('❌ [AudioAlert] Failed to create AudioContext:', error);
        return false;
      }
    }
    
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        console.log('✅ [AudioAlert] Audio context force resumed, state:', this.audioContext.state);
        return true;
      } catch (error) {
        console.error('❌ [AudioAlert] Failed to force resume audio:', error);
        return false;
      }
    }
    
    if (this.audioContext && this.audioContext.state === 'running') {
      console.log('✅ [AudioAlert] Audio context already running');
      return true;
    }
    
    console.log('ℹ️ [AudioAlert] Audio context state:', this.audioContext?.state, 'userInteracted:', this.userInteracted);
    return !!this.audioContext && this.audioContext.state === 'running';
  }
  
  // Enhanced booking sound with retry mechanism for real-time events
  async playBookingSoundWithRetry(maxRetries: number = 3) {
    console.log('🚨 [AudioAlert] Playing booking sound with retry mechanism...');
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔊 [AudioAlert] Booking sound attempt ${attempt}/${maxRetries}`);
        
        // Force resume audio before each attempt
        await this.forceResumeAudio();
        
        // Try to play the booking sound
        const ok = await this.playBookingSound();
        if (ok) {
          console.log(`✅ [AudioAlert] Booking sound succeeded on attempt ${attempt}`);
          return true;
        }
        console.log('🔇 [AudioAlert] Booking sound did not start on this attempt');
      } catch (error) {
        console.error(`❌ [AudioAlert] Booking sound attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          console.log(`🔄 [AudioAlert] Waiting before retry...`);
          await new Promise(resolve => setTimeout(resolve, 200 * attempt));
        }
      }
    }
    
    console.error('🔇 [AudioAlert] All booking sound attempts failed; trying HTML5 fallback');
    return await this.playHtml5Fallback();
  }

  // HTML5 <audio> fallback
  private async playHtml5Fallback() {
    try {
      this.ensureHtml5Audio();
      if (!this.html5Audio) return false;
      await this.html5Audio.play();
      console.log('✅ [AudioAlert] HTML5 fallback beep played');
      return true;
    } catch (e) {
      console.error('❌ [AudioAlert] HTML5 fallback failed', e);
      return false;
    }
  }

  // High-level API: attempt WebAudio urgent sound, then fallback
  async playUrgentWithGuarantee() {
    const webSuccess = await this.playBookingSoundWithRetry(3);
    if (webSuccess) return true;
    return await this.playHtml5Fallback();
  }
}

// Create singleton instance
export const audioAlert = new AudioAlert();