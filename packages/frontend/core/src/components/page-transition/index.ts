import './page-transition.css';

type StartViewTransition = (callback: () => void | Promise<void>) => {
  ready: Promise<void>;
  finished: Promise<void>;
  updateCallbackDone: Promise<void>;
};

/**
 * A transition gets skipped (its promises reject with `AbortError:
 * Transition was skipped ...`) whenever a newer transition starts or the
 * document is hidden — e.g. rapid navigations during initial load. That is
 * expected, but an unobserved rejection surfaces as an uncaught runtime
 * error (and triggers the dev-server error overlay), so swallow it here and
 * only log unexpected failures.
 */
const ignoreSkippedTransition = (promise: Promise<void> | undefined) => {
  promise?.catch((err: unknown) => {
    if ((err as DOMException | null)?.name !== 'AbortError') {
      console.error('page flip transition failed:', err);
    }
  });
};

export function withPageFlipTransition(callback: () => void): void {
  const start = (
    typeof document !== 'undefined'
      ? (document as Document & { startViewTransition?: StartViewTransition })
          .startViewTransition
      : undefined
  )?.bind(document);

  if (!start) {
    callback();
    return;
  }

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    callback();
    return;
  }

  const transition = start(() => {
    callback();
  });
  ignoreSkippedTransition(transition.ready);
  ignoreSkippedTransition(transition.finished);
  ignoreSkippedTransition(transition.updateCallbackDone);
}
