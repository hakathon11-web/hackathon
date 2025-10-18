#!/usr/bin/env node
/*
  Convert Word (.docx) legal documents to HTML and place them into src/legal/<lang>/<slug>.html
  - Input directory: src/legal/word_documents
  - Expected filename pattern: <lang>_<slug>.docx
    where <lang> is en or ka
    and <slug> is one of: about, contact, refund-policy, privacy, service-description
*/

import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const workspaceRoot = projectRoot; // project root is the workspace root for this app
const inputDir = path.join(workspaceRoot, 'src', 'legal', 'word_documents');

const allowedLangs = new Set(['en', 'ka']);
const allowedSlugs = new Set(['about', 'contact', 'refund-policy', 'privacy', 'service-description']);

function ensureDir(p) {
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
}

async function convertOne(filePath, lang, slug) {
  const buffer = fs.readFileSync(filePath);
  const { value: html } = await mammoth.convertToHtml({ buffer }, {
    styleMap: [
      'p[style-name="Title"] => h1:fresh',
      'p[style-name="Subtitle"] => h2:fresh',
      'p[style-name="Heading 1"] => h1:fresh',
      'p[style-name="Heading 2"] => h2:fresh',
      'p[style-name="Heading 3"] => h3:fresh',
      'p[style-name="Heading 4"] => h4:fresh',
      'p[style-name="Heading 5"] => h5:fresh',
      'p[style-name="Heading 6"] => h6:fresh',
      'p[style-name="Heading 7"] => h6:fresh',
      'p[style-name="Quote"] => blockquote:fresh',
      'p[style-name="Intense Quote"] => blockquote:fresh'
    ]
  });

  const enhanced = postProcessHtml(html);
  const outDir = path.join(workspaceRoot, 'src', 'legal', lang);
  ensureDir(outDir);
  const outPath = path.join(outDir, `${slug}.html`);

  // Wrap in minimal structure; LegalArticle applies site styles
  const wrapped = enhanced.trim();

  fs.writeFileSync(outPath, wrapped, 'utf8');
  console.log(`✓ Wrote ${outPath}`);
}

