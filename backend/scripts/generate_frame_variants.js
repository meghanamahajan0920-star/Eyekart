const fs = require('fs');
const path = require('path');

const outDir = path.resolve(__dirname, '../../frontend/public/images/products');
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

function createEyewearSvg({ frameColor, lensColor, frameStyle, name }) {
    let framePaths = '';
    let lensPaths = '';
    
    // Different frame geometry silhouettes
    if (frameStyle === 'cat-eye') {
        framePaths = `
            <!-- Left Rim -->
            <path d="M120 220 C110 160, 140 140, 240 150 C290 155, 310 180, 290 230 C270 280, 140 270, 120 220 Z" fill="none" stroke="${frameColor}" stroke-width="22" stroke-linejoin="round" />
            <!-- Right Rim -->
            <path d="M480 220 C490 160, 460 140, 360 150 C310 155, 290 180, 310 230 C330 280, 460 270, 480 220 Z" fill="none" stroke="${frameColor}" stroke-width="22" stroke-linejoin="round" />
            <!-- Bridge -->
            <path d="M280 170 Q300 160 320 170" fill="none" stroke="${frameColor}" stroke-width="16" stroke-linecap="round" />
            <!-- Cat-Eye Wing Accents -->
            <polygon points="105,170 125,135 155,148" fill="${frameColor}" />
            <polygon points="495,170 475,135 445,148" fill="${frameColor}" />
            <!-- Temples -->
            <path d="M110 160 L40 190" stroke="${frameColor}" stroke-width="14" stroke-linecap="round" />
            <path d="M490 160 L560 190" stroke="${frameColor}" stroke-width="14" stroke-linecap="round" />
        `;
        lensPaths = `
            <path d="M130 218 C122 170, 148 152, 235 160 C275 164, 295 186, 278 226 C262 266, 148 258, 130 218 Z" fill="${lensColor}" opacity="0.82" />
            <path d="M470 218 C478 170, 452 152, 365 160 C325 164, 305 186, 322 226 C338 266, 452 258, 470 218 Z" fill="${lensColor}" opacity="0.82" />
        `;
    } else if (frameStyle === 'kids-round') {
        framePaths = `
            <!-- Left Rim Round Soft -->
            <circle cx="205" cy="210" r="72" fill="none" stroke="${frameColor}" stroke-width="20" />
            <!-- Right Rim Round Soft -->
            <circle cx="395" cy="210" r="72" fill="none" stroke="${frameColor}" stroke-width="20" />
            <!-- Bridge -->
            <path d="M275 200 Q300 185 325 200" fill="none" stroke="${frameColor}" stroke-width="16" stroke-linecap="round" />
            <!-- Flexible Temples -->
            <path d="M135 205 Q70 190 40 225" fill="none" stroke="${frameColor}" stroke-width="14" stroke-linecap="round" />
            <path d="M465 205 Q530 190 560 225" fill="none" stroke="${frameColor}" stroke-width="14" stroke-linecap="round" />
            <!-- Hinge Accents -->
            <circle cx="135" cy="205" r="8" fill="#cbd5e1" />
            <circle cx="465" cy="205" r="8" fill="#cbd5e1" />
        `;
        lensPaths = `
            <circle cx="205" cy="210" r="62" fill="${lensColor}" opacity="0.8" />
            <circle cx="395" cy="210" r="62" fill="${lensColor}" opacity="0.8" />
        `;
    } else if (frameStyle === 'kids-sport') {
        framePaths = `
            <!-- Sport Wrap Frame -->
            <path d="M90 230 C90 170, 160 160, 275 165 C295 165, 305 165, 325 165 C440 160, 510 170, 510 230 C490 270, 420 280, 340 250 C310 240, 290 240, 260 250 C180 280, 110 270, 90 230 Z" fill="none" stroke="${frameColor}" stroke-width="24" stroke-linejoin="round" />
            <!-- Bridge Nosepad -->
            <path d="M280 200 Q300 190 320 200" fill="none" stroke="#334155" stroke-width="18" stroke-linecap="round" />
            <!-- Curved Temples -->
            <path d="M100 200 C60 205, 40 220, 30 240" fill="none" stroke="${frameColor}" stroke-width="18" stroke-linecap="round" />
            <path d="M500 200 C540 205, 560 220, 570 240" fill="none" stroke="${frameColor}" stroke-width="18" stroke-linecap="round" />
        `;
        lensPaths = `
            <!-- Left Sport Lens -->
            <path d="M115 225 C120 180, 175 175, 270 180 C275 220, 220 250, 140 245 Z" fill="${lensColor}" opacity="0.85" />
            <!-- Right Sport Lens -->
            <path d="M485 225 C480 180, 425 175, 330 180 C325 220, 380 250, 460 245 Z" fill="${lensColor}" opacity="0.85" />
        `;
    } else {
        // Rectangle / Square Eyewear
        framePaths = `
            <!-- Left Rectangular Rim -->
            <rect x="130" y="150" width="150" height="110" rx="20" fill="none" stroke="${frameColor}" stroke-width="18" />
            <!-- Right Rectangular Rim -->
            <rect x="320" y="150" width="150" height="110" rx="20" fill="none" stroke="${frameColor}" stroke-width="18" />
            <!-- Bridge -->
            <path d="M280 185 Q300 175 320 185" fill="none" stroke="${frameColor}" stroke-width="14" stroke-linecap="round" />
            <!-- Temples -->
            <path d="M130 185 L50 200" fill="none" stroke="${frameColor}" stroke-width="12" stroke-linecap="round" />
            <path d="M470 185 L550 200" fill="none" stroke="${frameColor}" stroke-width="12" stroke-linecap="round" />
        `;
        lensPaths = `
            <rect x="140" y="160" width="130" height="90" rx="14" fill="${lensColor}" opacity="0.8" />
            <rect x="330" y="160" width="130" height="90" rx="14" fill="${lensColor}" opacity="0.8" />
        `;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
    <defs>
        <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="100%" stop-color="#f8fafc"/>
        </radialGradient>
        <linearGradient id="glare" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.5"/>
            <stop offset="40%" stop-color="#ffffff" stop-opacity="0.1"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
        </linearGradient>
        <filter id="softShadow" x="-10%" y="-10%" width="130%" height="130%">
            <feDropShadow dx="0" dy="18" stdDeviation="16" flood-color="#0f172a" flood-opacity="0.10" />
        </filter>
    </defs>
    <rect width="600" height="400" fill="url(#bgGrad)" />
    
    <!-- Cast Shadow on Studio Floor -->
    <ellipse cx="300" cy="310" rx="220" ry="22" fill="#0f172a" opacity="0.08" />

    <g filter="url(#softShadow)">
        <!-- Lenses -->
        ${lensPaths}
        
        <!-- Lens Glare Reflection -->
        <path d="M150 170 L240 250 L220 250 L140 180 Z" fill="url(#glare)" />
        <path d="M340 170 L430 250 L410 250 L330 180 Z" fill="url(#glare)" />

        <!-- Frames and Temples -->
        ${framePaths}
    </g>
</svg>`;
}

const itemsToCreate = [
    // 151 Cat-Eye additional variants
    { filename: 'prod-151-john-jacobs-cateye-black.svg', frameColor: '#18181b', lensColor: '#27272a', frameStyle: 'cat-eye', name: 'Cat-Eye Onyx Black' },
    { filename: 'prod-151-john-jacobs-cateye-champagne.svg', frameColor: '#b45309', lensColor: '#451a03', frameStyle: 'cat-eye', name: 'Cat-Eye Champagne Tortoise' },

    // 158 Titan Junior Kids
    { filename: 'prod-158-titan-junior-sky-blue.svg', frameColor: '#0284c7', lensColor: '#e0f2fe', frameStyle: 'kids-round', name: 'Sky Blue & Lime' },
    { filename: 'prod-158-titan-junior-royal-blue.svg', frameColor: '#2563eb', lensColor: '#eff6ff', frameStyle: 'kids-round', name: 'Royal Blue' },
    { filename: 'prod-158-titan-junior-cherry-red.svg', frameColor: '#dc2626', lensColor: '#fef2f2', frameStyle: 'kids-round', name: 'Cherry Red' },

    // 159 Vincent Chase Kids Soft-Flex
    { filename: 'prod-159-vincent-chase-kids-pink.svg', frameColor: '#ec4899', lensColor: '#fdf2f8', frameStyle: 'kids-round', name: 'Bubblegum Pink' },
    { filename: 'prod-159-vincent-chase-kids-teal.svg', frameColor: '#0d9488', lensColor: '#f0fdfa', frameStyle: 'kids-round', name: 'Pastel Teal' },
    { filename: 'prod-159-vincent-chase-kids-purple.svg', frameColor: '#7c3aed', lensColor: '#f5f3ff', frameStyle: 'kids-round', name: 'Purple Violet' },

    // 160 Fastrack Kids Sporty
    { filename: 'prod-160-fastrack-kids-red.svg', frameColor: '#e11d48', lensColor: '#1c1917', frameStyle: 'kids-sport', name: 'Electric Red' },
    { filename: 'prod-160-fastrack-kids-blue.svg', frameColor: '#0284c7', lensColor: '#0f172a', frameStyle: 'kids-sport', name: 'Neon Blue' },
    { filename: 'prod-160-fastrack-kids-yellow.svg', frameColor: '#eab308', lensColor: '#18181b', frameStyle: 'kids-sport', name: 'Solar Yellow' },

    // Computer Glasses (152, 153, 154, 155, 156, 157, 161)
    { filename: 'prod-152-vc-screen-crystal.svg', frameColor: '#94a3b8', lensColor: '#dbeafe', frameStyle: 'rectangle', name: 'Transparent Crystal' },
    { filename: 'prod-152-vc-screen-grey.svg', frameColor: '#475569', lensColor: '#dbeafe', frameStyle: 'rectangle', name: 'Smoky Grey' },

    { filename: 'prod-153-jj-bluecut-navy.svg', frameColor: '#1e3a8a', lensColor: '#dbeafe', frameStyle: 'rectangle', name: 'Midnight Blue' },
    { filename: 'prod-153-jj-bluecut-black.svg', frameColor: '#18181b', lensColor: '#dbeafe', frameStyle: 'rectangle', name: 'Matte Black' },

    { filename: 'prod-154-fastrack-shield-grey.svg', frameColor: '#475569', lensColor: '#e0e7ff', frameStyle: 'rectangle', name: 'Matte Grey' },
    { filename: 'prod-154-fastrack-shield-brown.svg', frameColor: '#78350f', lensColor: '#fef3c7', frameStyle: 'rectangle', name: 'Crystal Brown' },

    { filename: 'prod-155-titan-workpro-black.svg', frameColor: '#0f172a', lensColor: '#e2e8f0', frameStyle: 'rectangle', name: 'Matte Black' },
    { filename: 'prod-155-titan-workpro-gunmetal.svg', frameColor: '#334155', lensColor: '#e2e8f0', frameStyle: 'rectangle', name: 'Brushed Gunmetal' },

    { filename: 'prod-156-vc-digital-blue.svg', frameColor: '#1e3a5f', lensColor: '#e0f2fe', frameStyle: 'rectangle', name: 'Gunmetal Blue' },
    { filename: 'prod-156-vc-digital-amber.svg', frameColor: '#b45309', lensColor: '#fef3c7', frameStyle: 'rectangle', name: 'Amber Tortoise' },

    { filename: 'prod-157-rayban-shield-silver.svg', frameColor: '#cbd5e1', lensColor: '#f1f5f9', frameStyle: 'rectangle', name: 'Brushed Silver' },
    { filename: 'prod-157-rayban-shield-black.svg', frameColor: '#1e293b', lensColor: '#f1f5f9', frameStyle: 'rectangle', name: 'Satin Black' },

    { filename: 'prod-161-jj-junior-teal.svg', frameColor: '#0f766e', lensColor: '#ccfbf1', frameStyle: 'kids-round', name: 'Navy Teal' },
    { filename: 'prod-161-jj-junior-coral.svg', frameColor: '#f43f5e', lensColor: '#ffe4e6', frameStyle: 'kids-round', name: 'Coral Pink' }
];

itemsToCreate.forEach(item => {
    const svg = createEyewearSvg(item);
    fs.writeFileSync(path.join(outDir, item.filename), svg, 'utf8');
    console.log(`Generated: ${item.filename}`);
});

console.log('All SVG frame variants created successfully.');
