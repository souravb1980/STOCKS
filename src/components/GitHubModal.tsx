import React, { useState } from 'react';
import {
  Github,
  ExternalLink,
  Copy,
  Check,
  X,
  Terminal,
  GitBranch,
  Download,
  AlertTriangle,
  CheckCircle2,
  UploadCloud,
  Globe,
  Sparkles,
  Zap,
  KeyRound,
  RefreshCw,
  FileCode,
} from 'lucide-react';

interface GitHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  githubUrl: string;
  onUpdateGithubUrl: (newUrl: string) => void;
}

export const GitHubModal: React.FC<GitHubModalProps> = ({
  isOpen,
  onClose,
  githubUrl,
  onUpdateGithubUrl,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [activeTab, setActiveTab] = useState<'auto' | 'single-file' | 'zip-upload' | 'terminal'>('auto');
  const [isEditing, setIsEditing] = useState(false);
  const [customUrl, setCustomUrl] = useState(githubUrl);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 1-Click Automated Publishing state
  const [githubToken, setGithubToken] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{
    success: boolean;
    message: string;
    siteUrl?: string;
  } | null>(null);

  if (!isOpen) return null;

  const currentRepo =
    githubUrl.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '') || 'souravb1980/STOCKS';
  const repoOwner = currentRepo.split('/')[0] || 'souravb1980';
  const repoName = currentRepo.split('/')[1] || 'STOCKS';
  const pagesUrl = `https://${repoOwner}.github.io/${repoName}/`;
  const githubTokenCreateUrl = `https://github.com/settings/tokens/new?scopes=repo&description=${encodeURIComponent(
    'Stock ATH Analyzer Automatic Deploy'
  )}`;

  // Standalone index.html that loads bundle from Cloud Run CDN directly into GitHub Pages
  const standaloneHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Stock ATH & Nifty 500 Outperformance Analyzer</title>
    <meta name="description" content="Institutional equity analyzer tracking stock all-time high prices, PAT milestones, and cumulative outperformance vs Nifty 500." />
    <link rel="icon" type="image/svg+xml" href="https://ais-pre-qvyj3tcy3bbsptuy27dqz2-263654441402.asia-southeast1.run.app/icon.svg" />
    <!-- Pre-compiled stylesheet and JavaScript from live production CDN -->
    <link rel="stylesheet" crossorigin href="https://ais-pre-qvyj3tcy3bbsptuy27dqz2-263654441402.asia-southeast1.run.app/assets/index-DC_3QgvM.css">
    <script type="module" crossorigin src="https://ais-pre-qvyj3tcy3bbsptuy27dqz2-263654441402.asia-southeast1.run.app/assets/index-DnB0nIZF.js"></script>
  </head>
  <body class="bg-slate-950 text-slate-100">
    <div id="root"></div>
  </body>
</html>`;

  const gitCommands = `# 1. Download & extract the pre-compiled bundle, open terminal inside folder
cd stocks-github-pages-ready

# 2. Add remote repository
git remote add origin ${githubUrl.endsWith('.git') ? githubUrl : `${githubUrl}.git`}
git branch -M main

# 3. Force push compiled website
git push -f origin main`;

  const [liveHtml, setLiveHtml] = useState<string>(standaloneHtml);

  React.useEffect(() => {
    fetch('/api/standalone-index-html')
      .then((r) => r.text())
      .then((text) => {
        if (text && text.includes('<!doctype html>')) {
          setLiveHtml(text);
        }
      })
      .catch(() => {});
  }, []);

  const handleCopyCommands = () => {
    navigator.clipboard.writeText(gitCommands);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(liveHtml);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2000);
  };

  const handlePublishAuto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubToken.trim()) return;

    setIsPublishing(true);
    setPublishResult(null);

    try {
      const res = await fetch('/api/publish-to-github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: githubToken.trim(),
          repo: currentRepo,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to publish to GitHub');
      }

      setPublishResult({
        success: true,
        message: data.message,
        siteUrl: data.siteUrl || pagesUrl,
      });
    } catch (err: any) {
      setPublishResult({
        success: false,
        message: err.message || 'Failed to publish to GitHub',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    let trimmed = customUrl.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      trimmed = `https://${trimmed}`;
    }
    onUpdateGithubUrl(trimmed);
    setSaveSuccess(true);
    setIsEditing(false);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Publish to GitHub Pages
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {currentRepo}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Fixing blank screen on {pagesUrl}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto font-sans text-xs sm:text-sm">
          {/* Status Alert */}
          <div className="bg-amber-950/25 border border-amber-500/40 rounded-xl p-4 space-y-2 text-amber-200">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-amber-300">
                  Why is nothing showing right now on your link?
                </h4>
                <p className="text-xs text-amber-200/90 leading-relaxed mt-1">
                  Your GitHub repo currently contains the <strong>uncompiled development code</strong> (<code className="text-white bg-slate-900 px-1 py-0.5 rounded font-mono">src/main.tsx</code>).
                  Browsers on GitHub Pages cannot run TypeScript directly.
                  GitHub Pages needs the <strong>compiled HTML &amp; JS bundle</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* TAB SELECTION */}
          <div className="border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('auto')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 text-xs font-semibold transition shrink-0 cursor-pointer ${
                activeTab === 'auto'
                  ? 'border-emerald-500 text-emerald-400 bg-slate-800/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>1. Automated 1-Click Push (We Do Everything)</span>
            </button>
            <button
              onClick={() => setActiveTab('single-file')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 text-xs font-semibold transition shrink-0 cursor-pointer ${
                activeTab === 'single-file'
                  ? 'border-emerald-500 text-emerald-400 bg-slate-800/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-4 h-4" />
              <span>2. Edit 1 File on GitHub (No Token)</span>
            </button>
            <button
              onClick={() => setActiveTab('zip-upload')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 text-xs font-semibold transition shrink-0 cursor-pointer ${
                activeTab === 'zip-upload'
                  ? 'border-emerald-500 text-emerald-400 bg-slate-800/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>3. Download Pre-Built ZIP</span>
            </button>
          </div>

          {/* TAB 1: AUTOMATED 1-CLICK PUSH */}
          {activeTab === 'auto' && (
            <div className="space-y-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h5 className="font-bold text-white text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <span>Let Our Server Deploy Directly to Your GitHub Repository</span>
                  </h5>
                  <p className="text-xs text-slate-400 mt-1">
                    To let our server push directly to your GitHub repository <strong className="text-emerald-400">{currentRepo}</strong>, simply paste a GitHub Personal Access Token below:
                  </p>
                </div>
                <a
                  href={githubTokenCreateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Get 1-Click Token</span>
                  <ExternalLink className="w-3 h-3 text-emerald-400" />
                </a>
              </div>

              <form onSubmit={handlePublishAuto} className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    GitHub Personal Access Token (starts with <code className="text-emerald-400 font-mono">ghp_...</code>):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      value={githubToken}
                      onChange={(e) => setGithubToken(e.target.value)}
                      placeholder="Paste your token here (ghp_xxxxxxxxxxxx)"
                      className="flex-1 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs font-mono text-white outline-none"
                      required
                    />
                    <button
                      type="submit"
                      disabled={isPublishing || !githubToken.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-md transition shrink-0 cursor-pointer"
                    >
                      {isPublishing ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Pushing to GitHub...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5" />
                          <span>Deploy Everything Now</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>
                    Takes 5 seconds: Click <strong>"Get 1-Click Token"</strong> above, scroll to the bottom of GitHub and click the green <strong>"Generate token"</strong>, then copy and paste it here.
                  </span>
                </div>
              </form>

              {publishResult && (
                <div
                  className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                    publishResult.success
                      ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                      : 'bg-rose-950/60 border-rose-500/50 text-rose-200'
                  }`}
                >
                  {publishResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <h6 className="font-bold text-xs">
                      {publishResult.success ? 'Deployment Successful!' : 'Deployment Failed'}
                    </h6>
                    <p className="text-xs">{publishResult.message}</p>
                    {publishResult.success && (
                      <div className="pt-2">
                        <a
                          href={publishResult.siteUrl || pagesUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>Open Live Site: {publishResult.siteUrl || pagesUrl}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SINGLE FILE EDIT */}
          {activeTab === 'single-file' && (
            <div className="space-y-3.5 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h5 className="font-bold text-white text-sm flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-emerald-400" />
                    <span>Option A: Download &amp; Upload Ready index.html (Zero Copy Errors)</span>
                  </h5>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Avoids git diff markers and syntax errors by providing a ready-to-upload single file:
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href="/api/download-singlefile-html"
                    download="index.html"
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Ready index.html</span>
                  </a>
                  <button
                    onClick={handleCopyHtml}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
                  >
                    {copiedHtml ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">1</span>
                  <span>Click <strong>"Download Ready index.html"</strong> above.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">2</span>
                  <span>
                    Open GitHub upload page:{' '}
                    <a
                      href={`https://github.com/${currentRepo}/upload/main`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 font-bold underline inline-flex items-center gap-1"
                    >
                      github.com/{currentRepo}/upload/main <ExternalLink className="w-3 h-3" />
                    </a>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">3</span>
                  <span>Drag and drop the downloaded <code className="text-white font-mono">index.html</code> file into GitHub and click <strong>"Commit changes"</strong>!</span>
                </div>
              </div>

              {/* Troubleshooting Note for Push Access / Disabled Uploads */}
              <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs text-amber-200/90 space-y-1.5">
                <div className="font-bold text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Seeing "Uploads are disabled. File uploads require push access"?</span>
                </div>
                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  This happens when your browser is not signed in to GitHub as <strong className="text-white font-mono">{repoOwner}</strong>.
                </p>
                <div className="text-[11px] space-y-1 pl-2 border-l border-amber-500/40">
                  <div>• <strong>Fix 1:</strong> Make sure you are signed in at <a href="https://github.com/login" target="_blank" rel="noopener noreferrer" className="underline font-bold text-amber-300">github.com/login</a> with account <strong>{repoOwner}</strong>.</div>
                  <div>• <strong>Fix 2 (Edit in Browser):</strong> Open <a href={`https://github.com/${currentRepo}/edit/main/index.html`} target="_blank" rel="noopener noreferrer" className="underline font-bold text-amber-300">github.com/{currentRepo}/edit/main/index.html</a>, click <strong>"Copy Code"</strong> above, paste it into the editor, and click <strong>Commit changes</strong>.</div>
                  <div>• <strong>Fix 3 (Automated):</strong> Switch to Tab 1 above <strong>"Automated 1-Click Push"</strong> and let our server deploy directly using a token!</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ZIP UPLOAD */}
          {activeTab === 'zip-upload' && (
            <div className="space-y-3.5 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
              <h5 className="font-bold text-white text-sm flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Download Pre-Compiled Package for Drag &amp; Drop</span>
              </h5>
              <p className="text-xs text-slate-300 leading-relaxed">
                Download the complete pre-built website package, extract it on your computer, and drag the files into GitHub:
              </p>
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <a
                  href="/api/download-pages-zip"
                  download="stocks-github-pages-ready.zip"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Download GitHub Pages Bundle (.zip)</span>
                </a>

                <a
                  href={`https://github.com/${currentRepo}/upload/main`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
                >
                  <span>Upload to GitHub Repo</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* Active Repository Info */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <Globe className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-semibold">
                  Live GitHub Pages Link
                </span>
                <a
                  href={pagesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs sm:text-sm font-mono text-emerald-400 hover:underline font-bold flex items-center gap-1"
                >
                  <span>{pagesUrl}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <a
              href={`https://github.com/${currentRepo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono transition"
            >
              <Github className="w-3.5 h-3.5 text-slate-300" />
              <span>{currentRepo}</span>
            </a>
          </div>

          {/* Developer Attribution Card */}
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between gap-3">
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-semibold">
                Developer &amp; Copyright Owner
              </span>
              <span className="text-sm font-bold text-white">
                Sourav Kumar Bhowmick
              </span>
            </div>
            <a
              href="https://github.com/souravb1980"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-mono transition"
            >
              <Github className="w-3.5 h-3.5 text-slate-300" />
              <span>@souravb1980</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
