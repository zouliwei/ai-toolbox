import { useState, useMemo, useEffect } from 'react';
import './App.css';
import './adventure.css';
import dbJson from './data.json';
import type { AIApp, AICompany, AIModel } from './types';

type ViewMode = 'classic' | 'adventure';

// ─── TYPE AUGMENTATIONS FOR ENRICHED JSON ────────────────────────────────────
const db = dbJson as {
  types?: { name: string; nameCn?: string; nameTw?: string; sorting: number }[];
  outputs?: { name: string; nameCn?: string; nameTw?: string; sorting: number }[];
  apps: AIApp[];
  companies: AICompany[];
  models: AIModel[];
};

type Language = 'en' | 'cn' | 'tw';

// ─── STATIC TRANSLATIONS DICTIONARY ─────────────────────────────────────────
const TITLES_DICT: Record<string, { cn: string; tw: string }> = {
  'AI Toolbox': { cn: 'AI 工具箱', tw: 'AI 工具箱' },
  'App Type': { cn: '应用类型', tw: '應用類型' },
  'Output Modality': { cn: '输出模态', tw: '輸出模態' },
  'Company Location': { cn: '公司属地', tw: '公司屬地' },
  'Used by Apps': { cn: '相关应用', tw: '相關應用' },
  'Proprietary MODELS': { cn: '专属模型', tw: '專屬模型' },
  'Apps': { cn: '应用', tw: '應用' },
  'Models': { cn: '模型', tw: '模型' },
  'APPS': { cn: '应用', tw: '應用' },
  'MODELS': { cn: '模型', tw: '模型' },
  'COMPANIES': { cn: '公司', tw: '公司' },
  'SEARCH...': { cn: '搜索...', tw: '搜尋...' },
  'Intl Site →': { cn: '国际链接 →', tw: '國際連結 →' },
  'CN Site →': { cn: '国内链接 →', tw: '國內連結 →' },
};

const COUNTRY_DICT: Record<string, { cn: string; tw: string }> = {
  'China': { cn: '中国', tw: '中國' },
  'USA': { cn: '美国', tw: '美國' },
};

type Tab = 'Apps' | 'Models' | 'Companies';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/** Translate a static UI string */
function t(key: string, language: Language): string {
  if (language === 'en') return key;
  return TITLES_DICT[key]?.[language] ?? key;
}

/** Resolve the display name of an item respecting language */
function displayName(item: { name: string; nameCn?: string; nameTw?: string }, language: Language): string {
  if (language === 'en' || !item.nameCn) return item.name;
  return language === 'tw' ? (item.nameTw || item.nameCn) : item.nameCn;
}

/** Look up a company's Chinese name from the companies list */
function companyDisplayName(companyEnName: string, language: Language): string {
  if (language === 'en') return companyEnName;
  const found = db.companies.find(c => c.name === companyEnName);
  if (!found || !found.nameCn) return companyEnName;
  return language === 'tw' ? (found.nameTw || found.nameCn) : found.nameCn;
}

function countryDisplay(country: string, language: Language): string {
  if (language === 'en') return country;
  return COUNTRY_DICT[country]?.[language] ?? country;
}

/** Translate a type string (e.g. "General Assistant" → "通用助手") */
function typeDisplay(typeName: string, language: Language): string {
  if (language === 'en') return typeName;
  const found = db.types?.find(t => t.name === typeName);
  if (!found || !found.nameCn) return typeName;
  return language === 'tw' ? (found.nameTw || found.nameCn) : found.nameCn;
}

/** Translate an output string (e.g. "Text" → "文字") */
function outputDisplay(outputName: string, language: Language): string {
  if (language === 'en') return outputName;
  const found = db.outputs?.find(o => o.name === outputName);
  if (!found || !found.nameCn) return outputName;
  return language === 'tw' ? (found.nameTw || found.nameCn) : found.nameCn;
}

