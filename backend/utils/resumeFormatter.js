const SECTION_ORDER = ['Summary', 'Technical Skills', 'Experience', 'Projects', 'Education'];

const SECTION_ALIASES = {
  summary: 'Summary',
  'professional summary': 'Summary',
  profile: 'Summary',
  objective: 'Summary',
  skills: 'Technical Skills',
  'technical skills': 'Technical Skills',
  technologies: 'Technical Skills',
  'core competencies': 'Technical Skills',
  experience: 'Experience',
  'work experience': 'Experience',
  employment: 'Experience',
  'professional experience': 'Experience',
  projects: 'Projects',
  'key projects': 'Projects',
  education: 'Education',
  academics: 'Education',
};

const cleanLine = (line) => line.replace(/\s+/g, ' ').trim();

const slugify = (text, fallback = 'candidate') => {
  const slug = cleanLine(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return slug || fallback;
};

const normalizeUrl = (url) => {
  const cleaned = cleanLine(url || '').replace(/[),.;]+$/g, '');
  if (!cleaned) return '';
  if (/^(https?:\/\/|mailto:|tel:)/i.test(cleaned)) return cleaned;
  return `https://${cleaned.replace(/^www\./i, '')}`;
};

const markdownLink = (label, url) => `[${label}](${normalizeUrl(url)})`;

const stripCodeFences = (text) =>
  text
    .replace(/^```(?:markdown|md|text)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

const extractCandidateName = (text, fallbackText = '') => {
  const headingMatch = text.match(/^#\s+(.+)$/m);
  if (headingMatch) return cleanLine(headingMatch[1].replace(/\*\*/g, ''));

  const rawLine = [...text.split(/\r?\n/), ...fallbackText.split(/\r?\n/)]
    .map(cleanLine)
    .find((line) => /^[A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){1,3}$/.test(line));

  return rawLine || 'Candidate Name';
};

const extractAddress = (combinedText) => {
  const contactArea = combinedText.split(/\n\s*(?:---|##\s+)/)[0] || combinedText;
  const addressLine = combinedText
    ? contactArea
    .split(/\r?\n/)
    .map(cleanLine)
    .find((line) => {
      if (!line || line.includes('@') || /https?:\/\/|linkedin\.com|github\.com|leetcode\.com/i.test(line)) return false;
      return /\b(address|location)\b\s*:/i.test(line) ||
        /\b\d{5,6}\b/.test(line);
    })
    : '';

  if (!addressLine) return '';
  return addressLine.replace(/^(address|location)\s*:\s*/i, '').replace(/\s*\|\s*/g, ', ');
};

const extractUrl = (combinedText, regex) => {
  const match = combinedText.match(regex);
  return match ? match[0].trim().replace(/[),.;]+$/g, '') : '';
};

const extractContactLine = (text, fallbackText = '') => {
  const combinedText = text + '\n' + fallbackText;
  
  const emailMatch = combinedText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const email = emailMatch ? emailMatch[0].trim() : 'candidate@email.com';

  const phoneMatch = combinedText.match(/(?:\+?\d[\d\s().-]{7,}\d)/);
  const phone = phoneMatch ? phoneMatch[0].trim() : '+1 (555) 019-2834';

  const name = extractCandidateName(text, fallbackText);
  const slug = slugify(name);
  const linkedin = extractUrl(combinedText, /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[^\s|)]+/i) || `linkedin.com/in/${slug}`;
  const github = extractUrl(combinedText, /(?:https?:\/\/)?(?:www\.)?github\.com\/[^\s|)]+/i) || `github.com/${slug}`;
  const leetcode = extractUrl(combinedText, /(?:https?:\/\/)?(?:www\.)?leetcode\.com\/(?:u\/)?[^\s|)]+/i) || `leetcode.com/u/${slug}`;
  const portfolioMatch = extractUrl(
    combinedText,
    /(?:https?:\/\/|www\.)[-a-zA-Z0-9@:%._+~#=]{1,256}\.(?:dev|io|me|app|site|tech|co|net|org|com)\b(?:[-a-zA-Z0-9()@:%_+.~#?&//=]*)/i
  );
  const portfolio = /linkedin\.com|github\.com|leetcode\.com/i.test(portfolioMatch) ? '' : portfolioMatch;
  const address = extractAddress(combinedText);

  const contactPieces = [
    markdownLink('Mail', `mailto:${email}`),
    phone,
    markdownLink('LinkedIn', linkedin),
    markdownLink('GitHub', github),
    markdownLink('LeetCode', leetcode),
    portfolio ? markdownLink('Portfolio', portfolio) : markdownLink('Portfolio', `${slug}.dev`),
    address,
  ].filter(Boolean);
  return contactPieces.join(' | ');
};

const extractKnownProjectLinks = (combinedText) => {
  const matches = combinedText.match(/(?:https?:\/\/|www\.)[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi) || [];
  return [...new Set(matches.map(normalizeUrl))]
    .filter((url) => !/linkedin\.com|leetcode\.com/i.test(url))
    .sort((a, b) => Number(!/github\.com/i.test(a)) - Number(!/github\.com/i.test(b)))
    .slice(0, 8);
};

const canonicalSectionName = (heading) => {
  const key = heading.toLowerCase().replace(/[#:*]/g, '').trim();
  return SECTION_ALIASES[key] || null;
};

const boldHeadingSegments = (line) => {
  const match = line.trim().match(/^(#{3,4})\s+(.+)$/);
  if (!match) return line;
  const level = match[1] === '####' ? '###' : match[1];
  const content = match[2];
  const segments = content.split('|').map((segment) => {
    const trimmed = segment.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      return trimmed;
    }
    const cleaned = trimmed.replace(/\*\*/g, '');
    return `**${cleaned}**`;
  });
  return `${level} ${segments.filter(Boolean).join(' | ')}`;
};

const normalizeBullets = (lines, section) => {
  const normalized = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed === '---') return;

    if (/^#{3,4}\s+/.test(trimmed)) {
      normalized.push(boldHeadingSegments(trimmed));
      return;
    }

    if (/^#{1,2}\s+/.test(trimmed)) {
      normalized.push(trimmed);
      return;
    }

    if (/^-\s+/.test(trimmed)) {
      normalized.push(trimmed);
      return;
    }

    if (/^(\*|•|–|—)\s+/.test(trimmed)) {
      normalized.push(`- ${trimmed.replace(/^(\*|•|–|—)\s+/, '')}`);
      return;
    }

    if (/^\d+[.)]\s+/.test(trimmed)) {
      normalized.push(`- ${trimmed.replace(/^\d+[.)]\s+/, '')}`);
      return;
    }

    if (['Technical Skills', 'Experience', 'Projects', 'Education'].includes(section) && !/^\*?\d{4}/.test(trimmed)) {
      normalized.push(`- ${trimmed}`);
      return;
    }

    normalized.push(trimmed);
  });

  return normalized;
};

const parseSections = (text) => {
  const sections = Object.fromEntries(SECTION_ORDER.map((section) => [section, []]));
  let activeSection = null;
  const preface = [];

  text.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    const headingMatch = trimmed.match(/^#{1,3}\s+(.+)$/) || trimmed.match(/^\*\*(.+)\*\*$/);
    const colonMatch = !headingMatch ? trimmed.match(/^([^:]+):\s*(.*)$/) : null;
    const sectionName = headingMatch
      ? canonicalSectionName(headingMatch[1])
      : canonicalSectionName(colonMatch ? colonMatch[1] : trimmed.replace(/:$/, ''));

    if (sectionName) {
      activeSection = sectionName;
      if (colonMatch?.[2]) sections[sectionName].push(colonMatch[2]);
      return;
    }

    if (!activeSection) {
      if (trimmed && !trimmed.startsWith('#') && !trimmed.includes('|')) preface.push(trimmed);
      return;
    }

    sections[activeSection].push(line);
  });

  if (!sections.Summary.length && preface.length) {
    sections.Summary = preface.slice(0, 4);
  }

  return sections;
};

const ensureProjectLinks = (projectLines, candidateName, fallbackText = '') => {
  const slug = slugify(candidateName);
  const knownProjectLinks = extractKnownProjectLinks(fallbackText);
  const lines = [...projectLines];
  const enhanced = [];
  let projectTitle = '';
  let projectHasLink = false;
  let knownLinkIndex = 0;

  const flushProjectLink = () => {
    if (!projectTitle || projectHasLink) return;
    const projectSlug = slugify(projectTitle, 'project');
    const knownLink = knownProjectLinks[knownLinkIndex++];
    const url = knownLink || `https://github.com/${slug}/${projectSlug}`;
    enhanced.push(`- [Project Link](${url})`);
  };

  lines.forEach((line) => {
    const headingMatch = line.trim().match(/^#{3,4}\s+(.+)$/);
    if (headingMatch) {
      flushProjectLink();
      projectTitle = cleanLine(headingMatch[1].replace(/\|.*$/, ''));
      projectHasLink = /\]\(|https?:\/\/|www\.|github\.com|leetcode\.com/i.test(line);
      enhanced.push(line);
      return;
    }

    if (projectTitle && /\]\(|https?:\/\/|www\.|github\.com|leetcode\.com/i.test(line)) {
      projectHasLink = true;
    }
    enhanced.push(line);
  });

  flushProjectLink();

  if (!enhanced.some((line) => /\]\(|https?:\/\/|www\.|github\.com/i.test(line))) {
    const url = knownProjectLinks[0] || `https://github.com/${slug}/project-repository`;
    enhanced.push(`- [Project Link](${url})`);
  }

  return enhanced;
};

