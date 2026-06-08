/**
 * LandingAI Agent - Autonomous landing page generator
 *
 * Uses Polsia Agent API to generate complete HTML landing pages
 * based on user brief submissions.
 */

const fs = require('fs');
const path = require('path');

const POLSIA_API_URL = process.env.POLSIA_API_URL || 'https://polsia.com/api/proxy/ai';

/**
 * Generate a complete HTML landing page from a brief
 * @param {{ product_name: string, description: string, audience: string, cta_copy: string }} brief
 * @returns {Promise<string>} Generated HTML string
 */
async function generateLandingPage(brief) {
  const { product_name, description, audience, cta_copy } = brief;

  const themeCSS = readThemeCSS();

  const prompt = `You are an expert landing page copywriter and designer. Generate a complete, self-contained HTML landing page for a new product.

## Product Details
- Product Name: ${product_name}
- Description: ${description}
- Target Audience: ${audience}
- Call-to-Action Copy: ${cta_copy}

## Design Requirements
Generate a mobile-responsive, visually polished landing page. Use these exact design tokens:
- Background: #F8F7F4
- Text: #0E0E0C
- Muted text: #6B6B63
- Accent blue: #0066FF
- Border: #E4E3DE
- Surface: #FFFFFF

Use Google Fonts: Syne (headings, 700-800 weight) and DM Sans (body, 300-500 weight).

## Page Structure Required
1. **Nav** - Simple sticky nav with logo and product name
2. **Hero** - Product name as headline, description as subtext, prominent CTA button, visual appeal
3. **Features** - 3-column grid of key features (use 3 compelling feature points based on the product)
4. **Social Proof** - A "trusted by" section with fake but realistic company names
5. **CTA Section** - Final call-to-action with the provided CTA copy
6. **Footer** - Simple footer with brand

## Output Format
Return ONLY the complete HTML document, starting with <!DOCTYPE html> and ending with </html>.
All CSS must be inline in a <style> tag. No external dependencies except Google Fonts.
The page must be genuinely persuasive and look like a real startup landing page.

Write compelling, realistic copy for all sections. Do not use placeholder text like "Feature 1" - actually describe what the product does.`;

  const response = await fetch(`${POLSIA_API_URL}/agent/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.POLSIA_API_KEY}`,
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Agent API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  return result.output || result.content || result.text;
}

/**
 * Read theme CSS for design tokens
 * @returns {string} CSS content
 */
function readThemeCSS() {
  const themePath = path.join(__dirname, '..', 'public', 'css', 'theme.css');
  if (fs.existsSync(themePath)) {
    return fs.readFileSync(themePath, 'utf8');
  }
  return '';
}

module.exports = { generateLandingPage };
