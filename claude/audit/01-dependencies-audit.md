# Dependencies Audit Report

**Generated:** 2025-11-17  
**Project:** theopenbrain.org v0.1.20

---

## Executive Summary

The project uses Vue 3 ecosystem packages that are mostly up-to-date, but several key dependencies have major version updates available. The project uses `--legacy-peer-deps` flag suggesting peer dependency conflicts that should be investigated.

---

## Dependency Analysis

### Critical Updates Required

#### 1. **@vueuse/core** (9.12.0 → 14.0.0)
- **Current:** 9.12.0
- **Latest:** 14.0.0
- **Severity:** HIGH
- **Breaking Changes:** Major version jump (9 → 14)
- **Impact:** The project uses `useMediaQuery` and `watchDebounced` from this library. These APIs are generally stable but should be tested.
- **Recommendation:** Upgrade to v14.x with thorough testing. Check migration guides for v10, v11, v12, v13, and v14.
- **Risk:** Medium - Core utilities are used in App.vue for responsive behavior

#### 2. **Pinia** (2.0.23 → 3.0.4)
- **Current:** 2.0.23
- **Latest:** 3.0.4
- **Severity:** HIGH
- **Breaking Changes:** Major version jump (2 → 3)
- **Impact:** Core state management library. The entire application relies heavily on Pinia stores (useGeneral, useText, useAnimation, useCom).
- **Recommendation:** Review Pinia 3.0 migration guide carefully. The router injection pattern using `markRaw()` may need adjustment.
- **Risk:** HIGH - Central to application architecture
- **Note:** Also running an outdated v2 version (2.0.23 vs latest 2.x which would be ~2.3.x)

#### 3. **@vue/eslint-config-prettier** (7.0.0 → 10.2.0)
- **Current:** 7.0.0
- **Latest:** 10.2.0
- **Severity:** MEDIUM
- **Breaking Changes:** Multiple major versions
- **Impact:** Linting configuration only, no runtime impact
- **Recommendation:** Safe to upgrade, may need ESLint config adjustments
- **Risk:** LOW

### Dependencies with Pre-release Versions

#### 4. **@formkit/auto-animate** (1.0.0-beta.3)
- **Current:** 1.0.0-beta.3 (pre-release)
- **Latest Stable:** 0.9.0
- **Severity:** MEDIUM
- **Issue:** Project is using a beta/pre-release version (1.0.0-beta.3) while the latest stable is 0.9.0
- **Impact:** May have undocumented breaking changes or bugs
- **Recommendation:** Either:
  - Downgrade to stable 0.9.0 if beta features aren't required
  - Monitor for 1.0.0 stable release
  - Document which beta features are being used
- **Risk:** MEDIUM - Pre-release software in production

### Build Tools (DevDependencies)

#### 5. **Vite** (3.0.9)
- **Current:** 3.0.9
- **Latest:** 5.x (Vite has moved to v5)
- **Severity:** HIGH
- **Breaking Changes:** Major versions 4 and 5 released
- **Impact:** Build performance, HMR, plugin compatibility
- **Recommendation:** Upgrade to Vite 5.x for better performance and security
- **Risk:** MEDIUM - Requires testing build process
- **Benefits:**
  - Improved build performance
  - Better error messages
  - Updated Rollup version
  - Security patches

#### 6. **Tailwind CSS** (3.1.8)
- **Current:** 3.1.8
- **Latest:** 3.4.x
- **Severity:** LOW
- **Impact:** Minor version updates within v3
- **Recommendation:** Update to 3.4.x for new features and bug fixes
- **Risk:** LOW - No breaking changes expected

#### 7. **ESLint** (8.29.0)
- **Current:** 8.29.0
- **Latest:** 8.x/9.x
- **Severity:** MEDIUM
- **Impact:** Linting only
- **Recommendation:** Update to latest 8.x or evaluate 9.x migration
- **Risk:** LOW

#### 8. **Autoprefixer** & **PostCSS** (Implicit)
- Check for updates to ensure CSS compatibility
- Current versions from package.json: autoprefixer@10.4.12, postcss@8.4.17

### Up-to-Date Dependencies ✓

The following dependencies are current:
- **vue** (3.2.38 → 3.5.24) - *Actually needs update*
- **vue-router** (4.1.5 → 4.6.3) - *Actually needs update*
- **gsap** (3.11.3 → 3.13.0) - *Actually needs update*
- **lottie-web** (5.9.6 → 5.13.0) - *Actually needs update*
- **file-saver** (2.0.5) ✓
- **vite-plugin-html** (3.2.0) ✓

Wait, let me correct this - the npm outdated output shows these ARE outdated:

#### 9. **Vue** (3.2.38 → 3.5.24)
- **Current:** 3.2.38
- **Latest:** 3.5.24
- **Severity:** MEDIUM-HIGH
- **Impact:** Core framework - numerous bug fixes and performance improvements
- **Recommendation:** Update to 3.5.x for better TypeScript support and performance
- **Risk:** MEDIUM - Test thoroughly, especially Composition API usage
- **Note:** 3.5 includes significant performance improvements

#### 10. **Vue Router** (4.1.5 → 4.6.3)
- **Current:** 4.1.5
- **Latest:** 4.6.3
- **Severity:** MEDIUM
- **Impact:** Routing - bug fixes and new features
- **Recommendation:** Update to 4.6.x
- **Risk:** LOW-MEDIUM - Router configuration is relatively simple

