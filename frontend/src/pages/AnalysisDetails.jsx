import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import API from '../utils/api';
import { motion } from 'framer-motion';
import ClassicDropdown from '../components/ClassicDropdown';
import {
  Sparkles,
  ArrowLeft,
  ChevronRight,
  Download,
  Copy,
  Check,
  Award,
  AlertTriangle,
  Lightbulb,
  PenTool,
  Printer,
  Layout,
} from 'lucide-react';
import confetti from 'canvas-confetti';

const resumeTemplateOptions = [
  { value: 'executive', label: 'Corporate Executive' },
  { value: 'tech', label: 'Modern Tech' },
  { value: 'minimalist', label: 'Minimalist Clean' },
];

const AnalysisDetails = () => {
  const { id } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'bullets', 'skills', 'export'
  const [copiedId, setCopiedId] = useState(null);
  const [resumeTemplate, setResumeTemplate] = useState('executive'); // 'executive', 'tech', 'minimalist'
  
  // Exporter state for editing resume text
  const [improvedText, setImprovedText] = useState('');
  
  const printRef = useRef();

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const res = await API.get(`/resumes/analysis/${id}`);
        setAnalysis(res.data.data);
        setImprovedText(normalizeResumeMarkdown(res.data.data.improvedResumeText, res.data.data.targetRole));
        setLoading(false);

        // Fire celebration confetti if score is high!
        if (res.data.data.atsScore >= 80) {
          setTimeout(() => {
            confetti({
              particleCount: 150,
              spread: 80,
              origin: { y: 0.6 },
              colors: ['#6366f1', '#a855f7', '#10b981', '#06b6d4'],
            });
          }, 500);
        }
      } catch (err) {
        console.error('Error fetching analysis details:', err);
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [id]);

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedId(idx);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const escapeHtml = (text) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const sectionOrder = ['Summary', 'Technical Skills', 'Experience', 'Projects', 'Education'];
  const sectionAliases = {
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

  const cleanResumeLine = (line) => line.replace(/\s+/g, ' ').trim();

  const slugifyResumeText = (text, fallback = 'candidate') => {
    const slug = cleanResumeLine(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    return slug || fallback;
  };

  const normalizeResumeUrl = (url) => {
    const cleaned = cleanResumeLine(url || '').replace(/[),.;]+$/g, '');
    if (!cleaned) return '';
    if (/^(https?:\/\/|mailto:|tel:)/i.test(cleaned)) return cleaned;
    return `https://${cleaned.replace(/^www\./i, '')}`;
  };

  const resumeMarkdownLink = (label, url) => `[${label}](${normalizeResumeUrl(url)})`;

  const extractResumeUrl = (text, regex) => text.match(regex)?.[0]?.trim().replace(/[),.;]+$/g, '') || '';

  const extractResumeAddress = (text) => {
    const contactArea = (text.split(/\n\s*(?:---|##\s+)/)[0] || text);
    const addressLine = contactArea
      .split(/\r?\n/)
      .map(cleanResumeLine)
      .find((line) => {
        if (!line || line.includes('@') || /https?:\/\/|linkedin\.com|github\.com|leetcode\.com/i.test(line)) return false;
        return /\b(address|location)\b\s*:/i.test(line) ||
          /\b\d{5,6}\b/.test(line);
      });
    return addressLine ? addressLine.replace(/^(address|location)\s*:\s*/i, '').replace(/\s*\|\s*/g, ', ') : '';
  };

  const extractResumeProjectLinks = (text) => {
    const matches = text.match(/(?:https?:\/\/|www\.)[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi) || [];
    return [...new Set(matches.map(normalizeResumeUrl))]
      .filter((url) => !/linkedin\.com|leetcode\.com/i.test(url))
      .sort((a, b) => Number(!/github\.com/i.test(a)) - Number(!/github\.com/i.test(b)))
      .slice(0, 8);
  };

  const stripResumeCodeFences = (text) =>
    String(text || '')
      .replace(/^```(?:markdown|md|text)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

  const canonicalSectionName = (heading) => {
    const key = cleanResumeLine(heading).toLowerCase().replace(/[#:*]/g, '');
    return sectionAliases[key] || null;
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

  const normalizeResumeBullets = (lines, section) =>
    lines
      .map((line) => line.trim())
      .filter((line) => line && line !== '---')
      .map((line) => {
        if (/^#{3,4}\s+/.test(line)) {
          return boldHeadingSegments(line);
        }
        if (/^#{1,2}\s+/.test(line)) return line;
        let cleanLine = line;
        let wasBullet = false;
        while (/^([-*•–—]|\d+[.)])\s+/.test(cleanLine)) {
          cleanLine = cleanLine.replace(/^([-*•–—]|\d+[.)])\s+/, '');
          wasBullet = true;
        }
        if (['Technical Skills', 'Experience', 'Projects', 'Education'].includes(section) && !/^\*?\d{4}/.test(cleanLine)) {
          return `- ${cleanLine}`;
        }
        if (wasBullet) return `- ${cleanLine}`;
        return cleanLine;
      });

  const normalizeResumeMarkdown = (text, targetRole = '') => {
    const source = stripResumeCodeFences(text);
    const sourceLines = source.split(/\r?\n/);
    const headingName = source.match(/^#\s+(.+)$/m)?.[1];
    const candidateName =
      cleanResumeLine((headingName || '').replace(/\*\*/g, '')) ||
      sourceLines.map(cleanResumeLine).find((line) => /^[A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){1,3}$/.test(line)) ||
      'Candidate Name';

    const email = source.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
    const phone = source.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0];
    const slug = slugifyResumeText(candidateName);
    const linkedin = extractResumeUrl(source, /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[^\s|)]+/i) || `linkedin.com/in/${slug}`;
    const github = extractResumeUrl(source, /(?:https?:\/\/)?(?:www\.)?github\.com\/[^\s|)]+/i) || `github.com/${slug}`;
    const leetcode = extractResumeUrl(source, /(?:https?:\/\/)?(?:www\.)?leetcode\.com\/(?:u\/)?[^\s|)]+/i) || `leetcode.com/u/${slug}`;
    const portfolioMatch = extractResumeUrl(
      source,
      /(?:https?:\/\/|www\.)[-a-zA-Z0-9@:%._+~#=]{1,256}\.(?:dev|io|me|app|site|tech|co|net|org|com)\b(?:[-a-zA-Z0-9()@:%_+.~#?&//=]*)/i
    );
    const portfolio = /linkedin\.com|github\.com|leetcode\.com/i.test(portfolioMatch) ? '' : portfolioMatch;
    const address = extractResumeAddress(source);
    const contactLine = [
      resumeMarkdownLink('Email', `mailto:${email || 'candidate@email.com'}`),
      phone,
      resumeMarkdownLink('LinkedIn', linkedin),
      resumeMarkdownLink('GitHub', github),
      resumeMarkdownLink('LeetCode', leetcode),
      resumeMarkdownLink('Portfolio', portfolio || `${slug}.dev`),
      address,
    ].filter(Boolean).join(' | ');

    const sections = Object.fromEntries(sectionOrder.map((section) => [section, []]));
    const preface = [];
    let activeSection = null;

    sourceLines.forEach((line) => {
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

    const ensureProjectLinks = (projectLines) => {
      const knownProjectLinks = extractResumeProjectLinks(source);
      const enhanced = [];
      let knownLinkIndex = 0;

      projectLines.forEach((line) => {
        const trimmed = line.trim();
        const headingMatch = trimmed.match(/^#{3,4}\s+(.+)$/);
        if (headingMatch) {
          if (!/\]\(|https?:\/\/|www\./i.test(trimmed)) {
            const projectTitle = cleanResumeLine(headingMatch[1].replace(/\|.*$/, ''));
            const projectSlug = slugifyResumeText(projectTitle, 'project');
            const link = knownProjectLinks[knownLinkIndex++] || `https://github.com/${slug}/${projectSlug}`;
            enhanced.push(`${trimmed} | [Project Link](${link})`);
          } else {
            enhanced.push(line);
          }
          return;
        }
        enhanced.push(line);
      });

      return enhanced;
    };

    sections.Projects = ensureProjectLinks(sections.Projects || []);

    sections.Summary = sections.Summary.filter((line) => {
      const cleaned = cleanResumeLine(line);
      return cleaned && cleaned !== candidateName && cleaned !== contactLine && !cleaned.includes('@');
    });

    if (!sections.Summary.length) {
      sections.Summary = [
        `Results-driven professional targeting ${targetRole || 'the selected role'}, with experience aligned to business needs, measurable outcomes, and strong execution.`,
      ];
    }

    const output = [`# **${candidateName}**`, contactLine || '[Mail](mailto:candidate@email.com) | Phone | LinkedIn | GitHub | LeetCode | Portfolio | Address', '', '---'];

    sectionOrder.forEach((section) => {
      output.push('', `## **${section}**`);
      const bodyLines = normalizeResumeBullets(sections[section] || [], section);
      output.push(...bodyLines);
    });

    return output.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  };

  const formatInlineMarkdown = (text) => {
    return escapeHtml(text)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline;">$1</a>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
  };

  const getResumeDocumentStyles = () => `
    * { box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #1f2937;
      line-height: 1.45;
      max-width: 820px;
      margin: 0 auto;
      padding: 40px;
      background: #ffffff;
    }
    h1 {
      font-size: 28px;
      line-height: 1.1;
      margin: 0 0 8px;
      color: #111827;
      text-align: center;
      letter-spacing: 0;
    }
    h2 {
      font-size: 14px;
      margin: 22px 0 8px;
      padding-bottom: 4px;
      border-bottom: 1.5px solid #cbd5e1;
      color: #111827;
      text-transform: uppercase;
      letter-spacing: 0;
    }
    h3 {
      font-size: 13px;
      margin: 14px 0 4px;
      color: #111827;
      font-weight: 700;
    }
    h4 {
      font-size: 12px;
      margin: 10px 0 3px;
      color: #475569;
      font-weight: 700;
    }
    p {
      margin: 0 0 8px;
      font-size: 12px;
    }
    ul {
      margin: 0 0 10px;
      padding-left: 18px;
      list-style-type: disc;
    }
    ol {
      margin: 0 0 10px;
      padding-left: 18px;
      list-style-type: decimal;
    }
    li {
      margin: 0 0 5px;
      font-size: 12px;
      display: list-item;
    }
    strong {
      color: #111827;
      font-weight: 700;
    }
    em {
      color: #475569;
      font-style: italic;
    }
    hr {
      border: 0;
      border-top: 1px solid #e2e8f0;
      margin: 12px 0;
    }
    .contact-header {
      text-align: center;
      font-size: 11px;
      color: #475569;
      margin: 0 0 16px;
      line-height: 1.7;
    }
    .contact-header span {
      display: inline-block;
      margin: 0 4px 5px;
      white-space: nowrap;
    }
    .template-executive h1 {
      text-transform: uppercase;
      border-bottom: 3px solid #111827;
      padding-bottom: 8px;
    }
    .template-executive h2 {
      border-bottom-color: #111827;
      font-size: 13px;
    }
    .template-executive .contact-header {
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 10px;
    }
    .template-tech {
      font-family: "Segoe UI", Arial, Helvetica, sans-serif;
    }
    .template-tech h1 {
      text-align: left;
      border-left: 5px solid #111827;
      padding-left: 12px;
    }
    .template-tech h2 {
      color: #111827;
      border-bottom: 0;
      border-left: 4px solid #111827;
      padding: 3px 0 3px 10px;
      background: #f3f4f6;
    }
    .template-tech h3 {
      color: #111827;
    }
    .template-tech .contact-header {
      text-align: left;
      margin-left: 16px;
    }
    .template-minimalist {
      font-family: Georgia, "Times New Roman", serif;
      max-width: 760px;
    }
    .template-minimalist h1 {
      font-size: 24px;
      text-align: left;
      font-weight: 700;
    }
    .template-minimalist h2 {
      color: #111827;
      border-bottom: 0;
      text-transform: none;
      font-size: 14px;
      margin-top: 18px;
    }
    .template-minimalist h3 {
      font-size: 12px;
    }
    .template-minimalist .contact-header {
      text-align: left;
      font-size: 10.5px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 8px;
    }
    .template-minimalist ul {
      padding-left: 16px;
    }
    @page {
      size: A4;
      margin: 18mm;
    }
    @media print {
      body {
        max-width: none;
        padding: 0;
      }
    }
  `;

  // Convert markdown-ish text to simple HTML elements for the print/PDF visual preview
  const renderResumeMarkdownToHTML = (text) => {
    if (!text) return '';

    const lines = text.split('\n');
    let html = '';
    let inList = false;

    lines.forEach((line) => {
      const trimmed = line.trim();

      if (!trimmed) {
        if (inList) { html += '</ul>'; inList = false; }
        return;
      }

      if (trimmed.startsWith('#### ')) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<h4>${formatInlineMarkdown(trimmed.substring(5))}</h4>`;
      } else if (trimmed.startsWith('### ')) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<h3>${formatInlineMarkdown(trimmed.substring(4))}</h3>`;
      } else if (trimmed.startsWith('## ')) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<h2>${formatInlineMarkdown(trimmed.substring(3))}</h2>`;
      } else if (trimmed.startsWith('# ')) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<h1>${formatInlineMarkdown(trimmed.substring(2))}</h1>`;
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        if (!inList) { html += '<ul>'; inList = true; }
        let content = trimmed.substring(2).trim();
        while (/^([-*•–—])\s+/.test(content)) {
          content = content.replace(/^([-*•–—])\s+/, '');
        }
        html += `<li>${formatInlineMarkdown(content)}</li>`;
      } else if (trimmed === '---') {
        if (inList) { html += '</ul>'; inList = false; }
        html += '<hr />';
      } else {
        if (inList) { html += '</ul>'; inList = false; }
        if (trimmed.includes('|')) {
          const parts = trimmed.split('|').map(p => p.trim());
          const matchedTypes = new Set();
          
          const pass1 = parts.map(part => {
             const emailMatch = part.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
             if (emailMatch && !part.includes('](')) {
                matchedTypes.add('email');
                return { type: 'email', html: `<a href="mailto:${emailMatch[0]}" style="color: inherit; text-decoration: none; border-bottom: 1px solid currentColor; padding-bottom: 1px;">${emailMatch[0]}</a>` };
             }
             if (/^(?:\+?\d[\d\s().-]{7,}\d)$/.test(part) && !part.includes('](')) {
                matchedTypes.add('phone');
                const phone = part.replace(/[^0-9+]/g, '');
                return { type: 'phone', html: `<a href="tel:${phone}" style="color: inherit; text-decoration: none; border-bottom: 1px solid currentColor; padding-bottom: 1px;">${part}</a>` };
             }
             if (/linkedin\.com/i.test(part) && !part.includes('](')) {
                matchedTypes.add('linkedin');
                let url = part.match(/linkedin\.com[^\s]*/i)?.[0] || part;
                if (!url.startsWith('http')) url = 'https://' + url;
                return { type: 'linkedin', html: `<a href="${url}" target="_blank" style="color: inherit; text-decoration: none; border-bottom: 1px solid currentColor; padding-bottom: 1px;">${part}</a>` };
             }
             if (/github\.com/i.test(part) && !part.includes('](')) {
                matchedTypes.add('github');
                let url = part.match(/github\.com[^\s]*/i)?.[0] || part;
                if (!url.startsWith('http')) url = 'https://' + url;
                return { type: 'github', html: `<a href="${url}" target="_blank" style="color: inherit; text-decoration: none; border-bottom: 1px solid currentColor; padding-bottom: 1px;">${part}</a>` };
             }
             const genericUrlMatch = part.match(/(?:https?:\/\/|www\.)[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/i) || part.match(/[-a-zA-Z0-9@:%._\+~#=]{1,256}\.(?:com|org|net|io|me|dev|co|app|site|tech)\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/i);
             if (genericUrlMatch && !part.includes(' ') && !part.includes('](')) {
                 matchedTypes.add('portfolio');
                 let url = genericUrlMatch[0];
                 if (!url.startsWith('http')) url = 'https://' + url;
                 return { type: 'portfolio', html: `<a href="${url}" target="_blank" style="color: inherit; text-decoration: none; border-bottom: 1px solid currentColor; padding-bottom: 1px;">${part}</a>` };
             }
             return { type: 'text', raw: part };
          });

          const finalParts = [];
          const renderedTypes = new Set();
          
          pass1.forEach(item => {
             if (item.type !== 'text') {
                 if (renderedTypes.has(item.type)) return;
                 renderedTypes.add(item.type);
                 finalParts.push(item.html);
             } else {
                 const cleanLower = item.raw.toLowerCase().replace(/[^a-z]/g, '');
                 const type = cleanLower === 'mail' ? 'email' : cleanLower;
                 if (['email', 'phone', 'linkedin', 'github', 'portfolio'].includes(type)) {
                     if (matchedTypes.has(type) || renderedTypes.has(type)) return; 
                     renderedTypes.add(type);
                 }
                 finalParts.push(formatInlineMarkdown(item.raw));
             }
          });

          html += `<div class="contact-header">${finalParts.map((p) => `<span>${p}</span>`).join(' &nbsp;|&nbsp; ')}</div>`;
        } else {
          html += `<p>${formatInlineMarkdown(trimmed)}</p>`;
        }
      }
    });

    if (inList) html += '</ul>';
    return html;
  };

  const buildResumeDocument = () => {
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Optimized Resume</title>
    <style>${getResumeDocumentStyles()}</style>
  </head>
  <body class="template-${resumeTemplate}">
    ${renderResumeMarkdownToHTML(improvedText)}
  </body>
</html>`;
  };

  const downloadFormattedResume = (format) => {
    const isText = format === 'txt';
    const isWord = format === 'doc';
    const content = isText ? improvedText : buildResumeDocument();
    const blob = new Blob([content], {
      type: isText
        ? 'text/plain;charset=utf-8'
        : isWord
        ? 'application/msword;charset=utf-8'
        : 'text/html;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = isText ? 'Optimized_Resume_ATS.txt' : isWord ? 'Optimized_Resume.doc' : 'Optimized_Resume.html';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const triggerPrint = () => {
    // Open a print window
    const printWindow = window.open('', '_blank');
    printWindow.document.write(buildResumeDocument());
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12">
        <div className="w-12 h-12 border-4 border-brand-indigo/20 border-t-brand-indigo rounded-full animate-spin mb-4"></div>
        <span className="text-slate-400 font-semibold text-sm">Loading complete ATS audit...</span>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
        <AlertTriangle className="w-16 h-16 text-rose-500 mb-4" />
        <h3 className="text-xl font-bold text-brand-indigo dark:text-blue-400 mb-2">Audit Report Not Found</h3>
        <p className="text-slate-400 text-sm max-w-sm mb-6">We could not load the specified resume report details.</p>
        <Link to="/" className="px-6 py-2.5 bg-brand-indigo dark:bg-blue-600 rounded-xl text-white font-semibold text-sm">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const getScoreBg = (score) => {
    if (score >= 70) return 'bg-green-500/10 text-green-700 border-green-500/30';
    if (score >= 50) return 'bg-yellow-400/20 text-yellow-700 border-yellow-400/40';
    return 'bg-red-500/10 text-red-600 border-red-500/30';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 flex flex-col w-full">
      {/* Back to dashboard */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          to="/"
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft size={16} />
          Dashboard
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Target Job Role:</span>
          <span className="text-xs font-bold bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-full">
            {analysis.targetRole}
          </span>
        </div>
      </div>

      {/* Main Grid Header */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start mb-8">
        
        {/* Score gauge Widget */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="wiz-card p-5 sm:p-6 text-center flex flex-col items-center justify-center h-full relative"
        >
          <div className="relative w-40 h-40 flex items-center justify-center mb-4">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="80" cy="80" r="70" stroke="rgba(255,255,255,0.03)" strokeWidth="6" fill="none" />
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke={analysis.atsScore >= 70 ? '#16a34a' : analysis.atsScore >= 50 ? '#ca8a04' : '#dc2626'}
                strokeWidth="6"
                fill="none"
                strokeDasharray="439.8"
                strokeDashoffset={439.8 - (439.8 * analysis.atsScore) / 100}
                className="transition-all duration-1000 ease-out"
                style={{ filter: 'drop-shadow(0 0 10px rgba(99, 102, 241, 0.2))' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-black text-brand-indigo dark:text-white font-display tracking-tight">{analysis.atsScore}</span>
              <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase mt-0.5 tracking-wider">ATS MATCH</span>
            </div>
          </div>

          <div className={`px-4 py-1.5 rounded-full border text-xs font-bold ${getScoreBg(analysis.atsScore)}`}>
            {analysis.atsScore >= 85
              ? 'Excellent Match'
              : analysis.atsScore >= 70
              ? 'Strong Compatibility'
              : analysis.atsScore >= 50
              ? 'Moderate Fit'
              : 'Requires Significant Edits'}
          </div>
        </motion.div>

        {/* Breakdown bars Widget */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-3 wiz-card p-5 sm:p-6 h-full flex flex-col justify-between"
        >
          <div>
            <h2 className="text-xl font-bold text-brand-indigo dark:text-white flex items-center gap-1.5 mb-1">
              <Award className="text-brand-orange" size={18} />
              <span>ATS Evaluation <span className="text-brand-orange">Criteria</span></span>
            </h2>
            <p className="text-slate-400 dark:text-slate-500 text-xs mb-6">Score breakdowns for compliance parameters.</p>
          </div>

          <div className="space-y-4 flex-1 flex flex-col justify-center">
            {/* Formatting */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-slate-600 dark:text-slate-400">Layout & Formatting</span>
                <span className="text-slate-800 dark:text-slate-200">{analysis.breakdown.formatting}/100</span>
              </div>
              <div className="w-full bg-blue-50/80 dark:bg-slate-800 border-blue-100 dark:border-slate-700 rounded-full h-2 border overflow-hidden">
                <div
                  className="bg-brand-orange h-full rounded-full transition-all duration-1000"
                  style={{ width: `${analysis.breakdown.formatting}%` }}
                ></div>
              </div>
            </div>

            {/* Keywords */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-slate-600 dark:text-slate-400">Keyword Density & Match</span>
                <span className="text-slate-800 dark:text-slate-200">{analysis.breakdown.keywords}/100</span>
              </div>
              <div className="w-full bg-blue-50/80 dark:bg-slate-800 border-blue-100 dark:border-slate-700 rounded-full h-2 border overflow-hidden">
                <div
                  className="bg-brand-indigo h-full rounded-full transition-all duration-1000"
                  style={{ width: `${analysis.breakdown.keywords}%` }}
                ></div>
              </div>
            </div>

            {/* Impact */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-slate-600 dark:text-slate-400">Impact & Achievement Metrics</span>
                <span className="text-slate-800 dark:text-slate-200">{analysis.breakdown.impact}/100</span>
              </div>
              <div className="w-full bg-blue-50/80 dark:bg-slate-800 border-blue-100 dark:border-slate-700 rounded-full h-2 border overflow-hidden">
                <div
                  className="bg-brand-cyan h-full rounded-full transition-all duration-1000"
                  style={{ width: `${analysis.breakdown.impact}%` }}
                ></div>
              </div>
            </div>

            {/* Structure */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-slate-600 dark:text-slate-400">Section Hierarchy & Structure</span>
                <span className="text-slate-800 dark:text-slate-200">{analysis.breakdown.structure}/100</span>
              </div>
              <div className="w-full bg-blue-50/80 dark:bg-slate-800 border-blue-100 dark:border-slate-700 rounded-full h-2 border overflow-hidden">
                <div
                  className="bg-brand-emerald h-full rounded-full transition-all duration-1000"
                  style={{ width: `${analysis.breakdown.structure}%` }}
                ></div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Dynamic Tab Navigation */}
      <div className="flex border-b border-blue-100 dark:border-slate-700 mb-6 sm:mb-8 overflow-x-auto no-scrollbar gap-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-5 py-3 border-b-2 text-sm font-semibold transition-all shrink-0 cursor-pointer ${
            activeTab === 'overview'
              ? 'border-brand-indigo text-brand-indigo bg-white dark:bg-slate-800 dark:text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-500 dark:hover:text-slate-300'
          }`}
        >
          Overview & General Tips
        </button>
        <button
          onClick={() => setActiveTab('bullets')}
          className={`px-5 py-3 border-b-2 text-sm font-semibold transition-all shrink-0 cursor-pointer ${
            activeTab === 'bullets'
              ? 'border-brand-indigo text-brand-indigo bg-white dark:bg-slate-800 dark:text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-500 dark:hover:text-slate-300'
          }`}
        >
          Bullet Points Optimizer
        </button>
        <button
          onClick={() => setActiveTab('skills')}
          className={`px-5 py-3 border-b-2 text-sm font-semibold transition-all shrink-0 cursor-pointer ${
            activeTab === 'skills'
              ? 'border-brand-indigo text-brand-indigo bg-white dark:bg-slate-800 dark:text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-500 dark:hover:text-slate-300'
          }`}
        >
          Skills Match Radar
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`px-5 py-3 border-b-2 text-sm font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'export'
              ? 'border-brand-indigo text-brand-indigo bg-white dark:bg-slate-800 dark:text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-500 dark:hover:text-slate-300'
          }`}
        >
          <PenTool size={14} className="text-brand-indigo" />
          Edit & Export Resume
        </button>
      </div>

      {/* Tabs panels wrapper */}
      <div className="flex-1 min-h-0">
        
        {/* Tab 1: Overview & General Tips */}
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <div className="md:col-span-2 space-y-6">
              <div className="wiz-card p-6">
                <h3 className="text-lg font-bold text-brand-orange flex items-center gap-2 mb-4">
                  <Lightbulb size={18} className="text-brand-orange" />
                  <span><span className="text-brand-indigo dark:text-blue-400">Key Improvement</span> Insights</span>
                </h3>
                <ul className="space-y-4">
                  {analysis.generalSuggestions.map((suggestion, idx) => (
                    <li key={idx} className="flex gap-3 text-sm text-slate-600 dark:text-slate-400">
                      <div className="w-5 h-5 rounded-full bg-blue-50 dark:bg-slate-700 border border-blue-100 dark:border-slate-600 flex items-center justify-center shrink-0 text-brand-indigo dark:text-blue-400 font-bold text-xs">
                        {idx + 1}
                      </div>
                      <span className="leading-relaxed">{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="wiz-card p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-brand-indigo dark:text-white flex items-center gap-2 mb-4">
                  <Sparkles size={18} className="text-brand-orange" />
                  <span>Next Steps <span className="text-brand-orange">Strategy</span></span>
                </h3>
                <p className="text-slate-400 dark:text-slate-500 text-sm leading-relaxed mb-4">
                  We've isolated key parameters to maximize your callbacks. 
                </p>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 dark:bg-slate-800 border border-blue-100 dark:border-slate-700 rounded-xl text-xs flex items-center gap-2">
                    <Check className="text-brand-emerald shrink-0" size={14} />
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Rephrase weak bullet statements.</span>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-slate-800 border border-blue-100 dark:border-slate-700 rounded-xl text-xs flex items-center gap-2">
                    <Check className="text-brand-emerald shrink-0" size={14} />
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Incorporate critical missing skills.</span>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-slate-800 border border-blue-100 dark:border-slate-700 rounded-xl text-xs flex items-center gap-2">
                    <Check className="text-brand-emerald shrink-0" size={14} />
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Export optimized professional layout.</span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => setActiveTab('bullets')}
                className="mt-6 w-full flex items-center justify-center gap-2 py-3 bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 hover:border-brand-indigo/30 dark:hover:border-blue-500/30 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-full text-xs font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
              >
                Go to Bullet Points Optimizer
                <ChevronRight size={14} />
              </button>
            </div>
          </motion.div>
        )}

        {/* Tab 2: Bullet Points Optimizer */}
        {activeTab === 'bullets' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="wiz-card p-6">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-brand-indigo dark:text-white flex items-center gap-2">
                  <Sparkles size={18} className="text-brand-orange" />
                  <span>Bullet <span className="text-brand-orange">Optimizations</span> <span className="text-brand-indigo dark:text-blue-400">(Google X-Y-Z Formula)</span></span>
                </h3>
                <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                  Replace static task listings with high-impact accomplishments: **Accomplished [X] as measured by [Y], by doing [Z]**.
                </p>
              </div>

              <div className="space-y-6">
                {analysis.bulletPointSuggestions.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-6 bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 rounded-2xl space-y-4 hover:border-brand-indigo/30 dark:hover:border-blue-500/30 transition-all shadow-sm"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Original */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">Original Bullet Point</span>
                        <div className="p-3 bg-blue-50 dark:bg-slate-900 border border-blue-100 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic min-h-[50px] flex items-center">
                          "{item.original}"
                        </div>
                      </div>

                      {/* Suggestion */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-brand-emerald uppercase tracking-widest block">AI-Optimized (Action & Result)</span>
                          <button
                            onClick={() => handleCopy(item.suggestion, idx)}
                            className="text-xs text-slate-400 hover:text-brand-indigo flex items-center gap-1 p-1 hover:bg-white/5 rounded transition-all cursor-pointer"
                          >
                            {copiedId === idx ? (
                              <>
                                <Check size={12} className="text-brand-emerald" />
                                <span className="text-brand-emerald font-semibold">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl text-sm text-slate-800 dark:text-emerald-100 leading-relaxed font-semibold min-h-[50px] flex items-center shadow-inner">
                          "{item.suggestion}"
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-blue-100 dark:border-slate-700 flex gap-2 text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-semibold shrink-0 uppercase tracking-wider">Strategic Edge:</span>
                      <span className="text-slate-600 dark:text-slate-300 leading-relaxed">{item.benefit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab 3: Skills Match */}
        {activeTab === 'skills' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {/* Matched */}
              <div className="wiz-card p-6">
              <h3 className="text-lg font-bold text-brand-indigo dark:text-white flex items-center gap-2 mb-1">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span>Matched Industry <span className="text-brand-orange">Keywords</span> ({analysis.skills.matched.length})</span>
              </h3>
              <p className="text-slate-400 text-xs mb-6">These keywords match the target role specifications perfectly.</p>

              {analysis.skills.matched.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-blue-200 dark:border-slate-700 bg-blue-50/50 dark:bg-slate-800/50 rounded-xl text-slate-500 text-sm">
                  No matching keywords detected.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {analysis.skills.matched.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-semibold rounded-lg text-xs tracking-wide"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Missing */}
            <div className="wiz-card p-6">
              <h3 className="text-lg font-bold text-brand-orange flex items-center gap-2 mb-1">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></div>
                <span><span className="text-brand-indigo dark:text-blue-400">Missing Key</span> Competencies ({analysis.skills.missing.length})</span>
              </h3>
              <p className="text-slate-400 text-xs mb-6">Incorporate these skills in your experience or project descriptions.</p>

              {analysis.skills.missing.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-blue-200 dark:border-slate-700 bg-blue-50/50 dark:bg-slate-800/50 rounded-xl text-slate-500 text-sm">
                  All expected competencies are present! Excellent work!
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {analysis.skills.missing.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-3.5 py-1.5 bg-rose-500/10 border border-rose-500/25 text-rose-400 font-semibold rounded-lg text-xs tracking-wide"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Tab 4: Improved Resume Exporter */}
        {activeTab === 'export' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8 items-stretch"
          >
            {/* Editor Pane */}
            <div className="wiz-card p-5 sm:p-6 flex flex-col h-[520px] sm:h-[650px]">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-brand-indigo dark:text-white flex items-center gap-1.5">
                  <PenTool size={18} className="text-brand-orange" />
                  <span>Markdown Content <span className="text-brand-orange">Builder</span></span>
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">Customize your optimized resume. Changes update the preview instantly.</p>
              </div>

              <textarea
                value={improvedText}
                onChange={(e) => setImprovedText(e.target.value)}
                className="flex-1 w-full bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 rounded-xl p-4 text-xs font-mono text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-brand-indigo/50 transition-all resize-none shadow-inner leading-relaxed overflow-y-auto"
              />
            </div>

            {/* Preview & Print Config Pane */}
            <div className="wiz-card p-5 sm:p-6 flex flex-col h-[560px] sm:h-[650px] relative">
              <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-brand-orange flex items-center gap-1.5">
                    <Layout size={18} className="text-brand-cyan" />
                    <span><span className="text-brand-indigo dark:text-blue-400">Layout Live</span> Preview</span>
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5">Export styled, standard formatting ready for review.</p>
                </div>

                {/* Exporter Controls */}
                <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
                  <ClassicDropdown
                    value={resumeTemplate}
                    options={resumeTemplateOptions}
                    onChange={setResumeTemplate}
                    compact
                    className="w-full sm:w-auto"
                  />

                  <button
                    onClick={() => downloadFormattedResume('txt')}
                    className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 hover:border-brand-indigo/30 dark:hover:border-blue-500/30 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg text-xs font-bold text-brand-indigo dark:text-blue-400 transition-all cursor-pointer"
                  >
                    <Download size={14} />
                    ATS TXT
                  </button>

                  <button
                    onClick={() => downloadFormattedResume('html')}
                    className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 hover:border-brand-indigo/30 dark:hover:border-blue-500/30 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg text-xs font-bold text-brand-indigo dark:text-blue-400 transition-all cursor-pointer"
                  >
                    <Download size={14} />
                    HTML
                  </button>

                  <button
                    onClick={() => downloadFormattedResume('doc')}
                    className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 hover:border-brand-indigo/30 dark:hover:border-blue-500/30 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg text-xs font-bold text-brand-indigo dark:text-blue-400 transition-all cursor-pointer"
                  >
                    <Download size={14} />
                    Word .doc
                  </button>

                  <button
                    onClick={triggerPrint}
                    className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 hover:border-brand-indigo/30 dark:hover:border-blue-500/30 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg text-xs font-bold text-brand-indigo dark:text-blue-400 transition-all cursor-pointer"
                  >
                    <Printer size={14} />
                    Save PDF
                  </button>
                </div>
              </div>

              {/* Styled Document frame */}
              <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-y-auto p-4 sm:p-8 shadow-inner no-scrollbar">
                <div
                  ref={printRef}
                  className={`prose max-w-none text-slate-800 text-[12px] font-sans leading-relaxed ${
                    resumeTemplate === 'tech'
                      ? 'template-tech'
                      : resumeTemplate === 'minimalist'
                      ? 'template-minimalist'
                      : 'template-executive'
                  }`}
                  dangerouslySetInnerHTML={{ __html: renderResumeMarkdownToHTML(improvedText) }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AnalysisDetails;
