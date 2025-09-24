import {
  Component,
  type GetDerivedStateFromError,
  type PropsWithChildren,
} from "react";

export type ErrorBoundaryState = {
  error?: unknown;
};

export class ErrorBoundary extends Component<
  PropsWithChildren,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {};

  static getDerivedStateFromError: GetDerivedStateFromError<
    PropsWithChildren,
    ErrorBoundaryState
  > = (error) => ({ error });

  componentDidCatch(error: Error) {
    this.setState({ error });
  }

  render() {
    const {
      state: { error },
      props: { children },
    } = this;

    return "error" in this.state ? (
      <div>
        <p>An unhandled error occurred:</p>
        <blockquote>
          <code>
            {error instanceof Error
              ? error.message
              : typeof error === "string"
                ? error
                : JSON.stringify(error)}
          </code>
        </blockquote>
      </div>
    ) : (
      children
    );
  }
}
