import { Component } from 'react';

class SafeBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // eslint-disable-next-line no-console
    console.error('Render error in SafeBoundary:', error, errorInfo);
  }

  render() {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;
    if (hasError) {
      if (fallback) return fallback;
      return (
        <div className="p-6 text-sm text-rose-600 dark:text-rose-400">
          <p className="font-semibold">Something went wrong rendering this section.</p>
          <p className="mt-1 text-xs opacity-80">{error?.message || String(error)}</p>
        </div>
      );
    }
    return children;
  }
}

export default SafeBoundary;
