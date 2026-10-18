import { useCallback, useEffect, useEffectEvent, useState } from "react";

/**
 * Load data when `key` changes and expose a `reload` function.
 *
 *   const { data, error, loading, reload } = useResource(projectId, () =>
 *     projectService.get(projectId)
 *   );
 *
 * - `key` identifies what is being loaded; a new key starts a fresh load.
 * - `reload()` refetches in the background without blanking the screen.
 * - A response that arrives after the key changed or the page unmounted is
 *   ignored, so slow requests can never overwrite newer data.
 */
function useResource(key, fetcher) {
  const [state, setState] = useState({ key: null, data: null, error: "" });
  const [version, setVersion] = useState(0);

  // Always calls the latest fetcher without becoming an effect dependency.
  const run = useEffectEvent(fetcher);

  useEffect(() => {
    let active = true;

    run()
      .then((data) => {
        if (active) setState({ key, data, error: "" });
      })
      .catch((error) => {
        if (active) {
          setState((previous) => ({
            key,
            data: previous.key === key ? previous.data : null,
            error: error.message || "Unable to load this page.",
          }));
        }
      });

    return () => {
      active = false;
    };
  }, [key, version]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);

  const isCurrent = state.key === key;

  return {
    data: isCurrent ? state.data : null,
    error: isCurrent ? state.error : "",
    loading: !isCurrent,
    reload,
  };
}

export default useResource;
