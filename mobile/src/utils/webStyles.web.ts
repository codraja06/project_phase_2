export function installWebStyles() {
  const style = document.createElement('style');
  style.textContent = `
    html, body, #root { height: 100%; width: 100%; margin: 0; padding: 0; background: #FAF6F2; }
    #root { display: flex; flex-direction: column; min-height: 100dvh; }
    body { font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, "Nirmala UI", "Noto Sans Tamil", Roboto, sans-serif; color: #281E23; }
    input, textarea, button { font-family: inherit; }
    :focus-visible { outline: 3px solid #BE2638 !important; outline-offset: 3px; }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 0.01ms !important; animation-delay: 0ms !important; transition-duration: 0.01ms !important; }
    }
  `;
  document.head.appendChild(style);
}
