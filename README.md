# Bank of America Online Banking - Landing Page Repository

Professional repository structure for the Bank of America login page and related banking interface.

## 📁 Directory Structure

```
secure.bankofamerica.com/
├── index.html                    # Main login page
├── assets/
│   ├── css/                      # Stylesheets
│   │   ├── vipaa-v4-jawr.css
│   │   ├── vipaa-v4-jawr-print.css
│   │   └── styles-02f9478ce6a468f34aef.m.css
│   ├── js/                       # JavaScript files
│   │   ├── script-manager-login.js.download
│   │   ├── authhub-helper.js.download
│   │   ├── vipaa-v4-jawr.js.download
│   │   ├── cm-jawr.js.download
│   │   ├── online-id-vipaa-module-enter-skin.js.download
│   │   ├── otBannerSdk.js.download
│   │   ├── otSDKStub.js.download
│   │   ├── common-es6-components-*.js.download
│   │   └── [other utility scripts]
│   ├── images/                   # Images and SVGs
│   │   ├── BOA.PNG
│   │   ├── BofA_rgb.png
│   │   ├── mobile_llama.png
│   │   ├── pill.png
│   │   ├── powered_by_logo.svg
│   │   └── assets-images-global-fdic-*.svg
│   ├── html/                     # Supporting HTML files
│   │   └── saved_resource*.html
│   └── vendor/                   # Third-party/vendor files
│       ├── C5ib (analytics)
│       ├── cc.go (backend reference)
│       ├── fkh (analytics)
│       └── pHAQ (analytics)
├── etc/
│   └── clientlibs/               # Client-side libraries
├── jfe/                          # Future expansion for additional pages
├── .gitignore
├── README.md
├── ASSETS_MANIFEST.md
└── package.json
```

## 🚀 Getting Started

### Local Development Server

Start a local HTTP server to test the page:

```bash
# Using Python 3
python -m http.server 8000

# Or using Node.js (if installed)
npx http-server -p 8000
```

Then open `http://localhost:8000` in your browser.

### Accessing the Page

- Main page: `http://localhost:8000/index.html`
- Root redirect: `http://localhost:8000/`

## 📋 File Organization

### CSS Files (`assets/css/`)
- **vipaa-v4-jawr.css** - Main stylesheet for login interface
- **vipaa-v4-jawr-print.css** - Print media stylesheet
- **styles-02f9478ce6a468f34aef.m.css** - Component styles (minified)

### JavaScript Files (`assets/js/`)
- **script-manager-login.js** - Login form script manager
- **authhub-helper.js** - Authentication helper utilities
- **vipaa-v4-jawr.js** - VIPAA framework
- **otSDKStub.js** / **otBannerSdk.js** - OneTrust cookie consent SDK
- **hover.js** - Hover interaction handlers
- **4aQ.js** - Analytics/tracking utility
- **cm-jawr.js** - Content management utilities
- **common-es6-components-*.js** - ES6 component library
- **jquery-migrate-custom.js** - jQuery compatibility layer

### Images (`assets/images/`)
- Logo files: BOA.PNG, BofA_rgb.png
- Supporting graphics: mobile_llama.png, pill.png, powered_by_logo.svg
- FDIC banner assets: SVG graphics

### Vendor Files (`assets/vendor/`)
- **C5ib** - Obfuscated analytics invocation script
- **cc.go** - Backend service reference (Go source)
- **fkh** - Analytics tracking invocation
- **pHAQ** - Analytics configuration

## ⚠️ Known Issues

### Remote Dependencies
The page attempts to load resources from `secure.bankofamerica.com` and related domains:
- Authentication services won't function offline
- Real-time heartbeat checks will fail
- Remote tracking/analytics scripts may throw errors

### JavaScript Console Errors
Expected errors when running locally:
```
TypeError: Cannot read properties of undefined (reading 'split')
  at _checkHeartBeatStatus (script-manager-login.js)
```
These are expected because the local version doesn't have access to Bank of America's remote authentication servers.

### Form Functionality
- ❌ Login form won't submit (no backend)
- ❌ Password reset won't work
- ❌ Real authentication unavailable
- ✅ Visual layout and styling work perfectly
- ✅ UI interactions render correctly

## 📊 Asset Inventory

| Type | Count | Location |
|------|-------|----------|
| CSS Files | 3 | `assets/css/` |
| JavaScript Files | 20 | `assets/js/` |
| Images | 7 | `assets/images/` |
| HTML Resources | 7 | `assets/html/` |
| Vendor Files | 4 | `assets/vendor/` |

See `ASSETS_MANIFEST.md` for detailed file listing.

## 🔄 Version Control

This repository uses Git for version control.

### Initialize Repository (First Time)
```bash
git init
git add .
git commit -m "Initial commit: BOA login page repository"
```

### Common Commands
```bash
git status                          # Check changes
git add <file>                      # Stage changes
git commit -m "Description"         # Commit changes
git log                             # View history
```

## 📝 Contributing

When making changes:
1. Maintain the directory structure
2. Update relative paths if moving files
3. Test locally before committing
4. Document changes in commit messages

## 📜 License

This is a static capture of a Bank of America web page for educational and archival purposes.

## 🔗 References

- **Source URL**: https://secure.bankofamerica.com/login/sign-in/signOnV2Screen.go
- **Captured**: June 28, 2026
- **Framework**: VIPAA (Vandelay Integrated Platform Application Architecture)
- **Cookie Management**: OneTrust

## 📧 Support

For issues or questions about this repository structure, refer to:
- `ASSETS_MANIFEST.md` - Detailed asset documentation
- Original source code comments in HTML files
- Framework documentation in `assets/js/` comments

---

**Last Updated**: June 28, 2026