async function run() {
  if (!fs.existsSync(inputDir)) {
    console.error(`Input directory not found: ${inputDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(inputDir).filter(f => f.toLowerCase().endsWith('.docx'));
  if (files.length === 0) {
    console.warn('No .docx files found. Nothing to do.');
    return;
  }

  for (const file of files) {
    const lower = file.toLowerCase();
    // Language detection
    let lang = lower.includes('_en') || /\ben\b/.test(lower) ? 'en' : null;
    if (!lang) lang = lower.includes('_ge') || /\bge\b/.test(lower) || lower.includes('_ka') || /\bka\b/.test(lower) ? 'ka' : null;

    // Slug detection
    let slug = null;
    if (lower.includes('about')) slug = 'about';
    else if (lower.includes('contact')) slug = 'contact';
    else if (lower.includes('refund')) slug = 'refund-policy';
    else if (lower.includes('privacy') || (lower.includes('personal') && (lower.includes('security') || lower.includes('info')))) slug = 'privacy';
    else if ((lower.includes('detailed') || lower.includes('detail')) && lower.includes('service')) slug = 'service-description';
    else {
      // Not a required legal doc; skip silently
      console.warn(`Skipping unrecognized slug from filename: ${file}`);
      continue;
    }

    if (!allowedLangs.has(lang)) {
      console.warn(`Skipping ${file}: could not detect supported lang (en/ka).`);
      continue;
    }
    if (!allowedSlugs.has(slug)) {
      console.warn(`Skipping ${file}: unsupported slug '${slug}'. Allowed: ${Array.from(allowedSlugs).join(', ')}`);
      continue;
    }

    try {
      await convertOne(path.join(inputDir, file), lang, slug);
    } catch (err) {
      console.error(`Failed to convert ${file}:`, err.message);
      process.exitCode = 1;
    }
  }
}

function postProcessHtml(input) {
  let out = input;
  // 1) Convert numeric section titles into headings
  // 1. Title => h2
  out = out.replace(/<p>\s*\d{1,2}\.\s+([^<]+)<\/p>/g, (_m, title) => `<h2>${escapeHtml(title.trim())}</h2>`);
  // 1.1. Subtitle => h3
  out = out.replace(/<p>\s*\d{1,2}\.\d{1,2}\.\s+([^<]+)<\/p>/g, (_m, title) => `<h3>${escapeHtml(title.trim())}</h3>`);
  // 1.1.1. Subsubtitle => h4
  out = out.replace(/<p>\s*\d{1,2}\.\d{1,2}\.\d{1,2}\.\s+([^<]+)<\/p>/g, (_m, title) => `<h4>${escapeHtml(title.trim())}</h4>`);

  // 2) Remove bold-only prefixes before ':' that came from Word unless they are known labels
  const labelPrefixes = [
    'Company', 'Address', 'Email', 'Phone', 'Phones', 'Contact', 'Data Controller',
    'კომპანია', 'მისამართი', 'ელფოსტა', 'ტელეფონი', 'საკონტაქტო', 'მონაცემთა დამმუშავებელი'
  ];
  const allowedSet = new Set(labelPrefixes.map(s => s.toLowerCase()));
  out = out.replace(/<(p|li)>\s*<strong>([^<:]{2,}?)<\/strong>\s*:\s*([^<][\s\S]*?)<\/(?:\1)>/g, (m, tag, label, rest) => {
    if (allowedSet.has(String(label).toLowerCase())) return m; // keep as-is for allowed labels
    return `<${tag}>${escapeHtml(String(label))}: ${rest}</${tag}>`;
  });

  // 2b) Strengthen common label prefixes at start of paragraph (plain text -> bold)
  out = out.replace(/<p>([^<]+)<\/p>/g, (m, text) => {
    const trimmed = text.trim();
    const idx = trimmed.indexOf(':');
    if (idx > 0) {
      const label = trimmed.slice(0, idx);
      if (labelPrefixes.some(p => label.toLowerCase().startsWith(p.toLowerCase()))) {
        const rest = trimmed.slice(idx + 1).trim();
        return `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(rest)}</p>`;
      }
    }
    return m;
  });

  // 3) Convert simple dash lists into UL blocks (for content pasted without Word lists)
  const bullet = '[\\-•●▪•·—–*]';
  out = out.replace(new RegExp(`(?:<p>\\s*${bullet}\\s*[^<]+<\\/p>\\s*)+`, 'g'), (block) => {
    const itemRe = new RegExp(`<p>\\s*${bullet}\\s*([^<]+)<\\/p>`, 'g');
    const items = block.match(new RegExp(`<p>\\s*${bullet}\\s*([^<]+)<\\/p>`, 'g')) || [];
    const lis = items.map(it => it.replace(itemRe, (_m, txt) => `<li>${escapeHtml(String(txt).trim())}</li>`)).join('');
    return `<ul>${lis}</ul>`;
  });

  // 4) Convert numeric/roman lists like (1) 1. i) ii. into ordered lists
  out = out.replace(/(?:<p>\s*(?:\(?\d{1,3}[\).]|[ivxlcdm]+[\).])\s*[^<]+<\/p>\s*)+/gi, (block) => {
    const items = block.match(/<p>\s*(?:\(?\d{1,3}[\).]|[ivxlcdm]+[\).])\s*([^<]+)<\/p>/gi) || [];
    const lis = items.map(it => it.replace(/<p>\s*(?:\(?\d{1,3}[\).]|[ivxlcdm]+[\).])\s*([^<]+)<\/p>/i, (_m, txt) => `<li>${escapeHtml(String(txt).trim())}</li>`)).join('');
    return `<ol>${lis}</ol>`;
  });

  // 5) Auto-link emails and phones
  out = out.replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '<a href="mailto:$1">$1</a>');
  out = out.replace(/\+?\d[\d\s()-]{7,}\d/g, (m) => `<a href="tel:${m.replace(/[^+\d]/g,'')}">${m}</a>`);

  // 6) Demote headings that look like inline labels (e.g., "Booking Request: text")
  // Convert contiguous sequences into a UL list for visual consistency
  out = out.replace(/(?:<h([2-4])>\s*([^:<]{2,}?)\s*:\s*([^<]+)<\/h\1>\s*)+/g, (block) => {
    const itemRe = /<h([2-4])>\s*([^:<]{2,}?)\s*:\s*([^<]+)<\/h\1>/g;
    const lis = Array.from(block.matchAll(itemRe)).map(([, , label, rest]) => `<li>${escapeHtml(String(label).trim())}: ${escapeHtml(String(rest).trim())}</li>`).join('');
    return `<ul>${lis}</ul>`;
  });

  // 6a) For non-whitelisted labels, remove bold from patterns like "<strong>Label:</strong> text"
  out = out.replace(/<(p|li)>\s*<strong>([^<]+?):<\/strong>\s*([\s\S]*?)<\/(?:\1)>/g, (m, tag, label, rest) => {
    if (allowedSet.has(String(label).toLowerCase())) return m;
    return `<${tag}>${escapeHtml(String(label))}: ${rest}</${tag}>`;
  });

  // 7) Add IDs to headings for deep links
  out = out.replace(/<h([1-6])>([^<]+)<\/h\1>/g, (_m, level, text) => {
    const id = String(text).toLowerCase().trim().replace(/[^a-z0-9]+/gi, '-');
    return `<h${level} id="${id}">${escapeHtml(text)}</h${level}>`;
  });

  // 8) Style tables by adding class
  out = out.replace(/<table(\s|>)/g, '<table class="legal-table"$1');

  return out;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

run();


