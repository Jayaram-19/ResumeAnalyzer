const { GoogleGenerativeAI } = require('@google/generative-ai');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isTransientGeminiError = (error) => {
  return error.status === 429 || error.status === 500 || error.status === 502 || error.status === 503 || error.status === 504;
};

/**
 * Analyzes resume text against a target job role using Gemini AI.
 * Falls back to mock analyzer if API key is not configured.
 * @param {string} resumeText - Raw text of the resume
 * @param {string} targetRole - Target job description/role name
 * @returns {Promise<object>} - Parsed ATS analysis JSON object
 */
const analyzeResumeWithAI = async (resumeText, targetRole) => {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();

  if (!apiKey) {
    console.warn('GEMINI_API_KEY or GOOGLE_API_KEY not found in environment. Using high-fidelity Mock Resume Analyzer fallback.');
    return generateMockAnalysis(resumeText, targetRole);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelNames = (process.env.GEMINI_MODELS || process.env.GEMINI_MODEL || 'gemini-2.5-flash')
      .split(',')
      .map((modelName) => modelName.trim())
      .filter(Boolean);
    const prompt = `
You are an expert ATS (Applicant Tracking System) optimizer and professional resume writer.
Analyze the following resume text specifically for the target job role or job description: "${targetRole}".

REUSE AND FORMAT YOUR RESPONSE EXACTLY AS A JSON OBJECT WITH THE FOLLOWING STRUCTURE:
{
  "atsScore": <number between 0 and 100 overall score>,
  "breakdown": {
    "formatting": <number between 0 and 100 assessing layout, sections, spacing, contact details>,
    "keywords": <number between 0 and 100 based on presence of crucial industry/role-specific terms>,
    "impact": <number between 0 and 100 assessing action-oriented phrasing and quantified achievements>,
    "structure": <number between 0 and 100 assessing chronological order, clear headers, legibility>
  },
  "skills": {
    "matched": [<array of strings of relevant skills found in the resume matching the target role>],
    "missing": [<array of strings of crucial skills expected for this target role but missing or weak in the resume>]
  },
  "bulletPointSuggestions": [
    {
      "original": "<exact weak bullet point from the resume>",
      "suggestion": "<rewritten bullet point using the Google X-Y-Z formula: Accomplished [X], as measured by [Y], by doing [Z]>",
      "benefit": "<brief explanation of why this edit makes a stronger impression on hiring managers>"
    }
  ],
  "generalSuggestions": [
    "<array of 3 to 5 general actionable suggestions for resume formatting, length, and sections>"
  ],
  "improvedResumeText": "<Full, professional resume rewritten in strict Markdown. It MUST start with '# **Candidate Name**', then one contact line separated by pipes, then '---'. Preserve any address/location from the original resume. The contact line MUST use the candidate's actual email address as a clickable mailto link (e.g., \`[candidate@email.com](mailto:candidate@email.com)\`) instead of the word 'Mail', and MUST include phone, a LinkedIn link, a GitHub link, a LeetCode link, and a portfolio link. If LinkedIn, GitHub, LeetCode, or portfolio are missing, generate realistic editable defaults from the candidate name. It MUST include these section headings exactly and in this order: '## **Summary**', '## **Technical Skills**', '## **Experience**', '## **Projects**', '## **Education**'. Use '### **Title** | **Organization**' (where Title and Organization are both bolded) for roles, use plain date lines only when available, and use '-' bullets for every achievement. Within the '## **Projects**' section, every project heading MUST be in the format '### **Project Name** | [Project Link](url)' (where the project name is bolded). Preserve any original project links, and for any project without a link, generate a realistic default GitHub repository link directly beside the project name. Do not put project links as separate bullet points under the project. Do not use tables. Do not wrap the resume in code fences. Do not include analysis notes, scoring notes, placeholder text, or explanations inside the resume text.>"
}

Strictly analyze the provided resume. If bullet points are weak (e.g. lack action verbs, lack metrics, simple task listings), rewrite at least 2-3 of them in 'bulletPointSuggestions' using the Google X-Y-Z formula. 
Before returning JSON, verify that improvedResumeText is a complete, consistently formatted resume document with no missing required sections. The improvedResumeText must be optimized to score higher than the original resume under the same atsScore and breakdown rubric. It should naturally include target-role keywords from the resume and target role, quantified impact where possible, strong section structure, and ATS-readable plain text formatting. Never include placeholder lines such as "Add relevant details" or "TBD"; if source evidence is missing for a section, keep that section concise and truthful rather than adding filler.

Resume Text:
"""
${resumeText}
"""
    `;

    let lastError;

    for (const modelName of modelNames) {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: 'application/json' }
      });

      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          const result = await model.generateContent(prompt);
          const responseText = result.response.text();
    
          // Parse response as JSON
          const parsedData = JSON.parse(responseText);
          return parsedData;
        } catch (error) {
          lastError = error;

          if (!isTransientGeminiError(error)) {
            throw error;
          }

          if (attempt < 3) {
            await delay(attempt * 1500);
          }
        }
      }
    }

    throw lastError;

  } catch (error) {
    const status = error.status ? ` (${error.status}${error.statusText ? ` ${error.statusText}` : ''})` : '';
    const message = error.message || 'Unknown Gemini API error';
    console.error('Gemini API Error:', error);
    throw new Error(`Gemini API request failed${status}: ${message}`);
  }
};

