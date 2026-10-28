// Polls a URL until it answers, then exits. Used by CI because the Playwright
// container is not guaranteed to ship curl, but always ships Node.
const [url, seconds] = [process.argv[2], Number(process.argv[3] || 120)];
const deadline = Date.now() + seconds * 1000;

(async () => {
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (response.ok) {
        console.log(`ready: ${url}`);
        process.exit(0);
      }
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  console.error(`timed out waiting for ${url}`);
  process.exit(1);
})();
