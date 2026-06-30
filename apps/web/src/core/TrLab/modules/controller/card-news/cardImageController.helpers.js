export const cardImageControllerHelpers = {
  makeBlankCardImage(card = {}, selected = 0) {
    const page = card?.page ?? selected + 1;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
<defs><pattern id="grid" width="54" height="54" patternUnits="userSpaceOnUse"><path d="M54 0H0V54" fill="none" stroke="#e2e8f0" stroke-width="2"/></pattern></defs>
<rect width="1080" height="1350" fill="#f8fafc"/>
<rect width="1080" height="1350" fill="url(#grid)" opacity=".65"/>
<rect x="76" y="86" width="928" height="1162" rx="44" fill="#ffffff" stroke="#cbd5e1" stroke-width="4" stroke-dasharray="18 16"/>
</svg>`;
    return {
      id: `blank-${page}`,
      url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
      prompt: card?.visualBrief?.backgroundPrompt || card?.visualPrompt || '',
      provider: 'blank-canvas',
      model: 'manual-workspace'
    };
  },

  copyText(value) {
    return navigator.clipboard?.writeText(`${value ?? ''}`);
  }
};
