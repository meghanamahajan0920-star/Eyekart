const fs = require('fs');
const path = require('path');
const { promiseDb } = require('../db');

const targetDir = path.resolve(__dirname, '../../frontend/public/images/products');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const downloadsToComplete = [
  // Product 151 Cat-Eye Variants
  {
    dest: 'prod-151-john-jacobs-cateye-black.jpg',
    url: 'https://upload.wikimedia.org/wikipedia/commons/9/97/Sunglasses-1.jpg'
  },
  {
    dest: 'prod-151-john-jacobs-cateye-champagne.jpg',
    url: 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Issac_Mizrahi_Sunglasses_%283539187941%29.jpg'
  },

  // Product 152: Vincent Chase Screen
  {
    dest: 'prod-152-vc-screen-grey.jpg',
    url: 'https://upload.wikimedia.org/wikipedia/commons/1/1b/DKNY_Glasses.JPG'
  },

  // Product 153: John Jacobs Blue Cut
  {
    dest: 'prod-153-jj-bluecut-navy.jpg',
    url: 'https://upload.wikimedia.org/wikipedia/commons/f/f2/Close_up_of_the_glasses_with_light_blue_frame_on_a_blue_laptop.jpg'
  },
  {
    dest: 'prod-153-jj-bluecut-black.jpg',
    url: 'https://upload.wikimedia.org/wikipedia/commons/1/13/Black_Framed_Glasses.jpg'
  },

  // Product 154: Fastrack Screen Shield
  {
    dest: 'prod-154-fastrack-shield-grey.jpg',
    url: 'https://upload.wikimedia.org/wikipedia/commons/a/af/Briller2.JPG'
  },

  // Product 155: Titan WorkPro
  {
    dest: 'prod-155-titan-workpro-black.jpg',
    url: 'https://upload.wikimedia.org/wikipedia/commons/8/8b/Black_Titanium_Frame_Eyeglasses%2C_JINS_MTF-16S-151B%2C_1.jpg'
  },
  {
    dest: 'prod-155-titan-workpro-gunmetal.jpg',
    url: 'https://upload.wikimedia.org/wikipedia/commons/8/80/Oakley_OX5086_Burrow_2026-08-31_titanium_01.jpg'
  },

  // Product 156: Vincent Chase Digital Pro
  {
    dest: 'prod-156-vc-digital-blue.jpg',
    url: 'https://upload.wikimedia.org/wikipedia/commons/f/f6/Emporio_Armani_Glasses.JPG'
  },
  {
    dest: 'prod-156-vc-digital-amber.jpg',
    url: 'https://upload.wikimedia.org/wikipedia/commons/6/65/Tortoise_glasses_%28Unsplash%29.jpg'
  },

  // Product 157: Ray-Ban Tech Shield
  {
    dest: 'prod-157-rayban-shield-silver.jpg',
    url: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/Brille_eingeklappt_%28fcm%29.jpg'
  },
  {
    dest: 'prod-157-rayban-shield-black.jpg',
    url: 'https://upload.wikimedia.org/wikipedia/commons/d/d2/Oakley_OX5086_Burrow_2026-08-31_titanium_02.jpg'
  },

  // Product 158: Titan Junior Kids
  {
    dest: 'prod-158-titan-junior-sky-blue.jpg',
    url: 'https://upload.wikimedia.org/wikipedia/commons/4/4d/Colourful_glasses.jpg'
  },

  // Product 159: Vincent Chase Kids
  {
    dest: 'prod-159-vincent-chase-kids-pink.jpg',
    url: 'https://upload.wikimedia.org/wikipedia/commons/7/7f/Pink_glasses_are_always_better.jpg'
  },
  {
    dest: 'prod-159-vincent-chase-kids-teal.jpg',
    url: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/Celluloid_eye_glasses_-_perfection._%28front%29_-_9670247469.jpg'
  },

  // Product 160: Fastrack Kids Sport Sunglasses
  {
    dest: 'prod-160-fastrack-kids-red.jpg',
    url: 'https://upload.wikimedia.org/wikipedia/commons/c/c0/Oakleyjulietruby.jpg'
  },
  {
    dest: 'prod-160-fastrack-kids-blue.jpg',
    url: 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Reflective_sunglasses_%28Unsplash%29.jpg'
  },
  {
    dest: 'prod-160-fastrack-kids-yellow.jpg',
    url: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/Sun_Glasses.jpg'
  },

  // Product 161: John Jacobs Junior Computer
  {
    dest: 'prod-161-jj-junior-teal.jpg',
    url: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Elegant_glasses_%28Unsplash%29.jpg'
  },
  {
    dest: 'prod-161-jj-junior-coral.jpg',
    url: 'https://upload.wikimedia.org/wikipedia/commons/1/11/1950sGlasses_%28cropped%29.jpg'
  }
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function downloadWithRetry(url, destPath, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await sleep(2200); // 2.2s rate-limiting delay between requests
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'EyeKartProductCatalog/1.0 (Windows NT 10.0; Win64; x64; contact@eyekart.com)'
        }
      });
      if (res.status === 429) {
        console.warn(`! Rate limited (429) on ${path.basename(destPath)}, waiting 6 seconds (attempt ${attempt}/${maxRetries})...`);
        await sleep(6000);
        continue;
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(destPath, buffer);
      return buffer.length;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      console.warn(`! Retry ${attempt} failed for ${path.basename(destPath)}: ${err.message}, waiting 4s...`);
      await sleep(4000);
    }
  }
}

async function run() {
  console.log('--- Resuming Downloads with Rate-Limiting & Backoff ---');
  let successCount = 0;
  let skipCount = 0;

  for (const item of downloadsToComplete) {
    const destPath = path.join(targetDir, item.dest);
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 2000) {
      console.log(`- Already present: ${item.dest} (${Math.round(fs.statSync(destPath).size / 1024)} KB)`);
      skipCount++;
      continue;
    }

    try {
      const bytes = await downloadWithRetry(item.url, destPath);
      console.log(`✓ Downloaded ${item.dest} (${Math.round(bytes / 1024)} KB)`);
      successCount++;
    } catch (err) {
      console.error(`✗ Failed to download ${item.dest}:`, err.message);
    }
  }

  console.log(`\nDownload summary: ${successCount} new downloaded, ${skipCount} skipped.`);
}

run().catch(console.error);
