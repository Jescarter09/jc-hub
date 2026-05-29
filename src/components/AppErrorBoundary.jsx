import { Component } from 'react';
import ServerError from '../pages/ServerError';

export default class AppErrorBoundary extends Component {
  state = {
    hasError: false
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(previousProps) {
    if (this.state.hasError && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  componentDidCatch(error, info) {
    console.error('Erreur application JC Hub:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return <ServerError boundary />;
    }

    return this.props.children;
  }
}
