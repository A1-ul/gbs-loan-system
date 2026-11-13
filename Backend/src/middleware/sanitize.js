/**
 * GBS Loan Management System - Input Sanitization & Injection Defense Middleware
 * 
 * Provides recursive deep sanitization of all incoming string fields:
 * 1. Strips malicious HTML/script tags to prevent XSS (Cross-Site Scripting).
 * 2. Neutralizes javascript: and event-handler attributes (e.g. onload=, onclick=).
 * 3. Removes null bytes (\0) to prevent poison null byte attacks.
 * 4. Defends against Prototype Pollution by blocking __proto__, constructor, and prototype keys.
 * 5. Trims leading/trailing whitespace.
 */

function sanitizeValue(value) {
  if (typeof value === 'string') {
    // 1. Remove null bytes
    let cleaned = value.replace(/\0/g, '');
    
    // 2. Strip script tags and content within them
    cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // 3. Remove inline javascript protocols and event handlers
    cleaned = cleaned.replace(/javascript\s*:/gi, '');
    cleaned = cleaned.replace(/data\s*:\s*text\/html/gi, '');
    cleaned = cleaned.replace(/\bon\w+\s*=/gi, '');

    // 4. Strip dangerous angle brackets while allowing standard punctuation
    // We replace standalone < and > if they appear to be dangling tags
    cleaned = cleaned.replace(/<(?=[^>]*>)/g, '&lt;').replace(/(?<=[^<]*)>/g, '&gt;');

    return cleaned.trim();
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value !== null && typeof value === 'object') {
    const cleanObj = {};
    for (const [key, val] of Object.entries(value)) {
      // Prototype pollution defense
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      cleanObj[key] = sanitizeValue(val);
    }
    return cleanObj;
  }

  return value;
}

function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeValue(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeValue(req.params);
  }
  next();
}

module.exports = {
  sanitizeInput,
  sanitizeValue,
};
