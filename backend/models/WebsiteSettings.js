const mongoose = require('mongoose');

const galleryImageSchema = new mongoose.Schema({
  url:      { type: String, default: '' },
  alt:      { type: String, default: '' },
  caption:  { type: String, default: '' },
}, { timestamps: true });

const websiteSettingsSchema = new mongoose.Schema(
  {
    // Hero Section
    hero_title:       { type: String, default: 'Speed@Net' },
    hero_tagline:     { type: String, default: 'The Best Online Solution' },
    hero_subtitle:    { type: String, default: 'Your one-stop destination for printing, internet, computer services, and digital solutions.' },
    hero_image:       { type: String, default: '' },
    hero_cta_text:    { type: String, default: 'Our Services' },
    hero_cta_link:    { type: String, default: '#services' },

    // About Section
    about_title:      { type: String, default: 'About Speed@Net' },
    about_text:       { type: String, default: 'We are a leading digital services provider offering printing, internet, computer sales & repair, and online services. With years of experience, we deliver quality solutions at affordable prices.' },
    about_image:      { type: String, default: '' },
    about_mission:    { type: String, default: 'To provide reliable and affordable digital solutions to our community.' },
    about_vision:     { type: String, default: 'To be the most trusted technology partner for every customer.' },

    // Services Section
    services_title:   { type: String, default: 'Our Services' },
    services_subtitle:{ type: String, default: 'Comprehensive digital solutions for all your needs' },
    show_services:    { type: Boolean, default: true },

    // Gallery Section
    gallery_title:    { type: String, default: 'Our Work' },
    gallery_subtitle: { type: String, default: 'Take a look at our recent projects and work' },
    gallery_images:   { type: [galleryImageSchema], default: [] },

    // Contact Section
    contact_title:    { type: String, default: 'Contact Us' },
    contact_subtitle: { type: String, default: "Get in touch with us for any queries or services" },
    phone:            { type: String, default: '' },
    email:            { type: String, default: '' },
    address:          { type: String, default: '' },
    map_embed_url:    { type: String, default: '' },
    working_hours:    { type: String, default: 'Mon - Sat: 9:00 AM - 8:00 PM' },

    // Social Media
    facebook:         { type: String, default: '' },
    instagram:        { type: String, default: '' },
    youtube:          { type: String, default: '' },

    // WhatsApp
    whatsapp_number:  { type: String, default: '' },
    whatsapp_message: { type: String, default: 'Hi, I would like to know more about your services.' },

    // Footer
    footer_text:      { type: String, default: '© 2026 Speed@Net. All rights reserved.' },
    copyright_name:   { type: String, default: 'Speed@Net' },

    // SEO
    meta_title:       { type: String, default: 'Speed@Net - The Best Online Solution | Printing, Internet & Computer Services' },
    meta_description: { type: String, default: 'Speed@Net offers printing, internet, computer sales & repair, and online services. Your one-stop digital solution.' },
    meta_keywords:    { type: String, default: 'printing, internet, computer repair, speednet, online services, visiting cards, flex printing' },
    og_image:         { type: String, default: '' },

    // Site Identity
    logo_url:         { type: String, default: '' },
    favicon_url:      { type: String, default: '' },
    brand_color:      { type: String, default: '#06b6d4' },
  },
  { timestamps: true }
);

websiteSettingsSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id;
    return ret;
  },
});

module.exports = mongoose.model('WebsiteSettings', websiteSettingsSchema);