/**
 * High-fidelity Mock Analysis Generator that inspects the resume text and produces rich,
 * relevant grading feedback based on the target role, to ensure robust offline developer testing.
 */
const generateMockAnalysis = (resumeText, targetRole) => {
  const lowercaseText = resumeText.toLowerCase();
  const lowercaseRole = targetRole.toLowerCase();

  // Simple keyword lists based on job roles
  const skillsDatabase = {
    frontend: ['react', 'vue', 'javascript', 'typescript', 'html', 'css', 'tailwind', 'sass', 'redux', 'next.js', 'webpack'],
    backend: ['node', 'express', 'mongodb', 'postgresql', 'sql', 'mysql', 'python', 'django', 'fastapi', 'java', 'docker', 'aws', 'redis'],
    fullstack: ['react', 'node', 'express', 'mongodb', 'javascript', 'typescript', 'html', 'css', 'sql', 'docker', 'aws', 'git'],
    software: ['java', 'python', 'c++', 'c#', 'data structures', 'algorithms', 'git', 'sql', 'unit testing', 'ci/cd'],
    data: ['python', 'r', 'sql', 'pandas', 'numpy', 'scikit-learn', 'tensorflow', 'tableau', 'powerbi', 'machine learning', 'excel']
  };

  // Determine active skills category
  let category = 'fullstack';
  if (lowercaseRole.includes('front')) category = 'frontend';
  else if (lowercaseRole.includes('back')) category = 'backend';
  else if (lowercaseRole.includes('data')) category = 'data';
  else if (lowercaseRole.includes('software')) category = 'software';

  const targetSkills = skillsDatabase[category];
  const matched = [];
  const missing = [];

  // Categorize skills based on presence in text
  targetSkills.forEach(skill => {
    if (lowercaseText.includes(skill)) {
      // Capitalize for presentation
      matched.push(skill.toUpperCase());
    } else {
      missing.push(skill.toUpperCase());
    }
  });

  // Dynamic ATS Score calculation
  const keywordRatio = targetSkills.length > 0 ? (matched.length / targetSkills.length) : 0.5;
  const formattingScore = lowercaseText.includes('email') || lowercaseText.includes('@') ? 85 : 60;
  const keywordsScore = Math.round(50 + keywordRatio * 45);
  const impactScore = lowercaseText.includes('%') || lowercaseText.includes('$') || /\b(10|[2-9]\d|\d{3,})\b/.test(lowercaseText) ? 75 : 55;
  const structureScore = lowercaseText.includes('experience') || lowercaseText.includes('education') || lowercaseText.includes('skills') ? 80 : 50;

  const atsScore = Math.round((formattingScore + keywordsScore + impactScore + structureScore) / 4);

  // Identify some sample bullet points to rewrite (or generic equivalents if not found)
  const weakBullets = [
    {
      original: 'Responsible for maintaining the codebase and writing React components.',
      suggestion: 'Architected and optimized 15+ high-traffic React components, reducing client-side load time by 28% and boosting user interaction rates.',
      benefit: 'Quantifies impact and changes passive "responsible for" phrasing to active "architected and optimized".'
    },
    {
      original: 'Helped the team design databases and API endpoints.',
      suggestion: 'Engineered robust Express REST APIs integrated with MongoDB, enhancing query response latency by 40% through indexing and caching.',
      benefit: 'Uses technical action verbs and provides measurable metrics of system speedups.'
    }
  ];

  const generalSuggestions = [
    'Integrate quantitative metrics (% improvements, dollar values, hours saved) in your work achievements.',
    'Start every single bullet point in your experience section with an active verb (e.g. Developed, Orchestrated, Supervised).',
    'Include direct links to your GitHub portfolio and LinkedIn profile in the contact header.',
    `Target role '${targetRole}' values skills like: ${missing.slice(0, 3).join(', ')}. Add projects highlighting these technologies.`
  ];

  // Build a beautiful improved markdown resume text based on text inputs
  const nameMatch = resumeText.match(/^([A-Z][a-z]+ [A-Z][a-z]+)/);
  const candidateName = nameMatch ? nameMatch[1] : 'Alex Developer';

  const improvedResumeText = `# **${candidateName}**
**Full Stack Software Engineer** | alex.dev@email.com | +1 (555) 019-2834 | github.com/alexdev | linkedin.com/in/alexdev

---

## **PROFESSIONAL SUMMARY**
Results-driven software engineer with extensive experience designing, building, and deploying highly scalable web applications. Adept at leveraging modern frontend frameworks like React and robust backend technologies like Node.js and MongoDB to solve complex business problems. Committed to clean code practices, performance optimization, and seamless user experiences.

## **TECHNICAL SKILLS**
- **Languages:** JavaScript (ES6+), TypeScript, HTML5, CSS3, SQL
- **Frontend:** React.js, Tailwind CSS, Next.js, Redux Toolkit
- **Backend & DB:** Node.js, Express, MongoDB, PostgreSQL, REST APIs
- **Tools & DevOps:** Git, Docker, AWS (S3, EC2), CI/CD, Jest

## **WORK EXPERIENCE**
### **Senior Software Engineer** | **Tech Innovators Inc.**
*2024 - Present*
- **Architected and optimized 15+ high-traffic React components**, reducing client-side load time by 28% and boosting user interaction rates.
- **Engineered robust Express REST APIs integrated with MongoDB**, enhancing query response latency by 40% through indexing and Redis caching.
- Led a team of 4 junior developers to ship a new SaaS dashboard 3 weeks ahead of schedule, using Agile methodologies.

### **Software Developer** | **Web Solutions Co.**
*2022 - 2024*
- Built responsive user interfaces using Tailwind CSS and React, achieving cross-browser compatibility and an immaculate mobile-first UX.
- Implemented automated Jest unit testing suites, increasing test coverage from 45% to 88% and eliminating critical production bugs.
- Managed secure file uploads to Cloudinary storage, integrating pre-signing middlewares for secure document transmission.

## **PROJECTS**
### **AI-Powered Resume Analyzer**
- Created a multi-tier SaaS web app utilizing React, Node.js, and the Gemini API to analyze PDF/DOCX resumes.
- Developed an interactive scanning dashboard featuring live circular SVG gauges and Framer Motion transitions.

## **EDUCATION**
### **Bachelor of Science in Computer Science**
*State University | 2018 - 2022*
`;

  return {
    atsScore,
    breakdown: {
      formatting: formattingScore,
      keywords: keywordsScore,
      impact: impactScore,
      structure: structureScore
    },
    skills: {
      matched,
      missing
    },
    bulletPointSuggestions: weakBullets,
    generalSuggestions,
    improvedResumeText
  };
};

module.exports = { analyzeResumeWithAI };
