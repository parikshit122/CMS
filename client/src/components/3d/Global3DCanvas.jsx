import React, { Component, Suspense, lazy } from 'react';

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

// Lazy-load Three.js background canvas so it never blocks initial DOM paint
const LazyScene = lazy(() =>
  import('./Scene3D').catch(() => ({
    default: () => null,
  }))
);

export default function Global3DCanvas() {
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
