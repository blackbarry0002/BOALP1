# Asset Manifest

Complete inventory of all assets in the Bank of America login page repository.

## CSS Files (`assets/css/`)

| Filename | Size | Purpose | Media |
|----------|------|---------|-------|
| vipaa-v4-jawr.css | ~300KB | Main stylesheet - layout, colors, typography | screen |
| vipaa-v4-jawr-print.css | ~50KB | Print-optimized stylesheet | print |
| styles-02f9478ce6a468f34aef.m.css | ~150KB | Minified component styles | all |

## JavaScript Files (`assets/js/`)

### Core Framework
| Filename | Size | Purpose |
|----------|------|---------|
| vipaa-v4-jawr.js.download | ~800KB | VIPAA framework core |
| cm-jawr.js.download | ~200KB | Content management utilities |
| common-es6-components-f5d20d94b807bc0c8b5a.m.js.download | ~150KB | ES6 component library (minified) |

### Authentication & Login
| Filename | Size | Purpose |
|----------|------|---------|
| script-manager-login.js.download | ~100KB | Login form manager and validation |
| authhub-helper.js.download | ~80KB | Authentication helper functions |
| online-id-vipaa-module-enter-skin.js.download | ~60KB | Online ID module skin |

### Consent & Cookies
| Filename | Size | Purpose |
|----------|------|---------|
| otSDKStub.js.download | ~40KB | OneTrust SDK stub |
| otBannerSdk.js.download | ~120KB | OneTrust cookie consent banner |

### Utilities
| Filename | Size | Purpose |
|----------|------|---------|
| hover.js.download | ~30KB | Hover interaction handlers |
| 4aQ.js.download | ~200KB | Analytics/tracking utilities |
| jquery-migrate-custom.js.download | ~50KB | jQuery compatibility layer |
| ap.js.download | ~40KB | Application utilities |
| kurt.js.download | ~80KB | Utility library (purpose unknown) |
| porte.js.download | ~50KB | Port/communication utility |
| creanza.js.download | ~70KB | Animation/UI utility |
| dis4.js.download | ~30KB | Display utilities |

### Widgets & Components
| Filename | Size | Purpose |
|----------|------|---------|
| gt-secure-fdic-widget-1.0.0-es6-page-41cd8c9ab7d38eeb772d.m.js.download | ~100KB | FDIC widget ES6 (minified) |
| gt-secure-fdic-widget-1.0.0-internal-scripts-ade0ec499f07.js.download | ~50KB | FDIC widget internal scripts |

### Helper & Support
| Filename | Size | Purpose |
|----------|------|---------|
| helper.js.download | ~60KB | General helper functions |
| vendb.js.download | ~40KB | Vendor utilities |

## Image Files (`assets/images/`)

### Logos
| Filename | Size | Format | Purpose |
|----------|------|--------|---------|
| BOA.PNG | ~20KB | PNG | Bank of America logo (alternate) |
| BofA_rgb.png | ~15KB | PNG | BofA RGB logo |
| powered_by_logo.svg | ~2KB | SVG | "Powered by" branding |

### Application Graphics
| Filename | Size | Format | Purpose |
|----------|------|--------|---------|
| mobile_llama.png | ~50KB | PNG | Mobile app promotional graphic |
| pill.png | ~3KB | PNG | UI pill/badge element |

### FDIC Assets
| Filename | Size | Format | Purpose |
|----------|------|--------|---------|
| assets-images-global-fdic-fdic-digital-sign-CSX37f66a3e.svg | ~5KB | SVG | FDIC digital signature |
| assets-images-global-fdic-fdic-wealth-banner-smalldevice-en-CSX7f123629.svg | ~8KB | SVG | FDIC wealth banner (mobile) |

## HTML Files (`assets/html/`)

| Filename | Purpose |
|----------|---------|
| saved_resource.html | Supporting page/resource |
| saved_resource(1).html | Supporting page/resource |
| saved_resource(2).html | Supporting page/resource |
| saved_resource(3).html | Supporting page/resource |
| saved_resource(4).html | Supporting page/resource |
| saved_resource(5).html | Supporting page/resource |
| saved_resource(6).html | Supporting page/resource |

## Vendor Files (`assets/vendor/`)

### Analytics & Tracking
| Filename | Size | Type | Purpose |
|----------|------|------|---------|
| C5ib | 159B | JavaScript (obfuscated) | Analytics invocation - favicon tracking |
| fkh | 71B | JavaScript (obfuscated) | Analytics invocation - header tracking |
| pHAQ | 169B | JavaScript (obfuscated) | Analytics invocation - config tracking |

### Backend Reference
| Filename | Size | Type | Purpose |
|----------|------|------|---------|
| cc.go | ~39KB | Go source | Backend service reference (for documentation) |

## Root Files

| Filename | Purpose |
|----------|---------|
| index.html | Main login page (renamed from original) |
| README.md | Repository documentation |
| ASSETS_MANIFEST.md | This file |
| .gitignore | Git ignore rules |
| package.json | Project metadata |

## Directory Size Summary

| Directory | Item Count | Approx Size |
|-----------|-----------|------------|
| assets/css/ | 3 | ~500KB |
| assets/js/ | 20 | ~2.8MB |
| assets/images/ | 7 | ~130KB |
| assets/html/ | 7 | ~200KB |
| assets/vendor/ | 4 | ~40KB |
| **Total** | **41** | **~3.7MB** |

## Notes

### File Extensions
- `.js.download` - JavaScript files captured with .download extension (common with web captures)
- `.svg` - Scalable Vector Graphics
- `.png` - Portable Network Graphics
- `.go` - Go programming language source

### Obfuscated Files
Files in `assets/vendor/` (C5ib, fkh, pHAQ) contain obfuscated JavaScript that makes calls to a `___sc30306` object. These are analytics/tracking invocations and are preserved as-is for archival completeness.

### VIPAA Framework
The VIPAA (Vandelay Integrated Platform Application Architecture) framework appears to be Bank of America's proprietary frontend framework. Key components:
- `vipaa-v4-jawr.*` - Core framework and styles
- `cm-jawr.js` - Content management layer
- OneTrust integration for cookie consent
- FDIC compliance widgets

### Asset Paths in HTML
All asset references in `index.html` use relative paths:
- CSS: `./assets/css/filename.css`
- JS: `./assets/js/filename.js.download`
- Images: `./assets/images/filename.ext`
- Vendor: `./assets/vendor/filename`

---

**Last Updated**: June 28, 2026
**Total Files**: 41
**Repository Size**: ~3.7 MB
