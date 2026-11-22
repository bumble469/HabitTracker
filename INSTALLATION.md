# 🚀 Installation Guide

This guide will help you get the Habit Tracker Web App up and running on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js** (version 18.0.0 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn** (optional)
- **Git** (for cloning the repository) - [Download here](https://git-scm.com/)

You can check your versions by running:
```bash
node --version
npm --version
git --version
```

## Quick Start

1. **Clone the repository**:
   ```bash
   git clone https://github.com/TheUnknown550/Habit-Tracker-Web-App.git
   cd Habit-Tracker-Web-App
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```
   Or if you prefer yarn:
   ```bash
   yarn install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   Or with yarn:
   ```bash
   yarn dev
   ```

4. **Open your browser** and navigate to `http://localhost:5173`

That's it! 🎉 The app will automatically open in your default browser.

## Optional AI predictions

Core habit tracking and Insights calculations are local and work without a backend. AI is initially off. To connect the prediction service, create `.env.local` in the project root:

```bash
VITE_API_BASE_URL=http://localhost:8000
```

Restart Vite after changing environment variables, then enable AI in the Settings tab. This public frontend variable must contain only the backend base URL; do not expose database credentials or model provider keys.

## Alternative Installation Methods

### Using GitHub CLI (if installed)
```bash
gh repo clone TheUnknown550/Habit-Tracker-Web-App
cd Habit-Tracker-Web-App
npm install
npm run dev
```

### Download ZIP (without Git)
1. Go to the [GitHub repository](https://github.com/TheUnknown550/Habit-Tracker-Web-App)
2. Click the **"Code"** button → **"Download ZIP"**
3. Extract the ZIP file
4. Open terminal in the extracted folder
5. Run `npm install && npm run dev`

## Build for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist/` folder. You can serve them using any static file server:

```bash
npm run preview
```

## Troubleshooting

### Common Issues

**❌ "npm install" fails**
- Make sure you have Node.js 18+ installed
- Try clearing npm cache: `npm cache clean --force`
- Delete `node_modules` and `package-lock.json`, then run `npm install` again

**❌ Port 5173 is already in use**
- The dev server will automatically use the next available port
- Or specify a different port: `npm run dev -- --port 3000`

**❌ "command not found: npm"**
- Install Node.js from [nodejs.org](https://nodejs.org/)
- Restart your terminal/command prompt

**❌ App doesn't load in browser**
- Check that the terminal shows "ready in XXXms"
- Try a different browser
- Clear browser cache
- Check firewall/antivirus settings

**❌ Build fails**
- Ensure all dependencies are installed
- Try `npm run build` again
- Check that you're in the correct directory

### Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint

# Run unit tests
npm test
```

### System Requirements

- **OS**: Windows, macOS, or Linux
- **RAM**: 512MB minimum (1GB recommended)
- **Storage**: ~50MB for dependencies
- **Browser**: Modern browser with JavaScript enabled (Chrome, Firefox, Safari, Edge)

### Offline Usage

Since this app uses localStorage for data storage, it works completely offline once loaded. No internet connection is required for core functionality after the initial setup.

## Deploying to GitHub Pages

The app is configured for automatic deployment to GitHub Pages.

### Automatic Deployment (Recommended)

1. **Enable GitHub Pages**:
   - Go to your repository **Settings** → **Pages**
   - Under **Source**, select **GitHub Actions**

2. **Push to main branch**:
   ```bash
   git add .
   git commit -m "Deploy to GitHub Pages"
   git push origin main
   ```

3. **Wait for deployment** (2-3 minutes):
   - Check the **Actions** tab to monitor progress
   - Your site will be live at: `https://yourusername.github.io/Habit-Tracker-Web-App/`

### Manual Deployment

If you prefer manual deployment:

```bash
# Build the project
npm run build

# The built files are in the dist/ folder
# Upload these to your hosting provider
```

### Deployment to Other Platforms

**Vercel**:
```bash
npm install -g vercel
vercel
```

**Netlify**:
```bash
npm install -g netlify-cli
netlify deploy --prod
```

**Static File Hosting**:
Upload the contents of the `dist/` folder to any static hosting service (AWS S3, Cloudflare Pages, etc.)

---

💡 **Need help?** Check the [main README](README.md) for more information about the app features and usage.