// ─── APP COMPONENT ────────────────────────────────────────────────────────────

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('Apps');
  const [search, setSearch] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [language, setLanguage] = useState<Language>('en');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const stored = localStorage.getItem('ai-toolbox-view-mode');
      return (stored === 'classic' ? 'classic' : 'adventure') as ViewMode;
    } catch { return 'adventure'; }
  });

  useEffect(() => {
    try { localStorage.setItem('ai-toolbox-view-mode', viewMode); } catch { /* noop */ }
  }, [viewMode]);

  const toggleViewMode = () =>
    setViewMode(prev => prev === 'classic' ? 'adventure' : 'classic');

  // Dynamic filters based on active tab
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(new Set());
  const [selectedOutputs, setSelectedOutputs] = useState<Set<string>>(new Set());

  // Aggregate possibilities for filters (keyed by English, displayed per language)
  const allTypes = useMemo(() => {
    if (db.types) {
      return [...db.types].sort((a, b) => a.sorting - b.sorting);
    }
    return Array.from(new Set(db.apps.map(a => a.type).filter(Boolean)))
      .sort()
      .map(name => ({ name, nameCn: undefined, nameTw: undefined, sorting: 0 }));
  }, []);

  const allCountries = useMemo(() => {
    let list: string[] = [];
    if (activeTab === 'Apps') list = db.apps.map(a => a.country);
    else if (activeTab === 'Companies') list = db.companies.map(c => c.country);
    else list = db.models.map(m => m.country);
    return Array.from(new Set(list.filter(Boolean))).sort();
  }, [activeTab]);

  const allOutputs = useMemo(() => {
    if (db.outputs) {
      return [...db.outputs].sort((a, b) => a.sorting - b.sorting);
    }
    let list: string[] = [];
    if (activeTab === 'Apps') list = db.apps.flatMap(a => a.outputs);
    else if (activeTab === 'Models') list = db.models.flatMap(m => m.outputs);
    return Array.from(new Set(list.filter(Boolean)))
      .sort()
      .map(name => ({ name, nameCn: undefined, nameTw: undefined, sorting: 0 }));
  }, [activeTab]);

  // ─── TAB + FILTER HANDLERS ──────────────────────────────────────────────────

  const handleTabSwitch = (tab: Tab) => {
    setActiveTab(tab);
  };

  const toggleFilter = (set: Set<string>, val: string, updateFn: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    updateFn(next);
  };

  // ─── FILTERING WITH CROSS-LINGUAL SEARCH ────────────────────────────────────

  const filteredApps = useMemo(() => {
    const q = search.toLowerCase();
    return db.apps.filter(item => {
      const companyObj = db.companies.find(c => c.name === item.company);
      const matchSearch =
        item.name.toLowerCase().includes(q) ||
        (item.nameCn?.toLowerCase().includes(q) ?? false) ||
        (item.nameTw?.toLowerCase().includes(q) ?? false) ||
        item.company.toLowerCase().includes(q) ||
        (companyObj?.nameCn?.toLowerCase().includes(q) ?? false) ||
        (companyObj?.nameTw?.toLowerCase().includes(q) ?? false) ||
        item.models.some(mName => {
          const m = db.models.find(model => model.name === mName);
          return mName.toLowerCase().includes(q) || (m?.nameCn?.toLowerCase().includes(q) ?? false) || (m?.nameTw?.toLowerCase().includes(q) ?? false);
        });
      const matchType = selectedTypes.size === 0 || Array.from(selectedTypes).every(t => item.type === t);
      const matchCountry = selectedCountries.size === 0 || Array.from(selectedCountries).every(c => item.country === c);
      const matchOutput = selectedOutputs.size === 0 || Array.from(selectedOutputs).every(o => item.outputs.includes(o));
      return matchSearch && matchType && matchCountry && matchOutput;
    });
  }, [search, selectedTypes, selectedCountries, selectedOutputs]);

  const filteredCompanies = useMemo(() => {
    const q = search.toLowerCase();
    return db.companies.filter(item => {
      const matchSearch =
        item.name.toLowerCase().includes(q) ||
        (item.nameCn?.toLowerCase().includes(q) ?? false) ||
        (item.nameTw?.toLowerCase().includes(q) ?? false) ||
        item.apps.some(aName => {
          const a = db.apps.find(app => app.name === aName);
          return aName.toLowerCase().includes(q) || (a?.nameCn?.toLowerCase().includes(q) ?? false) || (a?.nameTw?.toLowerCase().includes(q) ?? false);
        }) ||
        item.models.some(mName => {
          const m = db.models.find(model => model.name === mName);
          return mName.toLowerCase().includes(q) || (m?.nameCn?.toLowerCase().includes(q) ?? false) || (m?.nameTw?.toLowerCase().includes(q) ?? false);
        });
      const matchCountry = selectedCountries.size === 0 || Array.from(selectedCountries).every(c => item.country === c);
      return matchSearch && matchCountry;
    });
  }, [search, selectedCountries]);

  const filteredModels = useMemo(() => {
    const q = search.toLowerCase();
    return db.models.filter(item => {
      const companyObj = db.companies.find(c => c.name === item.company);
      const matchSearch =
        item.name.toLowerCase().includes(q) ||
        (item.nameCn?.toLowerCase().includes(q) ?? false) ||
        (item.nameTw?.toLowerCase().includes(q) ?? false) ||
        item.company.toLowerCase().includes(q) ||
        (companyObj?.nameCn?.toLowerCase().includes(q) ?? false) ||
        (companyObj?.nameTw?.toLowerCase().includes(q) ?? false) ||
        item.apps.some(aName => {
          const a = db.apps.find(app => app.name === aName);
          return aName.toLowerCase().includes(q) || (a?.nameCn?.toLowerCase().includes(q) ?? false) || (a?.nameTw?.toLowerCase().includes(q) ?? false);
        });
      const matchCountry = selectedCountries.size === 0 || Array.from(selectedCountries).every(c => item.country === c);
      const matchOutput = selectedOutputs.size === 0 || Array.from(selectedOutputs).every(o => item.outputs.includes(o));
      return matchSearch && matchCountry && matchOutput;
    });
  }, [search, selectedCountries, selectedOutputs]);

  // ─── RENDER ──────────────────────────────────────────────────────────────────

  return (
    <div className="app-container" data-theme={viewMode === 'adventure' ? 'adventure' : undefined}>
      {/* MOBILE OVERLAY */}
      <div 
        className={`sidebar-overlay ${isMobileMenuOpen ? 'open' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* SIDEBAR */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header-desktop">
          <h1>{t('AI Toolbox', language)}</h1>
        </div>

        <div className="search-group">
          <input
            id="search-input"
            type="text"
            className="search-box brutal-shadow"
            placeholder={t('SEARCH...', language)}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className="mobile-close-btn" onClick={() => setIsMobileMenuOpen(false)} aria-label="Close menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>

        {(activeTab === 'Apps' || activeTab === 'Models' || activeTab === 'Companies') && (
          <FilterSection
            title={t('Company Location', language)}
            options={allCountries.map(c => ({ value: c, label: countryDisplay(c, language) }))}
            selected={selectedCountries}
            onChange={(val) => toggleFilter(selectedCountries, val, setSelectedCountries)}
          />
        )}

        {(activeTab === 'Apps' || activeTab === 'Models') && (
          <FilterSection
            title={t('Output Modality', language)}
            options={allOutputs.map(o => ({ value: o.name, label: outputDisplay(o.name, language) }))}
            selected={selectedOutputs}
            onChange={(val) => toggleFilter(selectedOutputs, val, setSelectedOutputs)}
          />
        )}

        {activeTab === 'Apps' && (
          <FilterSection
            title={t('App Type', language)}
            options={allTypes.map(tp => ({ value: tp.name, label: typeDisplay(tp.name, language) }))}
            selected={selectedTypes}
            onChange={(val) => toggleFilter(selectedTypes, val, setSelectedTypes)}
          />
        )}

        <div className="sidebar-mobile-controls mobile-only">
          <GlobalControls 
            language={language} 
            setLanguage={setLanguage} 
            viewMode={viewMode} 
            toggleViewMode={toggleViewMode} 
          />
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <div className="mobile-header">
          <h1>{t('AI Toolbox', language)}</h1>
          <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)} aria-label="Open menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
        <header className="header">
          <div className="tab-group">
            <button
              id="tab-apps"
              className={`tab-btn ${activeTab === 'Apps' ? 'active' : ''}`}
              onClick={() => handleTabSwitch('Apps')}
            >
              {t('APPS', language)} ({filteredApps.length})
            </button>
            <button
              id="tab-models"
              className={`tab-btn ${activeTab === 'Models' ? 'active' : ''}`}
              onClick={() => handleTabSwitch('Models')}
            >
              {t('MODELS', language)} ({filteredModels.length})
            </button>
            <button
              id="tab-companies"
              className={`tab-btn ${activeTab === 'Companies' ? 'active' : ''}`}
              onClick={() => handleTabSwitch('Companies')}
            >
              {t('COMPANIES', language)} ({filteredCompanies.length})
            </button>
          </div>
          <div className="desktop-only">
            <GlobalControls 
              language={language} 
              setLanguage={setLanguage} 
              viewMode={viewMode} 
              toggleViewMode={toggleViewMode} 
            />
          </div>
        </header>

        <section className="grid-container">
          {activeTab === 'Apps' && filteredApps.map(app => (
            <AppCard key={app.name} app={app} language={language} />
          ))}
          {activeTab === 'Models' && filteredModels.map(model => (
            <ModelCard key={model.name} model={model} language={language} />
          ))}
          {activeTab === 'Companies' && filteredCompanies.map(company => (
            <CompanyCard key={company.name} company={company} language={language} />
          ))}
        </section>
      </main>
    </div>
  );
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function GlobalControls({ language, setLanguage, viewMode, toggleViewMode }: any) {
  return (
    <div className="header-controls">
      {/* Language Toggle */}
      <div className="lang-toggle" role="group" aria-label="Language toggle">
        <button
          className={`lang-btn ${language === 'en' ? 'active' : ''}`}
          onClick={() => setLanguage('en')}
        >
          EN
        </button>
        <button
          className={`lang-btn ${language === 'cn' ? 'active' : ''}`}
          onClick={() => setLanguage('cn')}
        >
          简
        </button>
        <button
          className={`lang-btn ${language === 'tw' ? 'active' : ''}`}
          onClick={() => setLanguage('tw')}
        >
          繁
        </button>
      </div>
      {/* Theme Toggle */}
      <ThemeToggle mode={viewMode} onToggle={toggleViewMode} />
    </div>
  );
}

// SVG Icons — illustrative, colorful style
function CompassIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" fill="currentColor" opacity="0.7" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity="0.15" />
      <rect x="13" y="3" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity="0.15" />
      <rect x="3" y="13" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity="0.15" />
      <rect x="13" y="13" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity="0.15" />
    </svg>
  );
}

function ThemeToggle({ mode, onToggle }: { mode: ViewMode; onToggle: () => void }) {
  return (
    <button
      id="theme-toggle"
      className="theme-toggle-btn"
      onClick={onToggle}
      aria-label={`Switch to ${mode === 'classic' ? 'Adventure' : 'Classic'} mode`}
      title={mode === 'classic' ? '✨ Adventure Mode' : '⊞ Classic Mode'}
    >
      {mode === 'classic' ? <CompassIcon /> : <GridIcon />}
    </button>
  );
}

interface FilterOption { value: string; label: string; }

function FilterSection({
  title,
  options,
  selected,
  onChange,
}: {
  title: string;
  options: FilterOption[];
  selected: Set<string>;
  onChange: (val: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="filter-group">
      <h3 className="filter-title">{title}</h3>
      {options.map(opt => (
        <label key={opt.value} className="filter-label">
          <input
            type="checkbox"
            className="filter-checkbox"
            checked={selected.has(opt.value)}
            onChange={() => onChange(opt.value)}
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}

function PillList({ items, translate }: { items: string[]; translate?: (s: string) => string }) {
  if (!items || items.length === 0) return <span className="data-value">-</span>;
  return (
    <div className="pill-group">
      {items.map(m => <span key={m} className="pill">{translate ? translate(m) : m}</span>)}
    </div>
  );
}

function AppCard({ app, language }: { app: AIApp; language: Language }) {
  const companyLabel = companyDisplayName(app.company, language);
  return (
    <article className="card">
      <div className="card-header">
        <h2 className="card-title">{displayName(app, language)}</h2>
        <div className="card-subtitle">{companyLabel} &bull; {countryDisplay(app.country, language)}</div>
      </div>
      <div className="card-body">
        <div className="data-row">
          <span className="data-label">{t('App Type', language)}</span>
          <PillList items={app.type ? [app.type] : []} translate={s => typeDisplay(s, language)} />
        </div>
        <div className="data-row">
          <span className="data-label">{t('Output Modality', language)}</span>
          <PillList items={app.outputs} translate={s => outputDisplay(s, language)} />
        </div>
        <div className="data-row">
          <span className="data-label">{t('Proprietary MODELS', language)}</span>
          <PillList items={app.models} />
        </div>
      </div>
      <div className="card-footer">
        {app.linkIntl && (
          <a href={app.linkIntl} target="_blank" rel="noreferrer" className="link-btn">{t('Intl Site →', language)}</a>
        )}
        {app.linkCn && (
          <a href={app.linkCn} target="_blank" rel="noreferrer" className="link-btn" style={{ marginLeft: '8px' }}>{t('CN Site →', language)}</a>
        )}
      </div>
    </article>
  );
}

function ModelCard({ model, language }: { model: AIModel; language: Language }) {
  const companyLabel = companyDisplayName(model.company, language);
  return (
    <article className="card">
      <div className="card-header">
        <h2 className="card-title">{displayName(model, language)}</h2>
        <div className="card-subtitle">{companyLabel} &bull; {countryDisplay(model.country, language)}</div>
      </div>
      <div className="card-body">
        <div className="data-row">
          <span className="data-label">{t('Output Modality', language)}</span>
          <PillList items={model.outputs} translate={s => outputDisplay(s, language)} />
        </div>
        <div className="data-row">
          <span className="data-label">{t('Used by Apps', language)}</span>
          <PillList items={model.apps} translate={s => displayName({ name: s, nameCn: db.apps.find(a => a.name === s)?.nameCn }, language)} />
        </div>
      </div>
    </article>
  );
}

function CompanyCard({ company, language }: { company: AICompany; language: Language }) {
  return (
    <article className="card">
      <div className="card-header">
        <h2 className="card-title">{displayName(company, language)}</h2>
        <div className="card-subtitle">{countryDisplay(company.country, language)}</div>
      </div>
      <div className="card-body">
        <div className="data-row">
          <span className="data-label">{t('Apps', language)}</span>
          <PillList items={company.apps} translate={s => displayName({ name: s, nameCn: db.apps.find(a => a.name === s)?.nameCn }, language)} />
        </div>
        <div className="data-row">
          <span className="data-label">{t('Models', language)}</span>
          <PillList items={company.models} />
        </div>
      </div>
    </article>
  );
}

export default App;
