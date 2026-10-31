// Turns text copied from a Udemy "Course content" list into sections and lessons.
// Handles both the public course page and the in-course sidebar formats.
(function (root) {
  const NOISE = /^(preview|play|expand all sections|collapse all sections|course content|resources?|start|resume|show more|show less|\d+ more sections?|\d+ sections?\b.*)$/i;
  const META = /^(\d+\s+(lectures?|lessons?|clases?|lecciones?)\b|\d+\s*\/\s*\d+\s*(\||$))/i;
  const SECTION = /^(section|secci[oó]n)\s+\d+\s*[:.\-–]\s*(.+)$/i;
  const DURATION = /^(\d{1,2}:)?\d{1,2}:\d{2}$|^(\d+\s*(h|hr|hrs|hours?)\s*)?(\d+\s*(m|min|mins|minutes?))?$/i;
  const INLINE_DURATION = /\s+((\d{1,2}:)?\d{1,2}:\d{2}|\d+\s*min)\s*$/i;

  function toMinutes(s) {
    s = s.trim().toLowerCase();
    if (/:/.test(s)) {
      const p = s.split(':').map(Number);
      const secs = p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1];
      return Math.max(1, Math.round(secs / 60));
    }
    const h = s.match(/(\d+)\s*(h|hr|hrs|hour)/);
    const m = s.match(/(\d+)\s*m/);
    return (h ? +h[1] * 60 : 0) + (m ? +m[1] : 0);
  }

  function isDuration(line) {
    return line.length > 0 && DURATION.test(line) && /\d/.test(line);
  }

  function parseCurriculum(text) {
    const lines = String(text || '')
      .split(/\r?\n/)
      .map((l) => l.replace(/\s+/g, ' ').trim())
      .filter((l) => l && !NOISE.test(l));

    const sections = [];
    let current = null;
    const ensureSection = () => {
      if (!current) {
        current = { title: 'Lessons', lessons: [] };
        sections.push(current);
      }
      return current;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const next = lines[i + 1] || '';
      const sec = line.match(SECTION);

      if (sec || (META.test(next) && !isDuration(line))) {
        current = { title: sec ? sec[2].trim() : line, lessons: [] };
        sections.push(current);
        continue;
      }
      if (META.test(line)) continue;

      if (isDuration(line)) {
        const s = ensureSection();
        const last = s.lessons[s.lessons.length - 1];
        if (last && !last.min) last.min = toMinutes(line);
        continue;
      }

      let title = line;
      let min = 0;
      const inline = title.match(INLINE_DURATION);
      if (inline) {
        min = toMinutes(inline[1]);
        title = title.slice(0, inline.index).trim();
      }
      title = title.replace(/^\d+\.\s*/, '').trim();
      if (!title) continue;
      ensureSection().lessons.push({ title, min });
    }

    return sections.filter((s) => s.lessons.length > 0);
  }

  function titleFromUrl(url) {
    const m = String(url || '').match(/udemy\.com\/course\/([^/?#]+)/i);
    if (!m) return '';
    return m[1].split('-').map((w) => (w.length <= 3 && /aws|ccp|saa/i.test(w) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1))).join(' ');
  }

  const api = { parseCurriculum, titleFromUrl, toMinutes };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Parser = api;
})(this);