const normalizeResumeMarkdown = (text, fallbackText = '', targetRole = '') => {
  const source = stripCodeFences(String(text || fallbackText || ''));
  const candidateName = extractCandidateName(source, fallbackText);
  const contactLine = extractContactLine(source, fallbackText);
  const sections = parseSections(source);
  sections.Projects = ensureProjectLinks(sections.Projects || [], candidateName, `${source}\n${fallbackText}`);

  sections.Summary = sections.Summary.filter((line) => {
    const cleaned = cleanLine(line);
    return cleaned && cleaned !== candidateName && cleaned !== contactLine && !cleaned.includes('@');
  });

  if (!sections.Summary.length) {
    sections.Summary = [
      `Results-driven professional targeting ${targetRole || 'the selected role'}, with experience aligned to business needs, measurable outcomes, and strong execution.`,
    ];
  }

  const output = [`# **${candidateName}**`];
  output.push(contactLine || '[Mail](mailto:candidate@email.com) | Phone | LinkedIn | GitHub | LeetCode | Portfolio | Address');
  output.push('');
  output.push('---');

  SECTION_ORDER.forEach((section) => {
    output.push('');
    output.push(`## **${section}**`);
    const bodyLines = normalizeBullets(sections[section] || [], section);
    output.push(...bodyLines);
  });

  return output.join('\n').replace(/\n{3,}/g, '\n\n').trim();
};

module.exports = { normalizeResumeMarkdown };
