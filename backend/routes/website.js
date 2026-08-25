const express = require('express');
const router = express.Router();
const WebsiteSettings = require('../models/WebsiteSettings');
const Product = require('../models/Product');
const requireAuth = require('../middleware/auth');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary if env keys exist
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Helper: upload to cloudinary or return data uri
async function uploadFile(data, folder) {
  if (!data) return '';
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    try {
      const res = await cloudinary.uploader.upload(data, { folder, resource_type: 'auto' });
      return res.secure_url;
    } catch (e) {
      console.warn('Cloudinary upload failed:', e.message);
    }
  }
  return data;
}

// ── GET /api/website/settings — Public: get all settings ───────────────────
router.get('/settings', async (req, res, next) => {
  try {
    let settings = await WebsiteSettings.findOne();
    if (!settings) {
      settings = await WebsiteSettings.create({});
    }
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/website/services — Public: get products marked for website ────
router.get('/services', async (req, res, next) => {
  try {
    const products = await Product.find({ show_on_website: true, is_active: true })
      .select('name description selling_price category images')
      .sort({ name: 1 });
    res.json(products);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/website/settings — Admin: update settings ───────────────────
router.patch('/settings', requireAuth, async (req, res, next) => {
  try {
    const updates = { ...req.body };

    // Upload images if they are base64 data URIs
    const imageFields = ['hero_image', 'about_image', 'og_image', 'logo_url', 'favicon_url'];
    for (const field of imageFields) {
      if (updates[field] && updates[field].startsWith('data:')) {
        updates[field] = await uploadFile(updates[field], 'speednet/website');
      }
    }

    // Upload gallery images
    if (updates.gallery_images && Array.isArray(updates.gallery_images)) {
      for (let i = 0; i < updates.gallery_images.length; i++) {
        const img = updates.gallery_images[i];
        if (img.url && img.url.startsWith('data:')) {
          updates.gallery_images[i].url = await uploadFile(img.url, 'speednet/website/gallery');
        }
      }
    }

    let settings = await WebsiteSettings.findOne();
    if (!settings) {
      settings = await WebsiteSettings.create(updates);
    } else {
      settings = await WebsiteSettings.findByIdAndUpdate(
        settings._id,
        { $set: updates },
        { new: true, runValidators: true }
      );
    }

    res.json(settings);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
