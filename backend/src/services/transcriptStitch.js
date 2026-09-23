function stitchTranscripts(parts) {
  let result = '';

  for (const part of parts) {
    const text = String(part || '').trim();
    if (!text) continue;
    if (!result) {
      result = text;
      continue;
    }

    const prevWords = result.split(/\s+/).slice(-12).join(' ');
    const window = text.slice(0, 1200);
    const at = prevWords ? window.indexOf(prevWords) : -1;
    if (at >= 0) {
      const remainder = text.slice(at + prevWords.length).trim();
      result = remainder ? `${result.trimEnd()}\n\n${remainder}` : result;
    } else {
      result = `${result.trimEnd()}\n\n${text}`;
    }
  }

  return result.trim();
}

module.exports = { stitchTranscripts };
