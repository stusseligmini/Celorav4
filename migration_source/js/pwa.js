// PWA Installation and Management
class PWAInstaller {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.isStandalone = false;
    
    this.init();
  }

  init() {
    this.registerServiceWorker();
    this.setupInstallPrompt();
    this.detectStandalone();
    this.setupUpdateHandler();
    this.createInstallButton();
  }

  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });

        console.log('✅ Service Worker registered:', registration.scope);

        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                this.showUpdateAvailable();
              }
            });
          }
        });

      } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
      }
    }
  }

  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('💡 PWA install prompt available');
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallButton();
    });

    window.addEventListener('appinstalled', () => {
      console.log('✅ PWA was installed');
      this.isInstalled = true;
      this.hideInstallButton();
      this.showInstalledMessage();
    });
  }

  detectStandalone() {
    // Check if running as PWA
    this.isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    if (this.isStandalone) {
      document.body.classList.add('pwa-standalone');
      console.log('📱 Running as PWA');
    }
  }

  createInstallButton() {
    // Create install button container
    const installContainer = document.createElement('div');
    installContainer.id = 'pwa-install-container';
    installContainer.innerHTML = `
      <div id="pwa-install-banner" class="pwa-banner hidden">
        <div class="pwa-banner-content">
          <div class="pwa-banner-icon">📱</div>
          <div class="pwa-banner-text">
            <h4>Install Celora App</h4>
            <p>Get faster access and offline support</p>
          </div>
          <div class="pwa-banner-actions">
            <button id="pwa-install-btn" class="btn-primary">Install</button>
            <button id="pwa-dismiss-btn" class="btn-secondary">Maybe Later</button>
          </div>
        </div>
      </div>
      
      <div id="pwa-update-banner" class="pwa-banner pwa-update hidden">
        <div class="pwa-banner-content">
          <div class="pwa-banner-icon">🔄</div>
          <div class="pwa-banner-text">
            <h4>Update Available</h4>
            <p>A new version of Celora is ready</p>
          </div>
          <div class="pwa-banner-actions">
            <button id="pwa-update-btn" class="btn-primary">Update Now</button>
            <button id="pwa-update-dismiss-btn" class="btn-secondary">Later</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(installContainer);
    this.setupEventListeners();
    this.addPWAStyles();
  }

  setupEventListeners() {
    // Install button
    document.getElementById('pwa-install-btn')?.addEventListener('click', () => {
      this.installPWA();
    });

    // Dismiss install banner
    document.getElementById('pwa-dismiss-btn')?.addEventListener('click', () => {
      this.hideInstallButton();
      localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    });

    // Update button
    document.getElementById('pwa-update-btn')?.addEventListener('click', () => {
      this.updatePWA();
    });

    // Dismiss update banner
    document.getElementById('pwa-update-dismiss-btn')?.addEventListener('click', () => {
      this.hideUpdateBanner();
    });
  }

  setupUpdateHandler() {
    let refreshing = false;

    // Listen for controlling service worker changes
    navigator.serviceWorker?.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }

  async installPWA() {
    if (!this.deferredPrompt) return;

    try {
      const result = await this.deferredPrompt.prompt();
      console.log('📱 Install prompt result:', result.outcome);

      if (result.outcome === 'accepted') {
        this.hideInstallButton();
      }

      this.deferredPrompt = null;
    } catch (error) {
      console.error('❌ Install prompt failed:', error);
    }
  }

  async updatePWA() {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        this.hideUpdateBanner();
      }
    } catch (error) {
      console.error('❌ Update failed:', error);
    }
  }

  showInstallButton() {
    // Don't show if recently dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) {
      return; // Wait 7 days before showing again
    }

    const banner = document.getElementById('pwa-install-banner');
    if (banner && !this.isInstalled && !this.isStandalone) {
      banner.classList.remove('hidden');
      
      // Auto-hide after 10 seconds
      setTimeout(() => {
        if (banner && !banner.classList.contains('hidden')) {
          banner.classList.add('hidden');
        }
      }, 10000);
    }
  }

  hideInstallButton() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) {
      banner.classList.add('hidden');
    }
  }

  showUpdateAvailable() {
    const banner = document.getElementById('pwa-update-banner');
    if (banner) {
      banner.classList.remove('hidden');
    }
  }

  hideUpdateBanner() {
    const banner = document.getElementById('pwa-update-banner');
    if (banner) {
      banner.classList.add('hidden');
    }
  }

  showInstalledMessage() {
    // Show a temporary success message
    const message = document.createElement('div');
    message.className = 'pwa-success-message';
    message.innerHTML = `
      <div class="pwa-success-content">
        <div class="pwa-success-icon">✅</div>
        <div>Celora app installed successfully!</div>
      </div>
    `;
    
    document.body.appendChild(message);
    
    setTimeout(() => {
      message.remove();
    }, 3000);
  }

  addPWAStyles() {
    const styles = `
      <style id="pwa-styles">
        .pwa-banner {
          position: fixed;
          bottom: 20px;
          left: 20px;
          right: 20px;
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          color: white;
          border-radius: 12px;
          box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
          z-index: 10000;
          animation: slideUp 0.3s ease-out;
          max-width: 400px;
          margin: 0 auto;
        }

        .pwa-banner.hidden {
          display: none;
        }

        .pwa-banner.pwa-update {
          background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
          box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
        }

        .pwa-banner-content {
          display: flex;
          align-items: center;
          padding: 16px;
          gap: 12px;
        }

        .pwa-banner-icon {
          font-size: 24px;
          flex-shrink: 0;
        }

        .pwa-banner-text {
          flex: 1;
          min-width: 0;
        }

        .pwa-banner-text h4 {
          margin: 0 0 4px 0;
          font-size: 16px;
          font-weight: 600;
        }

        .pwa-banner-text p {
          margin: 0;
          font-size: 14px;
          opacity: 0.9;
        }

        .pwa-banner-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }

        .pwa-banner .btn-primary {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 6px;
          padding: 8px 16px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .pwa-banner .btn-primary:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .pwa-banner .btn-secondary {
          background: transparent;
          color: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          padding: 8px 16px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .pwa-banner .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .pwa-success-message {
          position: fixed;
          top: 20px;
          right: 20px;
          background: #10B981;
          color: white;
          border-radius: 8px;
          padding: 16px;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
          z-index: 10001;
          animation: slideDown 0.3s ease-out;
        }

        .pwa-success-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .pwa-success-icon {
          font-size: 20px;
        }

        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        /* PWA-specific styles */
        .pwa-standalone {
          padding-top: env(safe-area-inset-top);
          padding-bottom: env(safe-area-inset-bottom);
        }

        @media (max-width: 768px) {
          .pwa-banner {
            left: 10px;
            right: 10px;
            bottom: 10px;
          }

          .pwa-banner-content {
            padding: 12px;
            gap: 10px;
          }

          .pwa-banner-text h4 {
            font-size: 14px;
          }

          .pwa-banner-text p {
            font-size: 12px;
          }

          .pwa-banner .btn-primary,
          .pwa-banner .btn-secondary {
            padding: 6px 12px;
            font-size: 12px;
          }
        }
      </style>
    `;

    document.head.insertAdjacentHTML('beforeend', styles);
  }

  // Utility methods for other parts of the app
  isRunningAsPWA() {
    return this.isStandalone;
  }

  canInstall() {
    return this.deferredPrompt !== null;
  }

  getInstallationStatus() {
    return {
      canInstall: this.canInstall(),
      isInstalled: this.isInstalled,
      isStandalone: this.isStandalone
    };
  }
}

// Initialize PWA when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.pwaInstaller = new PWAInstaller();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PWAInstaller;
}
