// Performance Optimization Utilities
class PerformanceOptimizer {
  constructor() {
    this.observers = new Map();
    this.loadedImages = new Set();
    this.deferredTasks = [];
    
    this.init();
  }

  init() {
    this.setupIntersectionObserver();
    this.setupImageLazyLoading();
    this.optimizeScrolling();
    this.setupResourceHints();
    this.measurePerformance();
    this.setupIdleTaskScheduling();
  }

  // Lazy Loading with Intersection Observer
  setupIntersectionObserver() {
    if (!('IntersectionObserver' in window)) {
      console.warn('IntersectionObserver not supported');
      return;
    }

    // Image lazy loading observer
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            this.loadImage(img);
            imageObserver.unobserve(img);
          }
        }
      });
    }, {
      rootMargin: '50px 0px',
      threshold: 0.1
    });

    this.observers.set('images', imageObserver);

    // Component lazy loading observer
    const componentObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const component = entry.target;
          if (component.dataset.component) {
            this.loadComponent(component);
            componentObserver.unobserve(component);
          }
        }
      });
    }, {
      rootMargin: '100px 0px',
      threshold: 0.1
    });

    this.observers.set('components', componentObserver);
  }

  setupImageLazyLoading() {
    // Find all images with data-src attribute
    const lazyImages = document.querySelectorAll('img[data-src]');
    const imageObserver = this.observers.get('images');

    if (imageObserver) {
      lazyImages.forEach(img => imageObserver.observe(img));
    } else {
      // Fallback for unsupported browsers
      lazyImages.forEach(img => this.loadImage(img));
    }
  }

  loadImage(img) {
    return new Promise((resolve, reject) => {
      const imageUrl = img.dataset.src;
      if (this.loadedImages.has(imageUrl)) {
        img.src = imageUrl;
        resolve(img);
        return;
      }

      const tempImg = new Image();
      tempImg.onload = () => {
        img.src = imageUrl;
        img.classList.add('loaded');
        this.loadedImages.add(imageUrl);
        resolve(img);
      };
      tempImg.onerror = () => {
        img.classList.add('error');
        reject(new Error(`Failed to load image: ${imageUrl}`));
      };
      tempImg.src = imageUrl;
    });
  }

  async loadComponent(element) {
    const componentName = element.dataset.component;
    const componentPath = element.dataset.path || `/components/${componentName}.js`;

    try {
      element.innerHTML = '<div class="loading-spinner">Loading...</div>';
      
      const module = await import(componentPath);
      const ComponentClass = module.default || module[componentName];
      
      if (ComponentClass) {
        const component = new ComponentClass(element);
        await component.init();
        element.classList.add('component-loaded');
      }
    } catch (error) {
      console.error(`Failed to load component ${componentName}:`, error);
      element.innerHTML = '<div class="component-error">Failed to load component</div>';
    }
  }

  // Optimize scrolling performance
  optimizeScrolling() {
    let ticking = false;

    const optimizedScrollHandler = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          this.handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    document.addEventListener('scroll', optimizedScrollHandler, { passive: true });
  }

  handleScroll() {
    // Handle scroll-dependent animations and updates
    const scrollY = window.scrollY;
    
    // Update scroll progress indicator
    const progressBar = document.querySelector('.scroll-progress');
    if (progressBar) {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const scrollProgress = (scrollY / maxScroll) * 100;
      progressBar.style.transform = `scaleX(${scrollProgress / 100})`;
    }

    // Parallax effects (if any)
    const parallaxElements = document.querySelectorAll('.parallax');
    parallaxElements.forEach((element) => {
      const speed = element.dataset.speed || 0.5;
      const yPos = scrollY * speed;
      element.style.transform = `translate3d(0, ${yPos}px, 0)`;
    });
  }

  // Setup resource hints for better loading
  setupResourceHints() {
    const head = document.head;

    // DNS prefetch for external resources
    const dnsHints = [
      'https://fonts.googleapis.com',
      'https://api.coingecko.com',
      'https://solana-api.projectserum.com'
    ];

    dnsHints.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = url;
      head.appendChild(link);
    });

    // Preload critical resources
    this.preloadCriticalResources();
  }

  preloadCriticalResources() {
    const criticalResources = [
      { href: '/css/critical.css', as: 'style' },
      { href: '/js/wallet.js', as: 'script' },
      { href: '/fonts/inter-var.woff2', as: 'font', type: 'font/woff2', crossorigin: true }
    ];

    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      Object.assign(link, resource);
      document.head.appendChild(link);
    });
  }

  // Performance measurement
  measurePerformance() {
    if (!('performance' in window)) return;

    // Core Web Vitals
    this.measureLCP();
    this.measureFID();
    this.measureCLS();

    // Custom metrics
    this.measureCustomMetrics();
  }

  measureLCP() {
    if (!('PerformanceObserver' in window)) return;

    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      console.log('LCP:', lastEntry.startTime);
      this.reportMetric('LCP', lastEntry.startTime);
    }).observe({ entryTypes: ['largest-contentful-paint'] });
  }

  measureFID() {
    if (!('PerformanceObserver' in window)) return;

    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        console.log('FID:', entry.processingStart - entry.startTime);
        this.reportMetric('FID', entry.processingStart - entry.startTime);
      }
    }).observe({ entryTypes: ['first-input'] });
  }

  measureCLS() {
    if (!('PerformanceObserver' in window)) return;

    let clsValue = 0;
    let sessionValue = 0;
    let sessionEntries = [];

    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!entry.hadRecentInput) {
          const firstSessionEntry = sessionEntries[0];
          const lastSessionEntry = sessionEntries[sessionEntries.length - 1];

          if (sessionValue && entry.startTime - lastSessionEntry.startTime < 1000 && 
              entry.startTime - firstSessionEntry.startTime < 5000) {
            sessionValue += entry.value;
            sessionEntries.push(entry);
          } else {
            sessionValue = entry.value;
            sessionEntries = [entry];
          }

          if (sessionValue > clsValue) {
            clsValue = sessionValue;
            console.log('CLS:', clsValue);
            this.reportMetric('CLS', clsValue);
          }
        }
      }
    }).observe({ entryTypes: ['layout-shift'] });
  }

  measureCustomMetrics() {
    // Time to Interactive
    window.addEventListener('load', () => {
      setTimeout(() => {
        const tti = performance.now();
        console.log('TTI:', tti);
        this.reportMetric('TTI', tti);
      }, 0);
    });

    // Wallet Load Time
    const walletLoadStart = performance.now();
    window.addEventListener('wallet-loaded', () => {
      const walletLoadTime = performance.now() - walletLoadStart;
      console.log('Wallet Load Time:', walletLoadTime);
      this.reportMetric('wallet_load_time', walletLoadTime);
    });
  }

  reportMetric(name, value) {
    // Send to analytics service
    if (window.gtag) {
      gtag('event', 'performance_metric', {
        metric_name: name,
        metric_value: Math.round(value),
        custom_parameter: 'celora_performance'
      });
    }

    // Store in local storage for debugging
    const metrics = JSON.parse(localStorage.getItem('performance_metrics') || '{}');
    metrics[name] = {
      value: Math.round(value),
      timestamp: Date.now(),
      url: window.location.pathname
    };
    localStorage.setItem('performance_metrics', JSON.stringify(metrics));
  }

  // Idle task scheduling
  setupIdleTaskScheduling() {
    if ('requestIdleCallback' in window) {
      this.scheduleIdleTasks();
    } else {
      // Fallback for unsupported browsers
      setTimeout(() => this.runDeferredTasks(), 1000);
    }
  }

  scheduleIdleTasks() {
    requestIdleCallback((deadline) => {
      while (deadline.timeRemaining() > 0 && this.deferredTasks.length > 0) {
        const task = this.deferredTasks.shift();
        try {
          task();
        } catch (error) {
          console.error('Deferred task failed:', error);
        }
      }

      if (this.deferredTasks.length > 0) {
        this.scheduleIdleTasks();
      }
    });
  }

  deferTask(task) {
    this.deferredTasks.push(task);
    if (this.deferredTasks.length === 1) {
      this.scheduleIdleTasks();
    }
  }

  runDeferredTasks() {
    while (this.deferredTasks.length > 0) {
      const task = this.deferredTasks.shift();
      try {
        task();
      } catch (error) {
        console.error('Deferred task failed:', error);
      }
    }
  }

  // Image optimization utilities
  getOptimizedImageUrl(originalUrl, width, height, quality = 80) {
    // If using a CDN like Cloudinary or ImageKit
    if (originalUrl.includes('cloudinary')) {
      return originalUrl.replace('/upload/', `/upload/w_${width},h_${height},q_${quality},f_auto/`);
    }

    // For other cases, return original URL
    return originalUrl;
  }

  // Bundle analysis utilities
  analyzeBundleSize() {
    if ('performance' in window && 'getEntriesByType' in performance) {
      const resources = performance.getEntriesByType('resource');
      const jsFiles = resources.filter(r => r.name.endsWith('.js'));
      const cssFiles = resources.filter(r => r.name.endsWith('.css'));

      console.group('Bundle Analysis');
      console.log('JavaScript files:', jsFiles.length);
      console.log('CSS files:', cssFiles.length);
      console.log('Total JS size:', jsFiles.reduce((sum, file) => sum + (file.transferSize || 0), 0));
      console.log('Total CSS size:', cssFiles.reduce((sum, file) => sum + (file.transferSize || 0), 0));
      console.groupEnd();
    }
  }

  // Memory usage monitoring
  monitorMemoryUsage() {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = performance.memory;
        const usage = {
          used: Math.round(memory.usedJSHeapSize / 1048576), // MB
          total: Math.round(memory.totalJSHeapSize / 1048576), // MB
          limit: Math.round(memory.jsHeapSizeLimit / 1048576) // MB
        };

        console.log('Memory usage:', usage);

        // Alert if memory usage is high
        if (usage.used / usage.limit > 0.8) {
          console.warn('High memory usage detected:', usage);
        }
      }, 30000); // Check every 30 seconds
    }
  }

  // Cleanup
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.deferredTasks.length = 0;
  }
}

// Initialize performance optimizer
document.addEventListener('DOMContentLoaded', () => {
  window.performanceOptimizer = new PerformanceOptimizer();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceOptimizer;
}
