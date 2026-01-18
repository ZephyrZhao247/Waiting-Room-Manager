# Deployment Checklist

Use this checklist to ensure a smooth deployment to production.

## 🔍 Pre-Deployment

### Code Quality

- [ ] All TypeScript errors resolved (`npm run build` succeeds)
- [ ] ESLint passes (`npm run lint`)
- [ ] No console.error or console.warn in production code
- [ ] All TODO/FIXME comments addressed or documented

### Testing

- [ ] Tested CSV upload (both row-based and column-based)
- [ ] Tested with 50+ participant mock data
- [ ] Tested Start Round → End Round flow
- [ ] Tested fallback mode with participants without email
- [ ] Tested error scenarios (invalid CSV, network failures)
- [ ] Tested on multiple browsers (Chrome, Firefox, Safari)
- [ ] Tested state persistence (page refresh)
- [ ] Tested in actual Zoom meeting

### Documentation

- [ ] README.md is up-to-date
- [ ] CHANGELOG.md reflects latest version
- [ ] Sample CSV files are included
- [ ] Operator guide is comprehensive

## 🚀 Deployment Steps

### 1. Build

```bash
npm run build
```

Verify:

- [ ] Build completes without errors
- [ ] `dist/` folder is created
- [ ] `dist/index.html` exists
- [ ] Assets are properly bundled

### 2. Choose Hosting Platform

#### Option A: Vercel

```bash
npm install -g vercel
vercel --prod
```

- [ ] Deployment successful
- [ ] Copy production URL
- [ ] Test URL loads correctly

#### Option B: Netlify

```bash
npm run build
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

- [ ] Deployment successful
- [ ] Copy production URL
- [ ] Test URL loads correctly

#### Option C: Cloudflare Pages

Via Dashboard:

- [ ] Create new project
- [ ] Connect Git repository or upload `dist/` folder
- [ ] Set build command: `npm run build`
- [ ] Set publish directory: `dist`
- [ ] Deploy

### 3. Update Zoom App Configuration

Go to [Zoom Marketplace](https://marketplace.zoom.us/):

- [ ] Navigate to your app
- [ ] Update **Home URL** to production URL
- [ ] Update **Domain Allow List** to production domain
- [ ] Save changes
- [ ] Verify app can be installed

### 4. Test Production

In Zoom Meeting:

- [ ] Uninstall dev version (if installed)
- [ ] Install production version
- [ ] Upload CSV
- [ ] Run through complete Start → End Round flow
- [ ] Check browser console for errors
- [ ] Verify state persists on page refresh

## ✅ Post-Deployment

### Monitoring

- [ ] Check for JavaScript errors in production
- [ ] Monitor user feedback
- [ ] Watch for API rate limits or quota issues

### Documentation

- [ ] Update README with production URL
- [ ] Document any deployment-specific configurations
- [ ] Update CHANGELOG with release date
- [ ] Tag release in Git (if using version control)

### Communication

- [ ] Notify users of production deployment
- [ ] Provide updated installation instructions
- [ ] Share operator guide

## 🔄 Future Deployments

For updates:

1. Make changes in development
2. Test thoroughly with ngrok + Zoom
3. Update CHANGELOG
4. Build and deploy
5. Test in production
6. Monitor for issues

## 🆘 Rollback Plan

If issues occur:

1. Revert Zoom App Home URL to previous version
2. Deploy previous working build
3. Investigate and fix issues
4. Re-deploy when ready

## 🔐 Security Review

Before production:

- [ ] No API keys or secrets in code
- [ ] HTTPS enforced (hosting platform default)
- [ ] CSP headers configured (vercel.json / netlify.toml)
- [ ] Frame-ancestors allows Zoom domains
- [ ] Input validation in place
- [ ] No XSS vulnerabilities

## 📊 Performance

- [ ] Build size is reasonable (< 5MB)
- [ ] Assets are minified
- [ ] No unnecessary dependencies
- [ ] Lazy loading where appropriate

## ✨ Nice to Have

- [ ] Set up CI/CD pipeline
- [ ] Add error tracking (Sentry, LogRocket)
- [ ] Add analytics (if needed)
- [ ] Set up automated testing
- [ ] Create staging environment

---

**Date Deployed**: ******\_******

**Deployed By**: ******\_******

**Version**: ******\_******

**Production URL**: ******\_******
