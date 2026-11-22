import React, { Component, Suspense, lazy, useEffect, useState } from 'react';

class Canvas3DErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    if (import.meta.env.DEV) {
      console.warn('[Global3DCanvas] Render error — hiding 3D background:', error.message);
    }
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

// Lazy-load Three.js background canvas only after first paint/idle so startup never hitches
const LazyScene = lazy(() =>
  import('./Scene3D').catch(() => ({
    default: () => null,
  }))
);

export default function Global3DCanvas() {
  const [shouldMount, setShouldMount] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return undefined;
    }

    let idleId;
    let timerId;
    const enable = () => setShouldMount(true);

    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(enable, { timeout: 900 });
    } else {
      timerId = window.setTimeout(enable, 650);
    }

    return () => {
      if (idleId && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timerId) {
        window.clearTimeout(timerId);
      }
    };
  }, []);

  if (!shouldMount) return null;

  return (
    <Canvas3DErrorBoundary>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: -100,
          pointerEvents: 'none',
        }}
      >
        <Suspense fallback={null}>
          <LazyScene />
        </Suspense>
      </div>
    </Canvas3DErrorBoundary>
  );
}
