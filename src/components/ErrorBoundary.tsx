import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 bg-red-50 text-red-900 h-screen overflow-auto">
                    <h1 className="text-xl font-bold mb-4">Something went wrong</h1>
                    <p className="font-semibold">{this.state.error?.toString()}</p>
                    <pre className="mt-4 text-xs bg-red-100 p-2 rounded overflow-x-auto">
                        {this.state.errorInfo?.componentStack}
                    </pre>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 px-4 py-3 bg-red-600 text-white rounded-lg w-full"
                    >
                        Reload App
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
