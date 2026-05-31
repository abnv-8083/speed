# SpeedNet

SpeedNet is a modern web application built with React and Vite, utilizing Supabase for database and authentication functionality.

## Tech Stack
* **Frontend:** React, React Router, Vite, TailwindCSS (if applicable), Lucide React
* **Backend Services:** Supabase
* **Deployment:** Optimized for Vercel/Netlify hosting.

## Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Ensure you have a `.env` file in the root directory containing your Supabase project keys:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

## Deployment

To deploy this application to Vercel (or a similar provider):
1. Connect this repository to your hosting provider.
2. Ensure the Build Command is set to `npm run build`.
3. Set the Output Directory to `dist`.
4. Add the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Environment Variables in your hosting dashboard.