#### 11. **GSAP** (3.11.3 → 3.13.0)
- **Current:** 3.11.3
- **Latest:** 3.13.0
- **Severity:** LOW
- **Impact:** Animation library - minor version updates
- **Recommendation:** Update for bug fixes and new features
- **Risk:** LOW

#### 12. **Lottie-web** (5.9.6 → 5.13.0)
- **Current:** 5.9.6
- **Latest:** 5.13.0
- **Severity:** LOW
- **Impact:** Lottie animations
- **Recommendation:** Update for bug fixes
- **Risk:** LOW

---

## Package-lock.json Analysis

- **Size:** 310,837 bytes (large)
- **Issue:** Using `--legacy-peer-deps` flag suggests peer dependency conflicts
- **Recommendation:** Investigate what conflicts exist and resolve them properly rather than bypassing with legacy flag

---

## Security Considerations

### npm audit
**Recommendation:** Run `npm audit` to check for known vulnerabilities

```bash
npm audit
npm audit fix  # For automatic fixes
```

### Outdated Transitive Dependencies
- Dependencies like Vite 3.x may have outdated transitive dependencies with security issues
- Upgrading to Vite 5.x would pull in updated, more secure dependencies

---

## Update Strategy

### Phase 1: Low-Risk Updates (Immediate)
1. Update Vue to 3.5.24
2. Update Vue Router to 4.6.3
3. Update GSAP to 3.13.0
4. Update Lottie-web to 5.13.0
5. Update Tailwind CSS to 3.4.x
6. Update ESLint to latest 8.x

### Phase 2: Medium-Risk Updates (After Testing)
1. Update @vueuse/core to 14.0.0 (test useMediaQuery and watchDebounced)
2. Update @vue/eslint-config-prettier to 10.2.0
3. Update Vite to 5.x (thorough build testing required)

### Phase 3: High-Risk Updates (Dedicated Sprint)
1. **Pinia 2.0.23 → 3.0.4**
   - Read migration guide thoroughly
   - Test all stores (useGeneral, useText, useAnimation, useCom)
   - Verify router injection still works
   - Test localStorage persistence
   - Test import/export functionality

2. **@formkit/auto-animate**
   - Determine if beta features are needed
   - Consider downgrade to stable 0.9.0
   - Or wait for 1.0.0 stable release

### Phase 4: Investigate and Resolve
1. Remove `--legacy-peer-deps` requirement
   - Identify peer dependency conflicts
   - Update conflicting packages
   - Ensure clean dependency tree

---

## Testing Checklist for Updates

For each major update, verify:

- [ ] Development server starts (`npm start`)
- [ ] Production build succeeds (`npm run build`)
- [ ] Production preview works (`npm run preview`)
- [ ] Linting passes (`npm run lint`)
- [ ] All routes load correctly
- [ ] Text highlighting system works
- [ ] LocalStorage persistence functions
- [ ] Import/Export feature works
- [ ] Animations play correctly
- [ ] Responsive behavior (media queries)
- [ ] Scroll position preservation
- [ ] All interactive elements function

---

## Additional Recommendations

### 1. Add Cypress Tests
- Currently configured but test coverage is unclear
- Add tests before major dependency updates
- Test critical paths: text highlighting, localStorage, navigation

### 2. Consider TypeScript Migration
- Project has `perlin.ts` but rest is JavaScript
- Vue 3.5+ has excellent TypeScript support
- Would catch breaking changes during updates

### 3. Pin Exact Versions
- Consider using exact versions instead of `^` for critical dependencies
- Prevents unexpected breaks from minor/patch updates

### 4. Update Node.js Version
- Ensure Node.js version meets requirements of newer packages
- Vite 5.x requires Node 18+

### 5. Package.json Cleanup
```json
{
  "dependencies": {
    "@formkit/auto-animate": "^0.9.0",  // Downgrade from beta or wait for 1.0.0
    "@vueuse/core": "^14.0.0",
    "pinia": "^3.0.4",
    "vue": "^3.5.24",
    "vue-router": "^4.6.3",
    "gsap": "^3.13.0",
    "lottie-web": "^5.13.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "@vue/eslint-config-prettier": "^10.2.0"
  }
}
```

---

## Estimated Update Effort

- **Phase 1 (Low-Risk):** 2-4 hours
- **Phase 2 (Medium-Risk):** 4-8 hours
- **Phase 3 (High-Risk):** 8-16 hours (especially Pinia migration)
- **Phase 4 (Peer Deps):** 2-4 hours
- **Total:** 16-32 hours

---

## Conclusion

The project is running on outdated dependencies across the board. The most critical updates are:
1. **Pinia** - Core state management (HIGH RISK, HIGH PRIORITY)
2. **@vueuse/core** - Core utilities (MEDIUM RISK, HIGH PRIORITY)
3. **Vite** - Build tool (MEDIUM RISK, MEDIUM PRIORITY)
4. **Vue & Vue Router** - Framework (MEDIUM RISK, HIGH PRIORITY)

Recommend a phased approach starting with low-risk updates to build confidence, followed by thorough testing before tackling Pinia 3.x migration.
