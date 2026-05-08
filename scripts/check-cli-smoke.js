const fs = require('fs');
const os = require('os');
const net = require('net');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const DEFAULT_MARGINNOTE_CLI_ROOT = path.resolve(ROOT_DIR, '..', 'marginnote-cli');
const DEFAULT_BRIDGE_ROOT = resolveExistingSiblingDir([
  'MN-Obsidian-bridge',
  'MN-Obsidian-Bridge',
]);
const DEFAULT_VAULT_PATH = '/Users/cfall/Documents/Obsidian-vaults/Proactive_info_base';
const DEFAULT_EXPORT_ROOT = '/Users/cfall/Library/Containers/QReader.MarginStudy.easy/Data/Documents';
const BRIDGE_SETTING_KEYS = [
  'marginNoteSourcePath',
  'pdfVaultFolder',
  'canvasFolderName',
  'autoLinkPdfsOnScan',
  'autoGenerateCanvasesOnScan',
];

function resolveExistingSiblingDir(candidates) {
  for (const candidate of candidates) {
    const fullPath = path.resolve(ROOT_DIR, '..', candidate);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  return path.resolve(ROOT_DIR, '..', candidates[candidates.length - 1]);
}

function parseArgs(argv) {
  const options = {
    output: 'pretty',
    marginnoteCliRoot: process.env.MARGINNOTE_CLI_ROOT || DEFAULT_MARGINNOTE_CLI_ROOT,
    bridgeRoot: process.env.MN_OBSIDIAN_BRIDGE_ROOT || DEFAULT_BRIDGE_ROOT,
    vaultPath: process.env.MN_OBSIDIAN_VAULT_PATH || DEFAULT_VAULT_PATH,
    exportRoot: process.env.MN_OBSIDIAN_EXPORT_ROOT || DEFAULT_EXPORT_ROOT,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') {
      options.output = 'json';
      continue;
    }
    if (arg === '--compact') {
      options.output = 'compact';
      continue;
    }
    if (arg === '--marginnote-cli-root' && argv[i + 1]) {
      options.marginnoteCliRoot = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith('--marginnote-cli-root=')) {
      options.marginnoteCliRoot = arg.slice('--marginnote-cli-root='.length);
      continue;
    }
    if (arg === '--bridge-root' && argv[i + 1]) {
      options.bridgeRoot = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith('--bridge-root=')) {
      options.bridgeRoot = arg.slice('--bridge-root='.length);
      continue;
    }
    if (arg === '--vault-path' && argv[i + 1]) {
      options.vaultPath = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith('--vault-path=')) {
      options.vaultPath = arg.slice('--vault-path='.length);
      continue;
    }
    if (arg === '--export-root' && argv[i + 1]) {
      options.exportRoot = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith('--export-root=')) {
      options.exportRoot = arg.slice('--export-root='.length);
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    }
  }

  return options;
}

function cliScript(root, preferredRelatives) {
  for (const relative of preferredRelatives) {
    const candidate = path.join(root, relative);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return path.join(root, preferredRelatives[preferredRelatives.length - 1]);
}

function writeTempJsonFile(tempDir, filename, data) {
  const filePath = path.join(tempDir, filename);
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}
`, 'utf8');
  return filePath;
}

function runCommand(label, scriptPath, args = [], extraEnv = {}) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    env: {
      ...process.env,
      ...extraEnv,
    },
  });
  const stdout = String(result.stdout || '').trim();
  const stderr = String(result.stderr || '').trim();
  if (result.status !== 0) {
    throw new Error(
      `${label} failed with exit code ${result.status}\n${stderr || stdout || '(no output)'}`
    );
  }
  return {
    label,
    scriptPath,
    args,
    stdout,
    stderr,
  };
}

function collapseWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function renderSurfaceSectionLine(section) {
  const commands = Array.isArray(section && section.commands) ? section.commands.join(' | ') : '';
  return `${section && section.label ? section.label : ''}: ${section && section.prefix ? section.prefix : ''} ${commands}`.trim();
}

function renderSurfaceDiscoveryLine(surfaceDocs) {
  const discovery = surfaceDocs && surfaceDocs.discovery ? surfaceDocs.discovery : {};
  return `${discovery.label || 'Discovery'}: ${discovery.command || ''}`.trim();
}

function deleteDefaultsDomain(domain) {
  if (!domain) return;
  spawnSync('defaults', ['delete', domain], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function createTemporaryVault(rootDir, settingsData) {
  const vaultPath = fs.mkdtempSync(path.join(rootDir, 'vault-'));
  const settingsPath = path.join(
    vaultPath,
    '.obsidian',
    'plugins',
    'marginnote-obsidian-sync',
    'data.json'
  );
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(`${settingsPath}`, `${JSON.stringify(settingsData, null, 2)}\n`, 'utf8');
  return {
    vaultPath,
    settingsPath,
  };
}

function sampleBreakdownNodes() {
  return [
    {
      noteId: 'bd-root',
      parentNoteId: null,
      title: 'Chapter 1',
      tags: [],
      mainExcerptText: '',
      allText: 'Chapter 1',
      commentsText: [],
      childNoteIds: ['bd-a', 'bd-b'],
      colorIndex: 0,
      fillIndex: 0,
      visibleInMindMap: true,
      branchClosed: false,
      hidden: false,
      zLevel: 0,
      groupMode: '',
    },
    {
      noteId: 'bd-a',
      parentNoteId: 'bd-root',
      title: 'Topic A',
      tags: [],
      mainExcerptText: '',
      allText: 'Topic A',
      commentsText: [],
      childNoteIds: [],
      colorIndex: 3,
      fillIndex: 0,
      visibleInMindMap: true,
      branchClosed: false,
      hidden: false,
      zLevel: 1,
      groupMode: '',
    },
    {
      noteId: 'bd-b',
      parentNoteId: 'bd-root',
      title: 'Topic B',
      tags: [],
      mainExcerptText: '',
      allText: 'Topic B',
      commentsText: [],
      childNoteIds: [],
      colorIndex: 4,
      fillIndex: 0,
      visibleInMindMap: true,
      branchClosed: false,
      hidden: false,
      zLevel: 1,
      groupMode: '',
    },
  ];
}

function createTemporaryBreakdownArtifacts(rootDir) {
  const artifactRoot = fs.mkdtempSync(path.join(rootDir, 'breakdown-artifacts-'));
  const requestsDir = path.join(artifactRoot, 'requests');
  const reportsDir = path.join(artifactRoot, 'reports');
  const requestId = '5000000000001-333333';
  fs.mkdirSync(requestsDir, { recursive: true });
  fs.mkdirSync(reportsDir, { recursive: true });

  writeTempJsonFile(requestsDir, `mnaipro-${requestId}.json`, {
    origin: 'native_ai_breakdown',
    objective: '整理 AI Breakdown 分支',
    stage: 'primary',
    dryRun: true,
    nodes: sampleBreakdownNodes(),
  });
  writeTempJsonFile(reportsDir, `mnaipro-${requestId}-plan.json`, {
    origin: 'native_ai_breakdown',
    objective: '整理 AI Breakdown 分支',
    stage: 'primary',
    actions: [{ type: 'set_color_index', noteId: 'bd-a' }],
    notes: [{ type: 'native_ai_breakdown_context' }],
    unsupportedActions: [],
    strategyPacks: [{ type: 'visual_branch_strategy' }],
  });
  writeTempJsonFile(reportsDir, `mnaipro-${requestId}-apply-5000000000100.json`, {
    origin: 'native_ai_breakdown',
    command: '整理 AI Breakdown 分支',
    objective: '整理 AI Breakdown 分支',
    rootNoteId: 'bd-root',
    actionCount: 1,
    results: [{ ok: true, type: 'set_color_index', noteId: 'bd-a' }],
    afterBranch: {
      notes: sampleBreakdownNodes(),
    },
  });
  writeTempJsonFile(reportsDir, `mnaipro-${requestId}-followup.json`, {
    origin: 'native_ai_breakdown',
    objective: '整理 AI Breakdown 分支',
    stage: 'followup',
    actions: [
      {
        type: 'rewrite_excerpt',
        noteId: 'bd-root',
        meta: { source: 'branch_structure_digest' },
      },
    ],
    notes: [],
    unsupportedActions: [],
    strategyPacks: [{ type: 'visual_branch_strategy' }],
  });
    writeTempJsonFile(reportsDir, `mnaipro-${requestId}-followup-apply-5000000000101.json`, {
      origin: 'native_ai_breakdown',
      command: '整理 AI Breakdown 分支',
      objective: '整理 AI Breakdown 分支',
      rootNoteId: 'bd-root',
      actionCount: 1,
      results: [
        {
          ok: true,
          type: 'rewrite_excerpt',
          noteId: 'bd-root',
          planSource: 'branch_structure_digest',
        },
      ],
      afterBranch: {
        notes: sampleBreakdownNodes(),
      },
    });

  return {
    root: artifactRoot,
    requestsDir,
    reportsDir,
    requestId,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => {
        if (!address || typeof address === 'string') {
          reject(new Error('free_port_unavailable'));
          return;
        }
        resolve(address.port);
      });
    });
  });
}

function startBridgeServer(port, vaultPath, extraEnv = {}) {
  const scriptPath = path.join(ROOT_DIR, 'bridge', 'server.js');
  const child = spawn(process.execPath, [scriptPath], {
    cwd: ROOT_DIR,
    env: {
      ...process.env,
      MN_AGENT_PORT: String(port),
      MN_AGENT_HOST: '127.0.0.1',
      MN_OBSIDIAN_VAULT_PATH: vaultPath,
      ...extraEnv,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const logs = { stdout: '', stderr: '' };
  child.stdout.on('data', (chunk) => {
    logs.stdout += chunk.toString('utf8');
  });
  child.stderr.on('data', (chunk) => {
    logs.stderr += chunk.toString('utf8');
  });
  return {
    child,
    logs,
    port,
    baseUrl: `http://127.0.0.1:${port}`,
  };
}

async function waitForBridgeStatus(baseUrl, bridgeProcess, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    if (bridgeProcess.child.exitCode !== null || bridgeProcess.child.signalCode !== null) {
      throw new Error(
        `bridge server exited early with code ${bridgeProcess.child.exitCode}\n${
          bridgeProcess.logs.stderr || bridgeProcess.logs.stdout || '(no output)'
        }`
      );
    }
    try {
      const status = await fetchJson(`${baseUrl}/status`);
      if (status.ok && status.payload && status.payload.ok === true) {
        return status;
      }
      lastError = new Error(`unexpected_status_${status.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(100);
  }
  throw new Error(
    `bridge server not ready: ${lastError ? lastError.message : 'timeout'}\n${
      bridgeProcess.logs.stderr || bridgeProcess.logs.stdout || '(no output)'
    }`
  );
}

function stopBridgeServer(bridgeProcess) {
  return new Promise((resolve, reject) => {
    if (!bridgeProcess || !bridgeProcess.child || bridgeProcess.child.exitCode !== null || bridgeProcess.child.signalCode !== null) {
      resolve();
      return;
    }
    const timeout = setTimeout(() => {
      try {
        bridgeProcess.child.kill('SIGKILL');
      } catch (error) {
        // Ignore best-effort shutdown failures.
      }
    }, 3000);
    bridgeProcess.child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
    try {
      bridgeProcess.child.kill('SIGTERM');
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch (error) {
    payload = {
      ok: false,
      error: 'non_json_response',
      body: text,
    };
  }
  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
}

function parseJson(label, text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} did not return valid JSON: ${error.message}`);
  }
}

function ensure(report, name, condition, details = {}) {
  const check = {
    name,
    ok: !!condition,
    details,
  };
  report.checks.push(check);
  if (!check.ok) {
    throw new Error(`${name} failed`);
  }
}

function summarizeCommand(result, parsed) {
  return {
    label: result.label,
    script: result.scriptPath,
    args: result.args,
    kind: parsed && parsed.kind ? parsed.kind : null,
    title: parsed && parsed.title ? parsed.title : null,
    summary: parsed && parsed.summary ? parsed.summary : null,
  };
}

function formatBridgeSettingValue(value) {
  if (value === null || value === undefined || value === '') {
    return '(missing)';
  }
  if (typeof value === 'boolean') {
    return value ? 'yes' : 'no';
  }
  return String(value);
}

function extractSettingsSummary(report) {
  if (!report) return null;
  if (report.settingsSummary && typeof report.settingsSummary === 'object') {
    return report.settingsSummary;
  }
  if (report.stable && report.stable.settingsSummary && typeof report.stable.settingsSummary === 'object') {
    return report.stable.settingsSummary;
  }
  if (report.stable && report.stable.paths && report.stable.paths.settings && typeof report.stable.paths.settings === 'object') {
    return {
      exists: !!(report.stable.settingsSummary && report.stable.settingsSummary.exists),
      path: report.stable.paths.settings.path || '',
      summary: report.stable.settingsSummary && report.stable.settingsSummary.summary
        ? report.stable.settingsSummary.summary
        : '',
      missingKeys: report.stable.settingsSummary && Array.isArray(report.stable.settingsSummary.missingKeys)
        ? report.stable.settingsSummary.missingKeys
        : [],
      values: report.stable.settingsSummary && report.stable.settingsSummary.values
        ? report.stable.settingsSummary.values
        : {},
    };
  }
  if (report.obsidianSyncSettings && typeof report.obsidianSyncSettings === 'object') {
    return report.obsidianSyncSettings;
  }
  const vaultSummary = report.details && report.details.vaultSummary ? report.details.vaultSummary : null;
  if (vaultSummary && vaultSummary.settingsSummary && typeof vaultSummary.settingsSummary === 'object') {
    return vaultSummary.settingsSummary;
  }
  return null;
}

function summarizeBridgeSettings(report) {
  const vaultSummary = report && report.details ? report.details.vaultSummary : null;
  const inventorySettings = extractSettingsSummary(report);
  const settingsData = vaultSummary && vaultSummary.settings && vaultSummary.settings.data
    ? vaultSummary.settings.data
    : inventorySettings && inventorySettings.values
      ? inventorySettings.values
    : null;
  const exists = !!settingsData;
  const values = {};
  const missingKeys = [];

  for (const key of BRIDGE_SETTING_KEYS) {
    const value = exists && Object.prototype.hasOwnProperty.call(settingsData, key)
      ? settingsData[key]
      : null;
    values[key] = value;
    if (value === null || value === undefined || value === '') {
      missingKeys.push(key);
    }
  }

  const summary = inventorySettings && inventorySettings.summary
    ? inventorySettings.summary
    : exists
      ? BRIDGE_SETTING_KEYS.map((key) => `${key}=${formatBridgeSettingValue(values[key])}`).join(', ')
      : 'marginnote-obsidian-sync data.json is missing';

  return {
    exists,
    path: inventorySettings && inventorySettings.path
      ? inventorySettings.path
      : vaultSummary && vaultSummary.settings ? vaultSummary.settings.path : '',
    summary,
    values,
    missingKeys: exists ? missingKeys : [...BRIDGE_SETTING_KEYS],
  };
}

function renderText(report) {
  const lines = [
    `CLI smoke test ${report.ok ? 'passed' : 'failed'}`,
    `MarginNote CLI root: ${report.roots.marginnoteCliRoot}`,
    `Bridge root: ${report.roots.bridgeRoot}`,
    `Vault path: ${report.roots.vaultPath}`,
    `Export root: ${report.roots.exportRoot}`,
    '',
    'Checks:',
  ];
  for (const check of report.checks) {
    lines.push(`- ${check.name}: ${check.ok ? 'ok' : 'fail'}`);
  }
  lines.push('', 'Commands:');
  for (const command of report.commands) {
    lines.push(`- ${command.label}: ${command.kind || '(unknown)'}`);
    if (command.summary) {
      lines.push(`  ${command.summary}`);
    }
  }
  if (report.doctorSettings) {
    lines.push('', 'Doctor settings:');
    lines.push(`- path: ${report.doctorSettings.path || '(missing)'}`);
    lines.push(`- summary: ${report.doctorSettings.summary}`);
    if (report.doctorSettings.missingKeys && report.doctorSettings.missingKeys.length) {
      lines.push(`- missing keys: ${report.doctorSettings.missingKeys.join(', ')}`);
    }
  }
  if (report.bridgeSettings) {
    lines.push('', 'Bridge settings:');
    lines.push(`- path: ${report.bridgeSettings.path || '(missing)'}`);
    lines.push(`- summary: ${report.bridgeSettings.summary}`);
    if (report.bridgeSettings.missingKeys && report.bridgeSettings.missingKeys.length) {
      lines.push(`- missing keys: ${report.bridgeSettings.missingKeys.join(', ')}`);
    }
  }
  if (!report.ok && report.error) {
    lines.push('', `Error: ${report.error}`);
  }
  return lines.join('\n');
}

function renderCompact(report) {
  const parts = [
    `ok=${report.ok ? 'yes' : 'no'}`,
    `checks=${report.checks.length}`,
    `commands=${report.commands.length}`,
  ];
  if (!report.ok && report.error) {
    parts.push(`error=${report.error.replace(/\s+/g, ' ').trim()}`);
  }
  return parts.join(' ');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = {
    ok: false,
    generatedAt: new Date().toISOString(),
    roots: {
      marginnoteCliRoot: path.resolve(options.marginnoteCliRoot),
      bridgeRoot: path.resolve(options.bridgeRoot),
      vaultPath: path.resolve(options.vaultPath),
      exportRoot: path.resolve(options.exportRoot),
    },
    commands: [],
    checks: [],
    bridgeSettings: null,
  };

  let temporaryBridge = null;
  const temporaryWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), 'mnaipro-cli-smoke-'));
  const temporaryPreferenceDomains = {
    set: `com.codex.mnaipro.cli-smoke.${process.pid}.${Date.now()}.set`,
    patch: `com.codex.mnaipro.cli-smoke.${process.pid}.${Date.now()}.patch`,
    reset: `com.codex.mnaipro.cli-smoke.${process.pid}.${Date.now()}.reset`,
    restore: `com.codex.mnaipro.cli-smoke.${process.pid}.${Date.now()}.restore`,
  };
  const temporaryBridgeVaultSettings = {
    marginNoteSourcePath: '/Users/cfall/Library/Containers/QReader.MarginStudy.easy/Data/Documents',
    pdfVaultFolder: 'MarginNote PDFs',
    canvasFolderName: 'MarginNote Canvases',
    autoLinkPdfsOnScan: true,
    autoGenerateCanvasesOnScan: false,
  };
  const temporaryBridgeVaults = {
    set: createTemporaryVault(temporaryWorkspace, temporaryBridgeVaultSettings),
    patch: createTemporaryVault(temporaryWorkspace, temporaryBridgeVaultSettings),
    reset: createTemporaryVault(temporaryWorkspace, temporaryBridgeVaultSettings),
    restore: createTemporaryVault(temporaryWorkspace, temporaryBridgeVaultSettings),
  };
  const temporaryBreakdownArtifacts = createTemporaryBreakdownArtifacts(temporaryWorkspace);

  try {
    process.env.MN_OBSIDIAN_VAULT_PATH = report.roots.vaultPath;
    const temporaryPort = await getFreePort();
    temporaryBridge = startBridgeServer(temporaryPort, report.roots.vaultPath, {
      MN_AGENT_REPORTS_DIR: temporaryBreakdownArtifacts.reportsDir,
      MN_AGENT_REQUESTS_DIR: temporaryBreakdownArtifacts.requestsDir,
    });
    const temporaryBaseUrl = temporaryBridge.baseUrl;
    await waitForBridgeStatus(temporaryBaseUrl, temporaryBridge);

    const marginnoteCli = cliScript(report.roots.marginnoteCliRoot, ['bin/marginnote-cli.js', 'src/cli.js']);
    const bridgeCli = cliScript(report.roots.bridgeRoot, ['bin/mn-obsidian-bridge.js', 'src/cli.js']);
    const mnaiproCli = cliScript(ROOT_DIR, ['bin/mnaipro.js', 'cli/mnaipro.js']);

    ensure(report, 'marginnote-cli root exists', fs.existsSync(report.roots.marginnoteCliRoot), {
      path: report.roots.marginnoteCliRoot,
    });
    ensure(report, 'mn-obsidian-bridge root exists', fs.existsSync(report.roots.bridgeRoot), {
      path: report.roots.bridgeRoot,
    });
    ensure(report, 'vault path exists', fs.existsSync(report.roots.vaultPath), {
      path: report.roots.vaultPath,
    });
    ensure(report, 'export root exists', fs.existsSync(report.roots.exportRoot), {
      path: report.roots.exportRoot,
    });

    const mnaiproStatusResult = runCommand(
      'mnaipro status',
      mnaiproCli,
      ['--base-url', temporaryBaseUrl, 'status', '--json', '--obsidian-vault-path', report.roots.vaultPath],
      {
        MN_AGENT_REPORTS_DIR: temporaryBreakdownArtifacts.reportsDir,
        MN_AGENT_REQUESTS_DIR: temporaryBreakdownArtifacts.requestsDir,
      }
    );
    const mnaiproStatus = parseJson('mnaipro status', mnaiproStatusResult.stdout);
    report.commands.push(summarizeCommand(mnaiproStatusResult, mnaiproStatus));
    ensure(report, 'mnaipro status ok', mnaiproStatus.ok === true, { service: mnaiproStatus.service });
    ensure(
      report,
      'mnaipro status breakdown artifacts exposed',
      mnaiproStatus.breakdownArtifacts &&
        mnaiproStatus.breakdownArtifacts.status === 'complete' &&
        mnaiproStatus.breakdownArtifacts.primaryChain &&
        mnaiproStatus.breakdownArtifacts.primaryChain.complete === true,
      { breakdownArtifacts: mnaiproStatus.breakdownArtifacts || null }
    );
    ensure(
      report,
      'mnaipro status breakdown next command exposed',
      mnaiproStatus.breakdownNextCommand === 'mnaipro breakdown postprocess --json',
      { breakdownNextCommand: mnaiproStatus.breakdownNextCommand || null }
    );
    ensure(
      report,
      'mnaipro status obsidian settings exposed',
      mnaiproStatus.obsidianSyncSettings && typeof mnaiproStatus.obsidianSyncSettings.summary === 'string',
      { obsidianSyncSettings: mnaiproStatus.obsidianSyncSettings || null }
    );
    ensure(
      report,
      'mnaipro status obsidian settings path recorded',
      mnaiproStatus.obsidianSyncSettings &&
        typeof mnaiproStatus.obsidianSyncSettings.settingsPath === 'string' &&
        mnaiproStatus.obsidianSyncSettings.settingsPath.length > 0,
      { obsidianSyncSettings: mnaiproStatus.obsidianSyncSettings || null }
    );
    ensure(
      report,
      'mnaipro status latest follow-up apply exposed',
      mnaiproStatus.latestFollowupApply &&
        mnaiproStatus.latestFollowupApply.summary &&
        mnaiproStatus.latestFollowupApply.summary.appliedCount === 1,
      { latestFollowupApply: mnaiproStatus.latestFollowupApply || null }
    );
    const mnaiproStatusCompactResult = runCommand(
      'mnaipro status --compact',
      mnaiproCli,
      ['--base-url', temporaryBaseUrl, 'status', '--compact', '--obsidian-vault-path', report.roots.vaultPath],
      {
        MN_AGENT_REPORTS_DIR: temporaryBreakdownArtifacts.reportsDir,
        MN_AGENT_REQUESTS_DIR: temporaryBreakdownArtifacts.requestsDir,
      }
    );
    ensure(
      report,
      'mnaipro status compact breakdown next hint exposed',
      /next=mnaipro breakdown postprocess --json/.test(mnaiproStatusCompactResult.stdout || ''),
      { stdout: mnaiproStatusCompactResult.stdout || '' }
    );
    ensure(
      report,
      'mnaipro status compact follow-up apply hint exposed',
      /followup_apply=1/.test(mnaiproStatusCompactResult.stdout || '') &&
        /followup_apply_request=mnaipro-5000000000001-333333-followup/.test(
          mnaiproStatusCompactResult.stdout || ''
        ) &&
        /bridge_supervisor=/.test(mnaiproStatusCompactResult.stdout || ''),
      { stdout: mnaiproStatusCompactResult.stdout || '' }
    );

    const mnaiproDoctorResult = runCommand(
      'mnaipro doctor',
      mnaiproCli,
      ['--base-url', temporaryBaseUrl, '--obsidian-vault-path', report.roots.vaultPath, 'doctor', '--json'],
      {
        MN_AGENT_REPORTS_DIR: temporaryBreakdownArtifacts.reportsDir,
        MN_AGENT_REQUESTS_DIR: temporaryBreakdownArtifacts.requestsDir,
      }
    );
    const mnaiproDoctor = parseJson('mnaipro doctor', mnaiproDoctorResult.stdout);
    report.commands.push(summarizeCommand(mnaiproDoctorResult, mnaiproDoctor));
    ensure(report, 'mnaipro doctor ok', mnaiproDoctor.ok === true, { source: mnaiproDoctor.source });
    ensure(
      report,
      'mnaipro doctor breakdown artifacts exposed',
      mnaiproDoctor.breakdownArtifacts &&
        mnaiproDoctor.breakdownArtifacts.status === 'complete' &&
        mnaiproDoctor.breakdownArtifacts.followupChain &&
        mnaiproDoctor.breakdownArtifacts.followupChain.complete === true,
      { breakdownArtifacts: mnaiproDoctor.breakdownArtifacts || null }
    );
    ensure(
      report,
      'mnaipro doctor breakdown next command exposed',
      mnaiproDoctor.breakdownNextCommand === 'mnaipro breakdown postprocess --json',
      { breakdownNextCommand: mnaiproDoctor.breakdownNextCommand || null }
    );
    ensure(
      report,
      'mnaipro obsidian settings exposed',
      mnaiproDoctor.obsidianSyncSettings && typeof mnaiproDoctor.obsidianSyncSettings.summary === 'string',
      { obsidianSyncSettings: mnaiproDoctor.obsidianSyncSettings || null }
    );
    ensure(
      report,
      'mnaipro doctor latest follow-up apply exposed',
      mnaiproDoctor.latestFollowupApply &&
        mnaiproDoctor.latestFollowupApply.summary &&
        mnaiproDoctor.latestFollowupApply.summary.appliedCount === 1,
      { latestFollowupApply: mnaiproDoctor.latestFollowupApply || null }
    );
    const mnaiproDoctorTextResult = runCommand(
      'mnaipro doctor',
      mnaiproCli,
      ['--base-url', temporaryBaseUrl, '--obsidian-vault-path', report.roots.vaultPath, 'doctor'],
      {
        MN_AGENT_REPORTS_DIR: temporaryBreakdownArtifacts.reportsDir,
        MN_AGENT_REQUESTS_DIR: temporaryBreakdownArtifacts.requestsDir,
      }
    );
    const mnaiproDoctorText = mnaiproDoctorTextResult.stdout || '';
    ensure(
      report,
      'mnaipro doctor text bridge supervisor exposed',
      /Bridge supervisor: ownership=/.test(mnaiproDoctorText) ||
        /Supervisor pid: missing/.test(mnaiproDoctorText),
      { stdout: mnaiproDoctorText }
    );
    const mnaiproDoctorCompactResult = runCommand(
      'mnaipro doctor --compact',
      mnaiproCli,
      ['--base-url', temporaryBaseUrl, '--obsidian-vault-path', report.roots.vaultPath, 'doctor', '--compact'],
      {
        MN_AGENT_REPORTS_DIR: temporaryBreakdownArtifacts.reportsDir,
        MN_AGENT_REQUESTS_DIR: temporaryBreakdownArtifacts.requestsDir,
      }
    );
    ensure(
      report,
      'mnaipro doctor compact breakdown next hint exposed',
      /next=mnaipro breakdown postprocess --json/.test(mnaiproDoctorCompactResult.stdout || ''),
      { stdout: mnaiproDoctorCompactResult.stdout || '' }
    );
    ensure(
      report,
      'mnaipro doctor compact follow-up apply hint exposed',
      /followup_apply=1/.test(mnaiproDoctorCompactResult.stdout || '') &&
        /followup_apply_request=mnaipro-5000000000001-333333-followup/.test(
          mnaiproDoctorCompactResult.stdout || ''
        ) &&
        /bridge_supervisor=/.test(mnaiproDoctorCompactResult.stdout || ''),
      { stdout: mnaiproDoctorCompactResult.stdout || '' }
    );
    ensure(
      report,
      'mnaipro obsidian settings path recorded',
      mnaiproDoctor.obsidianSyncSettings &&
        typeof mnaiproDoctor.obsidianSyncSettings.settingsPath === 'string' &&
        mnaiproDoctor.obsidianSyncSettings.settingsPath.length > 0,
      { obsidianSyncSettings: mnaiproDoctor.obsidianSyncSettings || null }
    );

    const mnaiproCapabilitiesResult = runCommand(
      'mnaipro capabilities',
      mnaiproCli,
      ['capabilities', '--json']
    );
    const mnaiproCapabilities = parseJson('mnaipro capabilities', mnaiproCapabilitiesResult.stdout);
    report.commands.push(summarizeCommand(mnaiproCapabilitiesResult, mnaiproCapabilities));
    ensure(report, 'mnaipro capabilities ok', mnaiproCapabilities.ok === true, { kind: mnaiproCapabilities.kind });
    ensure(report, 'mnaipro capabilities kind exposed', mnaiproCapabilities.kind === 'capabilities', {
      kind: mnaiproCapabilities.kind,
    });
    ensure(
      report,
      'mnaipro capabilities registry exposed',
      Array.isArray(mnaiproCapabilities.registry) && mnaiproCapabilities.registry.length > 0,
      { registry: mnaiproCapabilities.registry || null }
    );
    ensure(
      report,
      'mnaipro capabilities groups exposed',
      Array.isArray(mnaiproCapabilities.groups) && mnaiproCapabilities.groups.length > 0,
      { groups: mnaiproCapabilities.groups || null }
    );
    ensure(
      report,
      'mnaipro capabilities command count exposed',
      mnaiproCapabilities.commandCount === 21,
      {
        commandCount: mnaiproCapabilities.commandCount || 0,
        topLevelCount: mnaiproCapabilities.topLevelCount || 0,
      }
    );
    ensure(
      report,
      'mnaipro capabilities group count exposed',
      mnaiproCapabilities.groupCount === 8,
      { groupCount: mnaiproCapabilities.groupCount || 0 }
    );
    ensure(
      report,
      'mnaipro capabilities bridge command exposed',
      Array.isArray(mnaiproCapabilities.registry) &&
        mnaiproCapabilities.registry.some(
          (entry) => entry && entry.path === 'bridge/logs' && entry.kind === 'command'
        ),
      { registry: mnaiproCapabilities.registry || null }
    );
    ensure(
      report,
      'mnaipro capabilities top-level leaf exposed',
      Array.isArray(mnaiproCapabilities.registry) &&
        mnaiproCapabilities.registry.some(
          (entry) => entry && entry.path === 'status' && entry.kind === 'command'
        ),
      { registry: mnaiproCapabilities.registry || null }
    );
    ensure(
      report,
      'mnaipro capabilities overview leaf exposed',
      Array.isArray(mnaiproCapabilities.registry) &&
        mnaiproCapabilities.registry.some(
          (entry) => entry && entry.path === 'overview' && entry.kind === 'command'
        ),
      { registry: mnaiproCapabilities.registry || null }
    );
    const mnaiproCapabilitiesCompactResult = runCommand(
      'mnaipro capabilities --compact',
      mnaiproCli,
      ['capabilities', '--compact']
    );
    ensure(
      report,
      'mnaipro capabilities compact exposes summary',
      /commands=21/.test(mnaiproCapabilitiesCompactResult.stdout || '') &&
        /groups=8/.test(mnaiproCapabilitiesCompactResult.stdout || '') &&
        /topLevel=12/.test(mnaiproCapabilitiesCompactResult.stdout || ''),
      { stdout: mnaiproCapabilitiesCompactResult.stdout || '' }
    );

    const mnaiproHelpResult = runCommand('mnaipro --help', mnaiproCli, ['--help']);
    ensure(
      report,
      'mnaipro capabilities surface docs exposed',
      mnaiproCapabilities.surfaceDocs &&
        Array.isArray(mnaiproCapabilities.surfaceDocs.sections) &&
        mnaiproCapabilities.surfaceDocs.sections.length > 0 &&
        Array.isArray(mnaiproCapabilities.surfaceDocs.commonFlows) &&
        mnaiproCapabilities.surfaceDocs.commonFlows.length > 0 &&
        mnaiproCapabilities.surfaceDocs.discovery &&
        typeof mnaiproCapabilities.surfaceDocs.discovery.command === 'string',
      { surfaceDocs: mnaiproCapabilities.surfaceDocs || null }
    );
    ensure(
      report,
      'mnaipro help shares surface docs with capabilities',
      collapseWhitespace(mnaiproHelpResult.stdout || '').includes('Command groups:') &&
        collapseWhitespace(mnaiproHelpResult.stdout || '').includes('Common flows:') &&
        mnaiproCapabilities.surfaceDocs.sections.every((section) =>
          collapseWhitespace(mnaiproHelpResult.stdout || '').includes(
            collapseWhitespace(renderSurfaceSectionLine(section))
          )
        ) &&
        collapseWhitespace(mnaiproHelpResult.stdout || '').includes(
          collapseWhitespace(renderSurfaceDiscoveryLine(mnaiproCapabilities.surfaceDocs))
        ) &&
        mnaiproCapabilities.surfaceDocs.commonFlows.every((flow) =>
          collapseWhitespace(mnaiproHelpResult.stdout || '').includes(collapseWhitespace(flow))
        ),
      {
        stdout: mnaiproHelpResult.stdout || '',
        surfaceDocs: mnaiproCapabilities.surfaceDocs || null,
      }
    );

    const mnaiproOverviewResult = runCommand(
      'mnaipro overview',
      mnaiproCli,
      ['overview', '--json'],
      {
        MN_AGENT_REPORTS_DIR: temporaryBreakdownArtifacts.reportsDir,
        MN_AGENT_REQUESTS_DIR: temporaryBreakdownArtifacts.requestsDir,
      }
    );
    const mnaiproOverview = parseJson('mnaipro overview', mnaiproOverviewResult.stdout);
    report.commands.push(summarizeCommand(mnaiproOverviewResult, mnaiproOverview));
    ensure(report, 'mnaipro overview ok', mnaiproOverview.ok === true, { kind: mnaiproOverview.kind });
    ensure(report, 'mnaipro overview kind exposed', mnaiproOverview.kind === 'overview', {
      kind: mnaiproOverview.kind,
    });
    ensure(
      report,
      'mnaipro overview surface counts exposed',
      mnaiproOverview.surfaceCounts &&
        typeof mnaiproOverview.surfaceCounts.visible === 'number' &&
        typeof mnaiproOverview.surfaceCounts.total === 'number' &&
        mnaiproOverview.surfaceCounts.visible === mnaiproOverview.surfaceCounts.total &&
        mnaiproOverview.surfaceCounts.total >= 5,
      { surfaceCounts: mnaiproOverview.surfaceCounts || null }
    );
    ensure(
      report,
      'mnaipro overview nested reports exposed',
      mnaiproOverview.status &&
        mnaiproOverview.doctor &&
        mnaiproOverview.capabilities &&
        mnaiproOverview.status.kind === 'status' &&
        mnaiproOverview.doctor.kind === 'doctor' &&
        mnaiproOverview.capabilities.kind === 'capabilities',
      {
        status: mnaiproOverview.status || null,
        doctor: mnaiproOverview.doctor || null,
        capabilities: mnaiproOverview.capabilities || null,
      }
    );
    ensure(
      report,
      'mnaipro overview recommended commands exposed',
      Array.isArray(mnaiproOverview.recommendedCommands) &&
        mnaiproOverview.recommendedCommands.length > 0 &&
        mnaiproOverview.recommendedCommands[0] === 'mnaipro doctor --json' &&
        mnaiproOverview.recommendedCommands.includes('mnaipro capabilities --json'),
      { recommendedCommands: mnaiproOverview.recommendedCommands || null }
    );
    const mnaiproOverviewCompactResult = runCommand(
      'mnaipro overview --compact',
      mnaiproCli,
      ['overview', '--compact']
    );
    ensure(
      report,
      'mnaipro overview compact exposes summary',
      /kind=overview/.test(mnaiproOverviewCompactResult.stdout || '') &&
        /next=mnaipro doctor --json/.test(mnaiproOverviewCompactResult.stdout || ''),
      { stdout: mnaiproOverviewCompactResult.stdout || '' }
    );

    const mnaiproFollowupResult = runCommand(
      'mnaipro followup latest',
      mnaiproCli,
      ['followup', 'latest', '--json'],
      {
        MN_AGENT_REPORTS_DIR: temporaryBreakdownArtifacts.reportsDir,
        MN_AGENT_REQUESTS_DIR: temporaryBreakdownArtifacts.requestsDir,
      }
    );
    const mnaiproFollowup = parseJson('mnaipro followup latest', mnaiproFollowupResult.stdout);
    report.commands.push(summarizeCommand(mnaiproFollowupResult, mnaiproFollowup));
    ensure(report, 'mnaipro followup latest ok', mnaiproFollowup.ok === true, { kind: mnaiproFollowup.kind });
    ensure(
      report,
      'mnaipro followup latest replay summary exposed',
      mnaiproFollowup.replay &&
        mnaiproFollowup.replay.summary &&
        typeof mnaiproFollowup.replay.summary.strategyPackCount === 'number' &&
        mnaiproFollowup.replay.summary.strategyPackCount >= 1,
      { replay: mnaiproFollowup.replay || null }
    );
    const mnaiproFollowupCompactResult = runCommand(
      'mnaipro followup latest --compact',
      mnaiproCli,
      ['followup', 'latest', '--compact'],
      {
        MN_AGENT_REPORTS_DIR: temporaryBreakdownArtifacts.reportsDir,
        MN_AGENT_REQUESTS_DIR: temporaryBreakdownArtifacts.requestsDir,
      }
    );
    ensure(
      report,
      'mnaipro followup latest compact replay hint exposed',
      /replay_packs=\d+/.test(mnaiproFollowupCompactResult.stdout || '') &&
        /replay_primary=/.test(mnaiproFollowupCompactResult.stdout || '') &&
        /replay_overview=\d+/.test(mnaiproFollowupCompactResult.stdout || ''),
      { stdout: mnaiproFollowupCompactResult.stdout || '' }
    );
    const mnaiproFollowupTextResult = runCommand(
      'mnaipro followup latest',
      mnaiproCli,
      ['followup', 'latest'],
      {
        MN_AGENT_REPORTS_DIR: temporaryBreakdownArtifacts.reportsDir,
        MN_AGENT_REQUESTS_DIR: temporaryBreakdownArtifacts.requestsDir,
      }
    );
    ensure(
      report,
      'mnaipro followup latest text branch overview exposed',
      /Branch overview actions:/.test(mnaiproFollowupTextResult.stdout || '') &&
        /branch overview fills:/.test(mnaiproFollowupTextResult.stdout || ''),
      { stdout: mnaiproFollowupTextResult.stdout || '' }
    );

    const mnaiproFollowupApplyResult = runCommand(
      'mnaipro followup apply latest',
      mnaiproCli,
      ['followup', 'apply', 'latest', '--json'],
      {
        MN_AGENT_REPORTS_DIR: temporaryBreakdownArtifacts.reportsDir,
        MN_AGENT_REQUESTS_DIR: temporaryBreakdownArtifacts.requestsDir,
      }
    );
    const mnaiproFollowupApply = parseJson('mnaipro followup apply latest', mnaiproFollowupApplyResult.stdout);
    report.commands.push(summarizeCommand(mnaiproFollowupApplyResult, mnaiproFollowupApply));
    ensure(report, 'mnaipro followup apply latest ok', mnaiproFollowupApply.ok === true, { kind: mnaiproFollowupApply.kind });
    ensure(report, 'mnaipro followup apply latest kind exposed', mnaiproFollowupApply.kind === 'followup_apply', { kind: mnaiproFollowupApply.kind });
    ensure(report, 'mnaipro followup apply latest summary exposed', mnaiproFollowupApply.summary && typeof mnaiproFollowupApply.summary.actionCount === 'number', {
      summary: mnaiproFollowupApply.summary || null
    });
    ensure(report, 'mnaipro followup apply latest applied count exposed', mnaiproFollowupApply.summary && mnaiproFollowupApply.summary.appliedCount === 1, {
      summary: mnaiproFollowupApply.summary || null
    });
    ensure(report, 'mnaipro followup apply latest origin exposed', mnaiproFollowupApply.summary && mnaiproFollowupApply.summary.origin === 'native_ai_breakdown', {
      summary: mnaiproFollowupApply.summary || null
    });
    ensure(
      report,
      'mnaipro followup apply latest overview fills exposed',
      typeof mnaiproFollowupApply.summary.overviewFillCount === 'number',
      { summary: mnaiproFollowupApply.summary || null }
    );
    const mnaiproFollowupApplyCompactResult = runCommand(
      'mnaipro followup apply latest --compact',
      mnaiproCli,
      ['followup', 'apply', 'latest', '--compact'],
      {
        MN_AGENT_REPORTS_DIR: temporaryBreakdownArtifacts.reportsDir,
        MN_AGENT_REQUESTS_DIR: temporaryBreakdownArtifacts.requestsDir,
      }
    );
    ensure(report, 'mnaipro followup apply latest compact hint exposed', /followup_apply=1/.test(mnaiproFollowupApplyCompactResult.stdout || '') && /mode=breakdown/.test(mnaiproFollowupApplyCompactResult.stdout || ''), {
      stdout: mnaiproFollowupApplyCompactResult.stdout || ''
    });
    ensure(
      report,
      'mnaipro followup apply latest compact overview hint exposed',
      /overview_fills=\d+/.test(mnaiproFollowupApplyCompactResult.stdout || ''),
      { stdout: mnaiproFollowupApplyCompactResult.stdout || '' }
    );
    const mnaiproFollowupApplyTextResult = runCommand(
      'mnaipro followup apply latest',
      mnaiproCli,
      ['followup', 'apply', 'latest'],
      {
        MN_AGENT_REPORTS_DIR: temporaryBreakdownArtifacts.reportsDir,
        MN_AGENT_REQUESTS_DIR: temporaryBreakdownArtifacts.requestsDir,
      }
    );
    ensure(
      report,
      'mnaipro followup apply latest text branch overview exposed',
      /Branch overview fills:/.test(mnaiproFollowupApplyTextResult.stdout || ''),
      { stdout: mnaiproFollowupApplyTextResult.stdout || '' }
    );

    const mnaiproReplayAfterApplyResult = runCommand(
      'mnaipro replay after-apply',
      mnaiproCli,
      ['replay', 'after-apply'],
      {
        MN_AGENT_REPORTS_DIR: temporaryBreakdownArtifacts.reportsDir,
        MN_AGENT_REQUESTS_DIR: temporaryBreakdownArtifacts.requestsDir,
      }
    );
    ensure(
      report,
      'mnaipro replay after-apply text strategy pack summary exposed',
      /Strategy packs:/.test(mnaiproReplayAfterApplyResult.stdout || '') &&
        /Branch overview actions:/.test(mnaiproReplayAfterApplyResult.stdout || ''),
      { stdout: mnaiproReplayAfterApplyResult.stdout || '' }
    );
    const mnaiproReplayAfterApplyCompactResult = runCommand(
      'mnaipro replay after-apply --compact',
      mnaiproCli,
      ['replay', 'after-apply', '--compact'],
      {
        MN_AGENT_REPORTS_DIR: temporaryBreakdownArtifacts.reportsDir,
        MN_AGENT_REQUESTS_DIR: temporaryBreakdownArtifacts.requestsDir,
      }
    );
    ensure(
      report,
      'mnaipro replay after-apply compact strategy pack summary exposed',
      /packs=\d+/.test(mnaiproReplayAfterApplyCompactResult.stdout || '') &&
        /overview=\d+/.test(mnaiproReplayAfterApplyCompactResult.stdout || ''),
      { stdout: mnaiproReplayAfterApplyCompactResult.stdout || '' }
    );

    const mnaiproBreakdownArtifactsResult = runCommand(
      'mnaipro breakdown artifacts',
      mnaiproCli,
      ['breakdown', 'artifacts', '--json'],
      {
        MN_AGENT_REPORTS_DIR: temporaryBreakdownArtifacts.reportsDir,
        MN_AGENT_REQUESTS_DIR: temporaryBreakdownArtifacts.requestsDir,
      }
    );
    const mnaiproBreakdownArtifacts = parseJson(
      'mnaipro breakdown artifacts',
      mnaiproBreakdownArtifactsResult.stdout
    );
    report.commands.push(
      summarizeCommand(mnaiproBreakdownArtifactsResult, mnaiproBreakdownArtifacts)
    );
    ensure(
      report,
      'mnaipro breakdown artifacts ok',
      mnaiproBreakdownArtifacts.ok === true,
      { kind: mnaiproBreakdownArtifacts.kind }
    );
    ensure(
      report,
      'mnaipro breakdown artifacts complete chain exposed',
      mnaiproBreakdownArtifacts.status === 'complete' &&
        mnaiproBreakdownArtifacts.primaryChain &&
        mnaiproBreakdownArtifacts.primaryChain.complete === true &&
        mnaiproBreakdownArtifacts.followupChain &&
        mnaiproBreakdownArtifacts.followupChain.complete === true,
      { audit: mnaiproBreakdownArtifacts }
    );
    const mnaiproBreakdownArtifactsCompactResult = runCommand(
      'mnaipro breakdown artifacts --compact',
      mnaiproCli,
      ['breakdown', 'artifacts', '--compact'],
      {
        MN_AGENT_REPORTS_DIR: temporaryBreakdownArtifacts.reportsDir,
        MN_AGENT_REQUESTS_DIR: temporaryBreakdownArtifacts.requestsDir,
      }
    );
    ensure(
      report,
      'mnaipro breakdown artifacts compact status exposed',
      /status=complete/.test(mnaiproBreakdownArtifactsCompactResult.stdout || '') &&
        /primary=complete/.test(mnaiproBreakdownArtifactsCompactResult.stdout || '') &&
        /followup=complete/.test(mnaiproBreakdownArtifactsCompactResult.stdout || ''),
      { stdout: mnaiproBreakdownArtifactsCompactResult.stdout || '' }
    );

    const mnaiproBreakdownSmokeResult = runCommand(
      'mnaipro breakdown smoke',
      mnaiproCli,
      ['breakdown', 'smoke', '--case', 'organized-enough', '--bridge-base-url', temporaryBaseUrl, '--json'],
      {
        MN_AGENT_REPORTS_DIR: temporaryBreakdownArtifacts.reportsDir,
        MN_AGENT_REQUESTS_DIR: temporaryBreakdownArtifacts.requestsDir,
      }
    );
    const mnaiproBreakdownSmoke = parseJson(
      'mnaipro breakdown smoke',
      mnaiproBreakdownSmokeResult.stdout
    );
    report.commands.push(summarizeCommand(mnaiproBreakdownSmokeResult, mnaiproBreakdownSmoke));
    ensure(report, 'mnaipro breakdown smoke ok', mnaiproBreakdownSmoke.ok === true, {
      bridge: mnaiproBreakdownSmoke.bridge || null,
    });
    ensure(
      report,
      'mnaipro breakdown smoke external bridge surfaced',
      mnaiproBreakdownSmoke.bridge &&
        mnaiproBreakdownSmoke.bridge.mode === 'external' &&
        mnaiproBreakdownSmoke.bridge.baseUrl === temporaryBaseUrl,
      { bridge: mnaiproBreakdownSmoke.bridge || null }
    );
    ensure(
      report,
      'mnaipro breakdown smoke scenario preserved',
      Array.isArray(mnaiproBreakdownSmoke.scenarios) &&
        mnaiproBreakdownSmoke.scenarios.length === 1 &&
        mnaiproBreakdownSmoke.scenarios[0] &&
        mnaiproBreakdownSmoke.scenarios[0].case === 'organized-enough',
      { scenarios: mnaiproBreakdownSmoke.scenarios || null }
    );

    const mnaiproBreakdownSmokeInheritedBaseUrlResult = runCommand(
      'mnaipro breakdown smoke with inherited base-url',
      mnaiproCli,
      ['--base-url', temporaryBaseUrl, 'breakdown', 'smoke', '--case', 'organized-enough', '--json'],
      {
        MN_AGENT_REPORTS_DIR: temporaryBreakdownArtifacts.reportsDir,
        MN_AGENT_REQUESTS_DIR: temporaryBreakdownArtifacts.requestsDir,
      }
    );
    const mnaiproBreakdownSmokeInheritedBaseUrl = parseJson(
      'mnaipro breakdown smoke with inherited base-url',
      mnaiproBreakdownSmokeInheritedBaseUrlResult.stdout
    );
    report.commands.push(
      summarizeCommand(
        mnaiproBreakdownSmokeInheritedBaseUrlResult,
        mnaiproBreakdownSmokeInheritedBaseUrl
      )
    );
    ensure(
      report,
      'mnaipro breakdown smoke inherited base-url ok',
      mnaiproBreakdownSmokeInheritedBaseUrl.ok === true,
      { bridge: mnaiproBreakdownSmokeInheritedBaseUrl.bridge || null }
    );
    ensure(
      report,
      'mnaipro breakdown smoke inherited base-url surfaced',
      mnaiproBreakdownSmokeInheritedBaseUrl.bridge &&
        mnaiproBreakdownSmokeInheritedBaseUrl.bridge.mode === 'external' &&
      mnaiproBreakdownSmokeInheritedBaseUrl.bridge.baseUrl === temporaryBaseUrl,
      { bridge: mnaiproBreakdownSmokeInheritedBaseUrl.bridge || null }
    );
    const mnaiproBreakdownSmokeLocalBaseUrlResult = runCommand(
      'mnaipro breakdown smoke with local base-url',
      mnaiproCli,
      ['breakdown', 'smoke', '--base-url', temporaryBaseUrl, '--case', 'organized-enough', '--json'],
      {
        MN_AGENT_REPORTS_DIR: temporaryBreakdownArtifacts.reportsDir,
        MN_AGENT_REQUESTS_DIR: temporaryBreakdownArtifacts.requestsDir,
      }
    );
    const mnaiproBreakdownSmokeLocalBaseUrl = parseJson(
      'mnaipro breakdown smoke with local base-url',
      mnaiproBreakdownSmokeLocalBaseUrlResult.stdout
    );
    report.commands.push(
      summarizeCommand(mnaiproBreakdownSmokeLocalBaseUrlResult, mnaiproBreakdownSmokeLocalBaseUrl)
    );
    ensure(
      report,
      'mnaipro breakdown smoke local base-url ok',
      mnaiproBreakdownSmokeLocalBaseUrl.ok === true,
      { bridge: mnaiproBreakdownSmokeLocalBaseUrl.bridge || null }
    );
    ensure(
      report,
      'mnaipro breakdown smoke local base-url surfaced',
      mnaiproBreakdownSmokeLocalBaseUrl.bridge &&
        mnaiproBreakdownSmokeLocalBaseUrl.bridge.mode === 'external' &&
        mnaiproBreakdownSmokeLocalBaseUrl.bridge.baseUrl === temporaryBaseUrl,
      { bridge: mnaiproBreakdownSmokeLocalBaseUrl.bridge || null }
    );
    const mnaiproBreakdownSmokeHelpResult = runCommand(
      'mnaipro breakdown smoke --help',
      mnaiproCli,
      ['breakdown', 'smoke', '--help']
    );
    ensure(
      report,
      'mnaipro breakdown smoke help mentions bridge reuse',
      /--bridge-base-url <url>/.test(mnaiproBreakdownSmokeHelpResult.stdout || '') &&
        /--base-url <url>/.test(mnaiproBreakdownSmokeHelpResult.stdout || '') &&
        /before or after the subcommand/.test(mnaiproBreakdownSmokeHelpResult.stdout || ''),
      { stdout: mnaiproBreakdownSmokeHelpResult.stdout || '' }
    );

    const mnaiproBridgeStatusResult = runCommand(
      'mnaipro bridge status',
      mnaiproCli,
      ['--base-url', temporaryBaseUrl, 'bridge', 'status', '--json', '--obsidian-vault-path', report.roots.vaultPath],
      {
        MN_AGENT_REPORTS_DIR: temporaryBreakdownArtifacts.reportsDir,
        MN_AGENT_REQUESTS_DIR: temporaryBreakdownArtifacts.requestsDir,
      }
    );
    const mnaiproBridgeStatus = parseJson('mnaipro bridge status', mnaiproBridgeStatusResult.stdout);
    report.commands.push(summarizeCommand(mnaiproBridgeStatusResult, mnaiproBridgeStatus));
    ensure(report, 'mnaipro bridge status ok', mnaiproBridgeStatus.ok === true, { service: mnaiproBridgeStatus.service });
    ensure(
      report,
      'mnaipro bridge status breakdown artifacts exposed',
      mnaiproBridgeStatus.breakdownArtifacts &&
        mnaiproBridgeStatus.breakdownArtifacts.status === 'complete',
      { breakdownArtifacts: mnaiproBridgeStatus.breakdownArtifacts || null }
    );
    ensure(
      report,
      'mnaipro bridge status breakdown next command exposed',
      mnaiproBridgeStatus.breakdownNextCommand === 'mnaipro breakdown postprocess --json',
      { breakdownNextCommand: mnaiproBridgeStatus.breakdownNextCommand || null }
    );
    ensure(
      report,
      'mnaipro bridge status obsidian settings exposed',
      mnaiproBridgeStatus.obsidianSyncSettings && typeof mnaiproBridgeStatus.obsidianSyncSettings.summary === 'string',
      { obsidianSyncSettings: mnaiproBridgeStatus.obsidianSyncSettings || null }
    );
    ensure(
      report,
      'mnaipro bridge status obsidian settings path recorded',
      mnaiproBridgeStatus.obsidianSyncSettings &&
        typeof mnaiproBridgeStatus.obsidianSyncSettings.settingsPath === 'string' &&
        mnaiproBridgeStatus.obsidianSyncSettings.settingsPath.length > 0,
      { obsidianSyncSettings: mnaiproBridgeStatus.obsidianSyncSettings || null }
    );

    const rawStatusResult = await fetchJson(`${temporaryBaseUrl}/status`);
    report.commands.push({
      label: 'bridge /status http',
      script: `${temporaryBaseUrl}/status`,
      args: [],
      kind: rawStatusResult.payload && rawStatusResult.payload.kind ? rawStatusResult.payload.kind : null,
      title: rawStatusResult.payload && rawStatusResult.payload.title ? rawStatusResult.payload.title : null,
      summary: rawStatusResult.payload && rawStatusResult.payload.summary ? rawStatusResult.payload.summary : null,
    });
    ensure(report, 'raw /status ok', rawStatusResult.ok === true, { status: rawStatusResult.status });
    ensure(
      report,
      'raw /status obsidian settings exposed',
      rawStatusResult.payload &&
        rawStatusResult.payload.obsidianSyncSettings &&
        typeof rawStatusResult.payload.obsidianSyncSettings.summary === 'string',
      { obsidianSyncSettings: rawStatusResult.payload ? rawStatusResult.payload.obsidianSyncSettings : null }
    );
    ensure(
      report,
      'raw /status obsidian settings path recorded',
      rawStatusResult.payload &&
        rawStatusResult.payload.obsidianSyncSettings &&
        typeof rawStatusResult.payload.obsidianSyncSettings.settingsPath === 'string' &&
        rawStatusResult.payload.obsidianSyncSettings.settingsPath.length > 0,
      { obsidianSyncSettings: rawStatusResult.payload ? rawStatusResult.payload.obsidianSyncSettings : null }
    );
    ensure(
      report,
      'raw /status breakdown next command exposed',
      rawStatusResult.payload &&
        rawStatusResult.payload.breakdownNextCommand === 'mnaipro breakdown postprocess --json',
      { breakdownNextCommand: rawStatusResult.payload ? rawStatusResult.payload.breakdownNextCommand : null }
    );
    ensure(
      report,
      'raw /status followup replay summary exposed',
      rawStatusResult.payload &&
        rawStatusResult.payload.latest &&
        rawStatusResult.payload.latest.followup &&
        rawStatusResult.payload.latest.followup.replay &&
        rawStatusResult.payload.latest.followup.replay.summary &&
        typeof rawStatusResult.payload.latest.followup.replay.summary.strategyPackCount === 'number' &&
        rawStatusResult.payload.latest.followup.replay.summary.strategyPackCount >= 1,
      {
        followup: rawStatusResult.payload && rawStatusResult.payload.latest
          ? rawStatusResult.payload.latest.followup || null
          : null,
      }
    );
    ensure(
      report,
      'raw /status breakdown artifacts exposed',
      rawStatusResult.payload &&
        rawStatusResult.payload.breakdownArtifacts &&
        typeof rawStatusResult.payload.breakdownArtifacts.status === 'string' &&
        rawStatusResult.payload.breakdownArtifacts.primaryChain &&
        typeof rawStatusResult.payload.breakdownArtifacts.primaryChain.complete === 'boolean',
      {
        breakdownArtifacts: rawStatusResult.payload
          ? rawStatusResult.payload.breakdownArtifacts || null
          : null,
      }
    );

    const rawFollowupReportResult = await fetchJson(`${temporaryBaseUrl}/reports/latest?kind=followup`);
    report.commands.push({
      label: 'bridge /reports/latest?kind=followup http',
      script: `${temporaryBaseUrl}/reports/latest?kind=followup`,
      args: [],
      kind: rawFollowupReportResult.payload && rawFollowupReportResult.payload.kind ? rawFollowupReportResult.payload.kind : null,
      title:
        rawFollowupReportResult.payload &&
        rawFollowupReportResult.payload.payload &&
        rawFollowupReportResult.payload.payload.objective
          ? rawFollowupReportResult.payload.payload.objective
          : null,
      summary:
        rawFollowupReportResult.payload &&
        rawFollowupReportResult.payload.payload &&
        rawFollowupReportResult.payload.payload.replay &&
        rawFollowupReportResult.payload.payload.replay.summary
          ? `replay_packs=${rawFollowupReportResult.payload.payload.replay.summary.strategyPackCount}`
          : null,
    });
    ensure(report, 'raw /reports/latest followup replay summary exposed', rawFollowupReportResult.ok === true, {
      status: rawFollowupReportResult.status,
    });
    ensure(
      report,
      'raw /reports/latest followup payload replay exposed',
      rawFollowupReportResult.payload &&
        rawFollowupReportResult.payload.payload &&
        rawFollowupReportResult.payload.payload.replay &&
        rawFollowupReportResult.payload.payload.replay.summary &&
        typeof rawFollowupReportResult.payload.payload.replay.summary.strategyPackCount === 'number' &&
        rawFollowupReportResult.payload.payload.replay.summary.strategyPackCount >= 1,
      {
        followup: rawFollowupReportResult.payload ? rawFollowupReportResult.payload.payload || null : null,
      }
    );

    const bridgeStatusScriptResult = runCommand(
      'bridge-status script',
      path.join(ROOT_DIR, 'scripts', 'bridge-status.js'),
      [],
      {
        MN_AGENT_BASE_URL: temporaryBaseUrl,
        MN_AGENT_REPORTS_DIR: temporaryBreakdownArtifacts.reportsDir,
        MN_AGENT_REQUESTS_DIR: temporaryBreakdownArtifacts.requestsDir,
      }
    );
    const bridgeStatusScript = parseJson('bridge-status script', bridgeStatusScriptResult.stdout);
    report.commands.push(summarizeCommand(bridgeStatusScriptResult, bridgeStatusScript));
    ensure(report, 'bridge-status script ok', bridgeStatusScript.source === 'live_http', {
      source: bridgeStatusScript.source,
    });
    ensure(
      report,
      'bridge-status script breakdown artifacts exposed',
      bridgeStatusScript.breakdownArtifacts &&
        bridgeStatusScript.breakdownArtifacts.status === 'complete',
      { breakdownArtifacts: bridgeStatusScript.breakdownArtifacts || null }
    );
    ensure(
      report,
      'bridge-status script latest follow-up apply exposed',
      bridgeStatusScript.latestFollowupApply &&
        bridgeStatusScript.latestFollowupApply.summary &&
        bridgeStatusScript.latestFollowupApply.summary.appliedCount === 1,
      { latestFollowupApply: bridgeStatusScript.latestFollowupApply || null }
    );
    ensure(
      report,
      'bridge-status script obsidian settings exposed',
      bridgeStatusScript.obsidianSyncSettings && typeof bridgeStatusScript.obsidianSyncSettings.summary === 'string',
      { obsidianSyncSettings: bridgeStatusScript.obsidianSyncSettings || null }
    );
    ensure(
      report,
      'bridge-status script obsidian settings path recorded',
      bridgeStatusScript.obsidianSyncSettings &&
        typeof bridgeStatusScript.obsidianSyncSettings.settingsPath === 'string' &&
        bridgeStatusScript.obsidianSyncSettings.settingsPath.length > 0,
      { obsidianSyncSettings: bridgeStatusScript.obsidianSyncSettings || null }
    );

    const margDoctorResult = runCommand(
      'marginnote-cli doctor',
      marginnoteCli,
      ['doctor', '--json']
    );
    const margDoctor = parseJson('marginnote-cli doctor', margDoctorResult.stdout);
    report.commands.push(summarizeCommand(margDoctorResult, margDoctor));
    ensure(report, 'marginnote-cli doctor ok', margDoctor.ok === true, { kind: margDoctor.kind });
    ensure(report, 'marginnote-cli app exists', margDoctor.app && margDoctor.app.exists === true, {
      appPath: margDoctor.app ? margDoctor.app.appPath : null,
    });
    const margDoctorCompactResult = runCommand(
      'marginnote-cli doctor --compact',
      marginnoteCli,
      ['doctor', '--compact']
    );
    ensure(
      report,
      'marginnote-cli doctor compact next hint exposed',
      /next=preferences_snapshot_restore/.test(margDoctorCompactResult.stdout || ''),
      { stdout: margDoctorCompactResult.stdout || '' }
    );
    ensure(
      report,
      'marginnote-cli doctor restore commands exposed',
      Array.isArray(margDoctor.recommendedCommands) &&
        margDoctor.recommendedCommands.some((command) => command.includes('ai preferences export ./preferences.snapshot.json --snapshot')) &&
        margDoctor.recommendedCommands.some((command) => command.includes('ai preferences restore ./preferences.snapshot.json --dry-run')),
      { recommendedCommands: margDoctor.recommendedCommands || null }
    );
    ensure(
      report,
      'marginnote-cli native AI present',
      margDoctor.nativeAi && margDoctor.nativeAi.conclusions && margDoctor.nativeAi.conclusions.nativeAiPresent === true,
      { conclusions: margDoctor.nativeAi ? margDoctor.nativeAi.conclusions : null }
    );
    ensure(
      report,
      'marginnote-cli internal traces present',
      margDoctor.nativeAi && margDoctor.nativeAi.conclusions && margDoctor.nativeAi.conclusions.internalStatePersists === true,
      { conclusions: margDoctor.nativeAi ? margDoctor.nativeAi.conclusions : null }
    );

    const appInspectResult = runCommand(
      'marginnote-cli app inspect',
      marginnoteCli,
      ['app', 'inspect', '--json']
    );
    const appInspect = parseJson('marginnote-cli app inspect', appInspectResult.stdout);
    report.commands.push(summarizeCommand(appInspectResult, appInspect));
    ensure(report, 'marginnote-cli app inspect ok', appInspect.ok === true, { kind: appInspect.kind });
    ensure(
      report,
      'marginnote-cli app inspect has inventory',
      appInspect.inventory && appInspect.inventory.conclusions && appInspect.inventory.conclusions.containerTracesPresent === true,
      { inventory: appInspect.inventory ? appInspect.inventory.conclusions : null }
    );

    const appInventoryResult = runCommand(
      'marginnote-cli app inventory',
      marginnoteCli,
      ['app', 'inventory', '--json']
    );
    const appInventory = parseJson('marginnote-cli app inventory', appInventoryResult.stdout);
    report.commands.push(summarizeCommand(appInventoryResult, appInventory));
    ensure(report, 'marginnote-cli app inventory ok', appInventory.ok === true, { kind: appInventory.kind });
    ensure(
      report,
      'marginnote-cli prompt modules visible',
      appInventory.conclusions && appInventory.conclusions.promptModulesPresent === true,
      { conclusions: appInventory.conclusions }
    );
    ensure(
      report,
      'marginnote-cli chat memories visible',
      appInventory.paths && appInventory.paths.chatMemories && appInventory.paths.chatMemories.exists === true,
      { chatMemories: appInventory.paths ? appInventory.paths.chatMemories : null }
    );

    const margHelpResult = runCommand('marginnote-cli --help', marginnoteCli, ['--help']);
    report.commands.push(summarizeCommand(margHelpResult, {
      ok: true,
      kind: 'help',
      title: 'marginnote-cli help',
    }));
    ensure(
      report,
      'marginnote-cli help overview command exposed',
      /marginnote-cli overview/.test(margHelpResult.stdout || ''),
      { stdout: margHelpResult.stdout || '' }
    );

    const margCapabilitiesResult = runCommand(
      'marginnote-cli capabilities',
      marginnoteCli,
      ['capabilities', '--json']
    );
    const margCapabilities = parseJson('marginnote-cli capabilities', margCapabilitiesResult.stdout);
    report.commands.push(summarizeCommand(margCapabilitiesResult, margCapabilities));
    ensure(report, 'marginnote-cli capabilities ok', margCapabilities.ok === true, { kind: margCapabilities.kind });
    ensure(
      report,
      'marginnote-cli capabilities registry exposed',
      Array.isArray(margCapabilities.registry) && margCapabilities.registry.length > 0,
      { commandCount: margCapabilities.commandCount || 0 }
    );
    ensure(
      report,
      'marginnote-cli capabilities overview leaf exposed',
      Array.isArray(margCapabilities.registry) &&
        margCapabilities.registry.some((entry) => entry && entry.command === 'marginnote-cli overview'),
      { registry: margCapabilities.registry || null }
    );
    ensure(
      report,
      'marginnote-cli capabilities surface docs exposed',
      margCapabilities.surfaceDocs &&
        Array.isArray(margCapabilities.surfaceDocs.sections) &&
        margCapabilities.surfaceDocs.sections.length >= 4 &&
        margCapabilities.surfaceDocs.discovery &&
        typeof margCapabilities.surfaceDocs.discovery.command === 'string' &&
        Array.isArray(margCapabilities.surfaceDocs.commonFlows) &&
        margCapabilities.surfaceDocs.commonFlows.length >= 4,
      { surfaceDocs: margCapabilities.surfaceDocs || null }
    );
    ensure(
      report,
      'marginnote-cli capabilities groups exposed',
      Array.isArray(margCapabilities.groups) && margCapabilities.groups.length > 0,
      { groupCount: margCapabilities.groupCount || 0 }
    );
    ensure(report, 'marginnote-cli capabilities command count', margCapabilities.commandCount === 24, {
      commandCount: margCapabilities.commandCount || 0,
    });

    const margOverviewResult = runCommand(
      'marginnote-cli overview',
      marginnoteCli,
      ['overview', '--json']
    );
    const margOverview = parseJson('marginnote-cli overview', margOverviewResult.stdout);
    report.commands.push(summarizeCommand(margOverviewResult, margOverview));
    ensure(report, 'marginnote-cli overview ok', margOverview.ok === true, { kind: margOverview.kind });
    ensure(report, 'marginnote-cli overview kind exposed', margOverview.kind === 'overview', {
      kind: margOverview.kind,
    });
    ensure(
      report,
      'marginnote-cli overview surface counts exposed',
      margOverview.surfaceCounts &&
        typeof margOverview.surfaceCounts.visible === 'number' &&
        typeof margOverview.surfaceCounts.total === 'number' &&
        margOverview.surfaceCounts.visible === margOverview.surfaceCounts.total &&
        margOverview.surfaceCounts.total >= 4,
      { surfaceCounts: margOverview.surfaceCounts || null }
    );
    ensure(
      report,
      'marginnote-cli overview nested reports exposed',
      margOverview.status &&
        margOverview.doctor &&
        margOverview.aiOverview &&
        margOverview.capabilities &&
        margOverview.status.kind === 'app_inspect' &&
        margOverview.doctor.kind === 'doctor' &&
        margOverview.aiOverview.kind === 'ai_overview' &&
        margOverview.capabilities.kind === 'capabilities',
      {
        status: margOverview.status || null,
        doctor: margOverview.doctor || null,
        aiOverview: margOverview.aiOverview || null,
        capabilities: margOverview.capabilities || null,
      }
    );
    ensure(
      report,
      'marginnote-cli overview recommended commands exposed',
      Array.isArray(margOverview.recommendedCommands) &&
        margOverview.recommendedCommands.length > 0 &&
        margOverview.recommendedCommands[0] === 'marginnote-cli doctor --json' &&
        margOverview.recommendedCommands.includes('marginnote-cli ai overview --json'),
      { recommendedCommands: margOverview.recommendedCommands || null }
    );
    const margOverviewCompactResult = runCommand(
      'marginnote-cli overview --compact',
      marginnoteCli,
      ['overview', '--compact']
    );
    ensure(
      report,
      'marginnote-cli overview compact exposes summary',
      /ok=yes/.test(margOverviewCompactResult.stdout || '') &&
        /kind=overview/.test(margOverviewCompactResult.stdout || '') &&
        /next=marginnote-cli doctor --json/.test(margOverviewCompactResult.stdout || ''),
      { stdout: margOverviewCompactResult.stdout || '' }
    );

    const aiStatusResult = runCommand(
      'marginnote-cli ai status',
      marginnoteCli,
      ['ai', 'status', '--json']
    );
    const aiStatus = parseJson('marginnote-cli ai status', aiStatusResult.stdout);
    report.commands.push(summarizeCommand(aiStatusResult, aiStatus));
    ensure(report, 'marginnote-cli ai status ok', aiStatus.ok === true, { kind: aiStatus.kind });
    ensure(report, 'marginnote-cli ai status native AI present', aiStatus.conclusions && aiStatus.conclusions.nativeAiPresent === true, {
      conclusions: aiStatus.conclusions || null,
    });
    ensure(
      report,
      'marginnote-cli ai status signal counts exposed',
      aiStatus.signalCounts && typeof aiStatus.signalCounts.matchedGroups === 'number' && aiStatus.signalCounts.matchedGroups > 0,
      { signalCounts: aiStatus.signalCounts || null }
    );
    ensure(
      report,
      'marginnote-cli ai status prompt-module counts exposed',
      aiStatus.promptModuleCounts && typeof aiStatus.promptModuleCounts.total === 'number' && aiStatus.promptModuleCounts.total > 0,
      { promptModuleCounts: aiStatus.promptModuleCounts || null }
    );
    ensure(
      report,
      'marginnote-cli ai status container-trace counts exposed',
      aiStatus.containerTraceCounts && typeof aiStatus.containerTraceCounts.presentPaths === 'number' && aiStatus.containerTraceCounts.presentPaths > 0,
      { containerTraceCounts: aiStatus.containerTraceCounts || null }
    );
    ensure(
      report,
      'marginnote-cli ai status restore commands exposed',
      Array.isArray(aiStatus.recommendedCommands) &&
        aiStatus.recommendedCommands.some((command) => command.includes('ai preferences export ./preferences.snapshot.json --snapshot')) &&
        aiStatus.recommendedCommands.some((command) => command.includes('ai preferences restore ./preferences.snapshot.json --dry-run')),
      { recommendedCommands: aiStatus.recommendedCommands || null }
    );
    const aiStatusCompactResult = runCommand(
      'marginnote-cli ai status --compact',
      marginnoteCli,
      ['ai', 'status', '--compact']
    );
    ensure(
      report,
      'marginnote-cli ai status compact next hint exposed',
      /next=preferences_snapshot_restore/.test(aiStatusCompactResult.stdout || ''),
      { stdout: aiStatusCompactResult.stdout || '' }
    );

    const aiOverviewResult = runCommand(
      'marginnote-cli ai overview',
      marginnoteCli,
      ['ai', 'overview', '--json']
    );
    const aiOverview = parseJson('marginnote-cli ai overview', aiOverviewResult.stdout);
    report.commands.push(summarizeCommand(aiOverviewResult, aiOverview));
    ensure(report, 'marginnote-cli ai overview ok', aiOverview.ok === true, { kind: aiOverview.kind });
    ensure(
      report,
      'marginnote-cli ai overview surface counts exposed',
      aiOverview.surfaceCounts && typeof aiOverview.surfaceCounts.visible === 'number' && typeof aiOverview.surfaceCounts.total === 'number',
      { surfaceCounts: aiOverview.surfaceCounts || null }
    );
    ensure(
      report,
      'marginnote-cli ai overview surfaces exposed',
      Array.isArray(aiOverview.surfaces) && aiOverview.surfaces.length > 0,
      { surfaces: aiOverview.surfaces || null }
    );
    ensure(
      report,
      'marginnote-cli ai overview recommended commands exposed',
      Array.isArray(aiOverview.recommendedCommands) &&
        aiOverview.recommendedCommands.some((command) => command.includes('ai preferences export ./preferences.snapshot.json --snapshot')) &&
        aiOverview.recommendedCommands.some((command) => command.includes('ai preferences restore ./preferences.snapshot.json --dry-run')),
      { recommendedCommands: aiOverview.recommendedCommands || null }
    );

    const aiBoundariesResult = runCommand(
      'marginnote-cli ai boundaries',
      marginnoteCli,
      ['ai', 'boundaries', '--json']
    );
    const aiBoundaries = parseJson('marginnote-cli ai boundaries', aiBoundariesResult.stdout);
    report.commands.push(summarizeCommand(aiBoundariesResult, aiBoundaries));
    ensure(report, 'marginnote-cli ai boundaries ok', aiBoundaries.ok === true, { kind: aiBoundaries.kind });
    ensure(
      report,
      'marginnote-cli ai boundaries visible count exposed',
      aiBoundaries.counts && typeof aiBoundaries.counts.visible === 'number' && aiBoundaries.counts.visible > 0,
      { counts: aiBoundaries.counts || null }
    );
    ensure(
      report,
      'marginnote-cli ai boundaries can entries exposed',
      Array.isArray(aiBoundaries.can) && aiBoundaries.can.length > 0,
      { can: aiBoundaries.can || null }
    );
    ensure(
      report,
      'marginnote-cli ai boundaries restricted entries exposed',
      Array.isArray(aiBoundaries.restricted) && aiBoundaries.restricted.length > 0,
      { restricted: aiBoundaries.restricted || null }
    );
    ensure(
      report,
      'marginnote-cli ai boundaries cannot array exposed',
      Array.isArray(aiBoundaries.cannot),
      { cannot: aiBoundaries.cannot || null }
    );
    ensure(
      report,
      'marginnote-cli ai boundaries direct plugin access not verified',
      aiBoundaries.highlights && aiBoundaries.highlights.directPluginAccessVerified === false,
      { highlights: aiBoundaries.highlights || null }
    );
    ensure(
      report,
      'marginnote-cli ai boundaries recommended commands exposed',
      Array.isArray(aiBoundaries.recommendedCommands) && aiBoundaries.recommendedCommands.length > 0,
      { recommendedCommands: aiBoundaries.recommendedCommands || null }
    );

    const aiPromptsResult = runCommand(
      'marginnote-cli ai prompts',
      marginnoteCli,
      ['ai', 'prompts', '--json']
    );
    const aiPrompts = parseJson('marginnote-cli ai prompts', aiPromptsResult.stdout);
    report.commands.push(summarizeCommand(aiPromptsResult, aiPrompts));
    ensure(report, 'marginnote-cli ai prompts ok', aiPrompts.ok === true, { kind: aiPrompts.kind });
    ensure(
      report,
      'marginnote-cli ai prompts tool contract exposed',
      aiPrompts.signalFlags && aiPrompts.signalFlags.toolContract === true,
      { signalFlags: aiPrompts.signalFlags || null }
    );
    ensure(
      report,
      'marginnote-cli ai prompts module counts exposed',
      aiPrompts.promptModuleCounts && typeof aiPrompts.promptModuleCounts.total === 'number' && aiPrompts.promptModuleCounts.total > 0,
      { promptModuleCounts: aiPrompts.promptModuleCounts || null }
    );
    ensure(
      report,
      'marginnote-cli ai prompts tool names exposed',
      Array.isArray(aiPrompts.toolNames) && aiPrompts.toolNames.length > 0,
      { toolNames: aiPrompts.toolNames || null }
    );
    ensure(
      report,
      'marginnote-cli ai prompts category coverage exposed',
      aiPrompts.categoryCounts && Object.keys(aiPrompts.categoryCounts).length > 0,
      { categoryCounts: aiPrompts.categoryCounts || null }
    );

    const aiStudyResult = runCommand(
      'marginnote-cli ai study',
      marginnoteCli,
      ['ai', 'study', '--json']
    );
    const aiStudy = parseJson('marginnote-cli ai study', aiStudyResult.stdout);
    report.commands.push(summarizeCommand(aiStudyResult, aiStudy));
    ensure(report, 'marginnote-cli ai study ok', aiStudy.ok === true, { kind: aiStudy.kind });
    ensure(
      report,
      'marginnote-cli ai study guide signal exposed',
      aiStudy.studyModes && aiStudy.studyModes.guide && Object.prototype.hasOwnProperty.call(aiStudy.studyModes.guide, 'present'),
      { studyModes: aiStudy.studyModes || null }
    );
    ensure(
      report,
      'marginnote-cli ai study active count exposed',
      aiStudy.studyModes && typeof aiStudy.studyModes.activeCount === 'number',
      { studyModes: aiStudy.studyModes || null }
    );
    ensure(
      report,
      'marginnote-cli ai study prompt surface exposed',
      aiStudy.promptSurface && Object.prototype.hasOwnProperty.call(aiStudy.promptSurface, 'toolContract'),
      { promptSurface: aiStudy.promptSurface || null }
    );

    const aiTracesResult = runCommand(
      'marginnote-cli ai traces',
      marginnoteCli,
      ['ai', 'traces', '--json']
    );
    const aiTraces = parseJson('marginnote-cli ai traces', aiTracesResult.stdout);
    report.commands.push(summarizeCommand(aiTracesResult, aiTraces));
    ensure(report, 'marginnote-cli ai traces ok', aiTraces.ok === true, { kind: aiTraces.kind });
    ensure(
      report,
      'marginnote-cli ai traces diagnostic tree exposed',
      aiTraces.diagnosticTree && typeof aiTraces.diagnosticTree.nextCheckPath === 'string',
      { diagnosticTree: aiTraces.diagnosticTree || null }
    );
    ensure(
      report,
      'marginnote-cli ai traces file checks exposed',
      aiTraces.diagnosticTree && Array.isArray(aiTraces.diagnosticTree.fileChecks) && aiTraces.diagnosticTree.fileChecks.length >= 1,
      { diagnosticTree: aiTraces.diagnosticTree || null }
    );
    ensure(
      report,
      'marginnote-cli ai traces breakdown signal count exposed',
      aiTraces.breakdown && typeof aiTraces.breakdown.signalCount === 'number',
      { breakdown: aiTraces.breakdown || null }
    );

    const aiMemoryResult = runCommand(
      'marginnote-cli ai memory',
      marginnoteCli,
      ['ai', 'memory', '--json']
    );
    const aiMemory = parseJson('marginnote-cli ai memory', aiMemoryResult.stdout);
    report.commands.push(summarizeCommand(aiMemoryResult, aiMemory));
    ensure(report, 'marginnote-cli ai memory ok', aiMemory.ok === true, { kind: aiMemory.kind });
    ensure(
      report,
      'marginnote-cli ai memory chat signals exposed',
      aiMemory.memorySignals && typeof aiMemory.memorySignals.chatSignalCount === 'number',
      { memorySignals: aiMemory.memorySignals || null }
    );
    ensure(
      report,
      'marginnote-cli ai memory chat memory path visible',
      aiMemory.traces && aiMemory.traces.chatMemories && aiMemory.traces.chatMemories.exists === true,
      { traces: aiMemory.traces || null }
    );
    ensure(
      report,
      'marginnote-cli ai memory diagnostic tree exposed',
      aiMemory.diagnosticTree && typeof aiMemory.diagnosticTree.nextCheckPath === 'string',
      { diagnosticTree: aiMemory.diagnosticTree || null }
    );

    const margPrefsResult = runCommand(
      'marginnote-cli ai preferences',
      marginnoteCli,
      ['ai', 'preferences', '--json']
    );
    const margPrefs = parseJson('marginnote-cli ai preferences', margPrefsResult.stdout);
    report.commands.push(summarizeCommand(margPrefsResult, margPrefs));
    ensure(report, 'marginnote-cli ai preferences ok', margPrefs.ok === true, { kind: margPrefs.kind });
    ensure(
      report,
      'marginnote-cli ai preferences write surface exposed',
      margPrefs.writeSurface && margPrefs.writeSurface.available === true,
      { writeSurface: margPrefs.writeSurface || null }
    );
    ensure(
      report,
      'marginnote-cli ai preferences writable keys exposed',
      typeof margPrefs.writableKeyCount === 'number' && margPrefs.writableKeyCount > 0,
      { writableKeyCount: margPrefs.writableKeyCount || 0 }
    );

    const margPrefsExportPath = path.join(temporaryWorkspace, 'marginnote-preferences-export.snapshot.json');
    const margPrefsExportResult = runCommand(
      'marginnote-cli ai preferences export',
      marginnoteCli,
      ['ai', 'preferences', 'export', margPrefsExportPath, '--snapshot', '--json']
    );
    const margPrefsExport = parseJson('marginnote-cli ai preferences export', margPrefsExportResult.stdout);
    report.commands.push(summarizeCommand(margPrefsExportResult, margPrefsExport));
    ensure(report, 'marginnote-cli ai preferences export ok', margPrefsExport.ok === true, { kind: margPrefsExport.kind });
    ensure(report, 'marginnote-cli ai preferences export wrote file', margPrefsExport.wroteFile === true, {
      wroteFile: margPrefsExport.wroteFile,
    });
    ensure(
      report,
      'marginnote-cli ai preferences export supported key count exposed',
      margPrefsExport.totalSupportedKeys === 7,
      { totalSupportedKeys: margPrefsExport.totalSupportedKeys || 0 }
    );
    ensure(
      report,
      'marginnote-cli ai preferences export patch file exists',
      fs.existsSync(margPrefsExportPath),
      { outputPath: margPrefsExportPath }
    );
    const margPrefsExportFile = parseJson(
      'marginnote-cli ai preferences export file',
      fs.readFileSync(margPrefsExportPath, 'utf8')
    );
    ensure(
      report,
      'marginnote-cli ai preferences export snapshot shape',
      margPrefsExportFile && margPrefsExportFile.kind === 'ai_preferences_snapshot' && margPrefsExportFile.patch && typeof margPrefsExportFile.patch === 'object',
      { snapshotKind: margPrefsExportFile ? margPrefsExportFile.kind : null }
    );
    ensure(
      report,
      'marginnote-cli ai preferences export snapshot keys align',
      margPrefsExportFile && Object.keys(margPrefsExportFile.patch || {}).length === (margPrefsExport.fieldCount || 0),
      { fileKeys: margPrefsExportFile ? Object.keys(margPrefsExportFile.patch || {}).length : null, fieldCount: margPrefsExport.fieldCount || 0 }
    );

    const margPrefsRestorePath = writeTempJsonFile(temporaryWorkspace, 'marginnote-preferences-restore.json', {
      version: 1,
      kind: 'ai_preferences_snapshot',
      patch: {
        mindbooks_use_ai_ocr: true,
        AIBreakdownLastSelectedMode: 'guide',
      },
      missingKeys: ['mindbooks_toolname'],
    });
    const margPrefsRestoreResult = runCommand(
      'marginnote-cli ai preferences restore',
      marginnoteCli,
      ['ai', 'preferences', 'restore', margPrefsRestorePath, '--dry-run', '--json']
    );
    const margPrefsRestore = parseJson('marginnote-cli ai preferences restore', margPrefsRestoreResult.stdout);
    report.commands.push(summarizeCommand(margPrefsRestoreResult, margPrefsRestore));
    ensure(report, 'marginnote-cli ai preferences restore ok', margPrefsRestore.ok === true, { kind: margPrefsRestore.kind });
    ensure(report, 'marginnote-cli ai preferences restore dry-run', margPrefsRestore.dryRun === true, {
      dryRun: margPrefsRestore.dryRun,
    });
    ensure(report, 'marginnote-cli ai preferences restore mode', margPrefsRestore.mode === 'dry_run', {
      mode: margPrefsRestore.mode,
    });
    ensure(report, 'marginnote-cli ai preferences restore operation', margPrefsRestore.operation === 'restore', {
      operation: margPrefsRestore.operation,
    });
    ensure(report, 'marginnote-cli ai preferences restore format', margPrefsRestore.restoreFormat === 'snapshot', {
      restoreFormat: margPrefsRestore.restoreFormat || null,
    });
    ensure(report, 'marginnote-cli ai preferences restore change count', margPrefsRestore.changeCount === 3, {
      changeCount: margPrefsRestore.changeCount || 0,
    });

    const margPrefsSetResult = runCommand(
      'marginnote-cli ai preferences set',
      marginnoteCli,
      ['ai', 'preferences', 'set', 'mindbooks_use_ai_ocr', 'true', '--dry-run', '--json']
    );
    const margPrefsSet = parseJson('marginnote-cli ai preferences set', margPrefsSetResult.stdout);
    report.commands.push(summarizeCommand(margPrefsSetResult, margPrefsSet));
    ensure(report, 'marginnote-cli ai preferences set ok', margPrefsSet.ok === true, { kind: margPrefsSet.kind });
    ensure(report, 'marginnote-cli ai preferences set dry-run', margPrefsSet.dryRun === true, {
      dryRun: margPrefsSet.dryRun,
    });
    ensure(report, 'marginnote-cli ai preferences set mode', margPrefsSet.mode === 'dry_run', {
      mode: margPrefsSet.mode,
    });
    ensure(report, 'marginnote-cli ai preferences set change count', margPrefsSet.changeCount === 1, {
      changeCount: margPrefsSet.changeCount || 0,
    });
    ensure(
      report,
      'marginnote-cli ai preferences set write surface exposed',
      margPrefsSet.writeSurface && margPrefsSet.writeSurface.available === true,
      { writeSurface: margPrefsSet.writeSurface || null }
    );

    const margPrefsSetApplyResult = runCommand(
      'marginnote-cli ai preferences set apply',
      marginnoteCli,
      [
        '--preference-domain',
        temporaryPreferenceDomains.set,
        'ai',
        'preferences',
        'set',
        'mindbooks_use_ai_ocr',
        'true',
        '--json',
      ]
    );
    const margPrefsSetApply = parseJson('marginnote-cli ai preferences set apply', margPrefsSetApplyResult.stdout);
    report.commands.push(summarizeCommand(margPrefsSetApplyResult, margPrefsSetApply));
    ensure(report, 'marginnote-cli ai preferences set apply ok', margPrefsSetApply.ok === true, {
      kind: margPrefsSetApply.kind,
    });
    ensure(report, 'marginnote-cli ai preferences set apply mode', margPrefsSetApply.mode === 'apply', {
      mode: margPrefsSetApply.mode,
    });
    ensure(report, 'marginnote-cli ai preferences set apply changed count', margPrefsSetApply.changedCount === 1, {
      changedCount: margPrefsSetApply.changedCount || 0,
    });
    ensure(
      report,
      'marginnote-cli ai preferences set apply after value persisted',
      margPrefsSetApply.after &&
        margPrefsSetApply.after.currentValues &&
        margPrefsSetApply.after.currentValues.mindbooks_use_ai_ocr === true,
      { after: margPrefsSetApply.after || null }
    );

    const margPrefsReadbackResult = runCommand(
      'marginnote-cli ai preferences readback',
      marginnoteCli,
      [
        '--preference-domain',
        temporaryPreferenceDomains.set,
        'ai',
        'preferences',
        '--json',
      ]
    );
    const margPrefsReadback = parseJson('marginnote-cli ai preferences readback', margPrefsReadbackResult.stdout);
    report.commands.push(summarizeCommand(margPrefsReadbackResult, margPrefsReadback));
    ensure(report, 'marginnote-cli ai preferences readback ok', margPrefsReadback.ok === true, {
      kind: margPrefsReadback.kind,
    });
    ensure(
      report,
      'marginnote-cli ai preferences readback sees applied value',
      margPrefsReadback.currentValues &&
        Object.prototype.hasOwnProperty.call(margPrefsReadback.currentValues, 'mindbooks_use_ai_ocr') &&
        margPrefsReadback.currentValues.mindbooks_use_ai_ocr === true,
      { currentValues: margPrefsReadback.currentValues || null }
    );

    const margPrefsPatchPath = writeTempJsonFile(temporaryWorkspace, 'marginnote-preferences.json', {
      mindbooks_use_ai_ocr: true,
      AIBreakdownLastSelectedMode: 'guide',
    });
    const margPrefsPatchResult = runCommand(
      'marginnote-cli ai preferences patch',
      marginnoteCli,
      ['ai', 'preferences', 'patch', margPrefsPatchPath, '--dry-run', '--json']
    );
    const margPrefsPatch = parseJson('marginnote-cli ai preferences patch', margPrefsPatchResult.stdout);
    report.commands.push(summarizeCommand(margPrefsPatchResult, margPrefsPatch));
    ensure(report, 'marginnote-cli ai preferences patch ok', margPrefsPatch.ok === true, { kind: margPrefsPatch.kind });
    ensure(report, 'marginnote-cli ai preferences patch dry-run', margPrefsPatch.dryRun === true, {
      dryRun: margPrefsPatch.dryRun,
    });
    ensure(report, 'marginnote-cli ai preferences patch mode', margPrefsPatch.mode === 'dry_run', {
      mode: margPrefsPatch.mode,
    });
    ensure(report, 'marginnote-cli ai preferences patch change count', margPrefsPatch.changeCount === 2, {
      changeCount: margPrefsPatch.changeCount || 0,
    });
    ensure(
      report,
      'marginnote-cli ai preferences patch changes exposed',
      Array.isArray(margPrefsPatch.changes) && margPrefsPatch.changes.length === 2,
      { changes: margPrefsPatch.changes || null }
    );

    const margPrefsResetResult = runCommand(
      'marginnote-cli ai preferences reset',
      marginnoteCli,
      ['ai', 'preferences', 'reset', '--all', '--dry-run', '--json']
    );
    const margPrefsReset = parseJson('marginnote-cli ai preferences reset', margPrefsResetResult.stdout);
    report.commands.push(summarizeCommand(margPrefsResetResult, margPrefsReset));
    ensure(report, 'marginnote-cli ai preferences reset ok', margPrefsReset.ok === true, { kind: margPrefsReset.kind });
    ensure(report, 'marginnote-cli ai preferences reset dry-run', margPrefsReset.dryRun === true, {
      dryRun: margPrefsReset.dryRun,
    });
    ensure(report, 'marginnote-cli ai preferences reset mode', margPrefsReset.mode === 'dry_run', {
      mode: margPrefsReset.mode,
    });
    ensure(report, 'marginnote-cli ai preferences reset operation', margPrefsReset.operation === 'reset', {
      operation: margPrefsReset.operation,
    });
    ensure(report, 'marginnote-cli ai preferences reset change count', margPrefsReset.changeCount === 7, {
      changeCount: margPrefsReset.changeCount || 0,
    });
    ensure(
      report,
      'marginnote-cli ai preferences reset write surface exposed',
      margPrefsReset.writeSurface && margPrefsReset.writeSurface.available === true,
      { writeSurface: margPrefsReset.writeSurface || null }
    );

    const margPrefsPatchApplyResult = runCommand(
      'marginnote-cli ai preferences patch apply',
      marginnoteCli,
      [
        '--preference-domain',
        temporaryPreferenceDomains.patch,
        'ai',
        'preferences',
        'patch',
        margPrefsPatchPath,
        '--json',
      ]
    );
    const margPrefsPatchApply = parseJson('marginnote-cli ai preferences patch apply', margPrefsPatchApplyResult.stdout);
    report.commands.push(summarizeCommand(margPrefsPatchApplyResult, margPrefsPatchApply));
    ensure(report, 'marginnote-cli ai preferences patch apply ok', margPrefsPatchApply.ok === true, {
      kind: margPrefsPatchApply.kind,
    });
    ensure(report, 'marginnote-cli ai preferences patch apply mode', margPrefsPatchApply.mode === 'apply', {
      mode: margPrefsPatchApply.mode,
    });
    ensure(report, 'marginnote-cli ai preferences patch apply changed count', margPrefsPatchApply.changedCount === 2, {
      changedCount: margPrefsPatchApply.changedCount || 0,
    });
    ensure(
      report,
      'marginnote-cli ai preferences patch apply values persisted',
      margPrefsPatchApply.after &&
        margPrefsPatchApply.after.currentValues &&
        margPrefsPatchApply.after.currentValues.mindbooks_use_ai_ocr === true &&
        margPrefsPatchApply.after.currentValues.AIBreakdownLastSelectedMode === 'guide',
      { after: margPrefsPatchApply.after || null }
    );

    const margPrefsPatchReadbackResult = runCommand(
      'marginnote-cli ai preferences patch readback',
      marginnoteCli,
      [
        '--preference-domain',
        temporaryPreferenceDomains.patch,
        'ai',
        'preferences',
        '--json',
      ]
    );
    const margPrefsPatchReadback = parseJson('marginnote-cli ai preferences patch readback', margPrefsPatchReadbackResult.stdout);
    report.commands.push(summarizeCommand(margPrefsPatchReadbackResult, margPrefsPatchReadback));
    ensure(report, 'marginnote-cli ai preferences patch readback ok', margPrefsPatchReadback.ok === true, {
      kind: margPrefsPatchReadback.kind,
    });
    ensure(
      report,
      'marginnote-cli ai preferences patch readback sees applied values',
      margPrefsPatchReadback.currentValues &&
        margPrefsPatchReadback.currentValues.mindbooks_use_ai_ocr === true &&
        margPrefsPatchReadback.currentValues.AIBreakdownLastSelectedMode === 'guide',
      { currentValues: margPrefsPatchReadback.currentValues || null }
    );

    const margPrefsResetSeedBoolResult = runCommand(
      'marginnote-cli ai preferences reset seed bool',
      marginnoteCli,
      [
        '--preference-domain',
        temporaryPreferenceDomains.reset,
        'ai',
        'preferences',
        'set',
        'mindbooks_use_ai_ocr',
        'true',
        '--json',
      ]
    );
    const margPrefsResetSeedBool = parseJson('marginnote-cli ai preferences reset seed bool', margPrefsResetSeedBoolResult.stdout);
    report.commands.push(summarizeCommand(margPrefsResetSeedBoolResult, margPrefsResetSeedBool));
    ensure(report, 'marginnote-cli ai preferences reset seed bool ok', margPrefsResetSeedBool.ok === true, {
      kind: margPrefsResetSeedBool.kind,
    });
    ensure(report, 'marginnote-cli ai preferences reset seed bool mode', margPrefsResetSeedBool.mode === 'apply', {
      mode: margPrefsResetSeedBool.mode,
    });
    ensure(report, 'marginnote-cli ai preferences reset seed bool changed count', margPrefsResetSeedBool.changedCount === 1, {
      changedCount: margPrefsResetSeedBool.changedCount || 0,
    });

    const margPrefsResetSeedModeResult = runCommand(
      'marginnote-cli ai preferences reset seed mode',
      marginnoteCli,
      [
        '--preference-domain',
        temporaryPreferenceDomains.reset,
        'ai',
        'preferences',
        'set',
        'AIBreakdownLastSelectedMode',
        'guide',
        '--json',
      ]
    );
    const margPrefsResetSeedMode = parseJson('marginnote-cli ai preferences reset seed mode', margPrefsResetSeedModeResult.stdout);
    report.commands.push(summarizeCommand(margPrefsResetSeedModeResult, margPrefsResetSeedMode));
    ensure(report, 'marginnote-cli ai preferences reset seed mode ok', margPrefsResetSeedMode.ok === true, {
      kind: margPrefsResetSeedMode.kind,
    });
    ensure(report, 'marginnote-cli ai preferences reset seed mode changed count', margPrefsResetSeedMode.changedCount === 1, {
      changedCount: margPrefsResetSeedMode.changedCount || 0,
    });

    const margPrefsResetSeedReadbackResult = runCommand(
      'marginnote-cli ai preferences reset seed readback',
      marginnoteCli,
      [
        '--preference-domain',
        temporaryPreferenceDomains.reset,
        'ai',
        'preferences',
        '--json',
      ]
    );
    const margPrefsResetSeedReadback = parseJson('marginnote-cli ai preferences reset seed readback', margPrefsResetSeedReadbackResult.stdout);
    report.commands.push(summarizeCommand(margPrefsResetSeedReadbackResult, margPrefsResetSeedReadback));
    ensure(report, 'marginnote-cli ai preferences reset seed readback ok', margPrefsResetSeedReadback.ok === true, {
      kind: margPrefsResetSeedReadback.kind,
    });
    ensure(
      report,
      'marginnote-cli ai preferences reset seed readback sees seeded values',
      margPrefsResetSeedReadback.currentValues &&
        margPrefsResetSeedReadback.currentValues.mindbooks_use_ai_ocr === true &&
        margPrefsResetSeedReadback.currentValues.AIBreakdownLastSelectedMode === 'guide',
      { currentValues: margPrefsResetSeedReadback.currentValues || null }
    );

    const margPrefsResetApplyResult = runCommand(
      'marginnote-cli ai preferences reset apply',
      marginnoteCli,
      [
        '--preference-domain',
        temporaryPreferenceDomains.reset,
        'ai',
        'preferences',
        'reset',
        'mindbooks_use_ai_ocr',
        'AIBreakdownLastSelectedMode',
        '--json',
      ]
    );
    const margPrefsResetApply = parseJson('marginnote-cli ai preferences reset apply', margPrefsResetApplyResult.stdout);
    report.commands.push(summarizeCommand(margPrefsResetApplyResult, margPrefsResetApply));
    ensure(report, 'marginnote-cli ai preferences reset apply ok', margPrefsResetApply.ok === true, {
      kind: margPrefsResetApply.kind,
    });
    ensure(report, 'marginnote-cli ai preferences reset apply mode', margPrefsResetApply.mode === 'apply', {
      mode: margPrefsResetApply.mode,
    });
    ensure(report, 'marginnote-cli ai preferences reset apply change count', margPrefsResetApply.changeCount === 2, {
      changeCount: margPrefsResetApply.changeCount || 0,
    });

    const margPrefsResetReadbackResult = runCommand(
      'marginnote-cli ai preferences reset readback',
      marginnoteCli,
      [
        '--preference-domain',
        temporaryPreferenceDomains.reset,
        'ai',
        'preferences',
        '--json',
      ]
    );
    const margPrefsResetReadback = parseJson('marginnote-cli ai preferences reset readback', margPrefsResetReadbackResult.stdout);
    report.commands.push(summarizeCommand(margPrefsResetReadbackResult, margPrefsResetReadback));
    ensure(report, 'marginnote-cli ai preferences reset readback ok', margPrefsResetReadback.ok === true, {
      kind: margPrefsResetReadback.kind,
    });
    ensure(
      report,
      'marginnote-cli ai preferences reset readback sees cleared values',
      margPrefsResetReadback.currentValues &&
        margPrefsResetReadback.currentValues.mindbooks_use_ai_ocr === null &&
        margPrefsResetReadback.currentValues.AIBreakdownLastSelectedMode === null,
      { currentValues: margPrefsResetReadback.currentValues || null }
    );

    const margPrefsRestoreSeedResult = runCommand(
      'marginnote-cli ai preferences restore seed',
      marginnoteCli,
      [
        '--preference-domain',
        temporaryPreferenceDomains.restore,
        'ai',
        'preferences',
        'set',
        'mindbooks_toolname',
        'seeded-tool',
        '--json',
      ]
    );
    const margPrefsRestoreSeed = parseJson('marginnote-cli ai preferences restore seed', margPrefsRestoreSeedResult.stdout);
    report.commands.push(summarizeCommand(margPrefsRestoreSeedResult, margPrefsRestoreSeed));
    ensure(report, 'marginnote-cli ai preferences restore seed ok', margPrefsRestoreSeed.ok === true, {
      kind: margPrefsRestoreSeed.kind,
    });
    ensure(report, 'marginnote-cli ai preferences restore seed mode', margPrefsRestoreSeed.mode === 'apply', {
      mode: margPrefsRestoreSeed.mode,
    });
    ensure(report, 'marginnote-cli ai preferences restore seed changed count', margPrefsRestoreSeed.changedCount === 1, {
      changedCount: margPrefsRestoreSeed.changedCount || 0,
    });
    ensure(
      report,
      'marginnote-cli ai preferences restore seed value persisted',
      margPrefsRestoreSeed.after &&
        margPrefsRestoreSeed.after.currentValues &&
        margPrefsRestoreSeed.after.currentValues.mindbooks_toolname === 'seeded-tool',
      { after: margPrefsRestoreSeed.after || null }
    );

    const margPrefsRestoreSeedReadbackResult = runCommand(
      'marginnote-cli ai preferences restore seed readback',
      marginnoteCli,
      [
        '--preference-domain',
        temporaryPreferenceDomains.restore,
        'ai',
        'preferences',
        '--json',
      ]
    );
    const margPrefsRestoreSeedReadback = parseJson('marginnote-cli ai preferences restore seed readback', margPrefsRestoreSeedReadbackResult.stdout);
    report.commands.push(summarizeCommand(margPrefsRestoreSeedReadbackResult, margPrefsRestoreSeedReadback));
    ensure(report, 'marginnote-cli ai preferences restore seed readback ok', margPrefsRestoreSeedReadback.ok === true, {
      kind: margPrefsRestoreSeedReadback.kind,
    });
    ensure(
      report,
      'marginnote-cli ai preferences restore seed readback sees seeded value',
      margPrefsRestoreSeedReadback.currentValues &&
        margPrefsRestoreSeedReadback.currentValues.mindbooks_toolname === 'seeded-tool',
      { currentValues: margPrefsRestoreSeedReadback.currentValues || null }
    );

    const margPrefsRestoreApplyResult = runCommand(
      'marginnote-cli ai preferences restore apply',
      marginnoteCli,
      [
        '--preference-domain',
        temporaryPreferenceDomains.restore,
        'ai',
        'preferences',
        'restore',
        margPrefsRestorePath,
        '--json',
      ]
    );
    const margPrefsRestoreApply = parseJson('marginnote-cli ai preferences restore apply', margPrefsRestoreApplyResult.stdout);
    report.commands.push(summarizeCommand(margPrefsRestoreApplyResult, margPrefsRestoreApply));
    ensure(report, 'marginnote-cli ai preferences restore apply ok', margPrefsRestoreApply.ok === true, {
      kind: margPrefsRestoreApply.kind,
    });
    ensure(report, 'marginnote-cli ai preferences restore apply mode', margPrefsRestoreApply.mode === 'apply', {
      mode: margPrefsRestoreApply.mode,
    });
    ensure(report, 'marginnote-cli ai preferences restore apply change count', margPrefsRestoreApply.changeCount === 3, {
      changeCount: margPrefsRestoreApply.changeCount || 0,
    });
    ensure(
      report,
      'marginnote-cli ai preferences restore apply values persisted',
      margPrefsRestoreApply.after &&
        margPrefsRestoreApply.after.currentValues &&
        margPrefsRestoreApply.after.currentValues.mindbooks_toolname === null &&
        margPrefsRestoreApply.after.currentValues.mindbooks_use_ai_ocr === true &&
        margPrefsRestoreApply.after.currentValues.AIBreakdownLastSelectedMode === 'guide',
      { after: margPrefsRestoreApply.after || null }
    );

    const margPrefsRestoreReadbackResult = runCommand(
      'marginnote-cli ai preferences restore readback',
      marginnoteCli,
      [
        '--preference-domain',
        temporaryPreferenceDomains.restore,
        'ai',
        'preferences',
        '--json',
      ]
    );
    const margPrefsRestoreReadback = parseJson('marginnote-cli ai preferences restore readback', margPrefsRestoreReadbackResult.stdout);
    report.commands.push(summarizeCommand(margPrefsRestoreReadbackResult, margPrefsRestoreReadback));
    ensure(report, 'marginnote-cli ai preferences restore readback ok', margPrefsRestoreReadback.ok === true, {
      kind: margPrefsRestoreReadback.kind,
    });
    ensure(
      report,
      'marginnote-cli ai preferences restore readback sees restored values',
      margPrefsRestoreReadback.currentValues &&
        margPrefsRestoreReadback.currentValues.mindbooks_toolname === null &&
        margPrefsRestoreReadback.currentValues.mindbooks_use_ai_ocr === true &&
        margPrefsRestoreReadback.currentValues.AIBreakdownLastSelectedMode === 'guide',
      { currentValues: margPrefsRestoreReadback.currentValues || null }
    );

    const appInfoPath =
      margDoctor.app &&
      margDoctor.app.resources &&
      margDoctor.app.resources.infoPlist
        ? margDoctor.app.resources.infoPlist
        : path.join(report.roots.marginnoteCliRoot, 'Contents', 'Info.plist');
    const appReadResult = runCommand(
      'marginnote-cli read Info.plist',
      marginnoteCli,
      ['read', appInfoPath, '--json']
    );
    const appRead = parseJson('marginnote-cli read Info.plist', appReadResult.stdout);
    report.commands.push(summarizeCommand(appReadResult, appRead));
    ensure(report, 'marginnote-cli read ok', appRead.ok === true, { kind: appRead.kind });
    ensure(report, 'marginnote-cli read file', appRead.type === 'file', { type: appRead.type });

    const breakdownResult = runCommand(
      'marginnote-cli ai breakdown',
      marginnoteCli,
      ['ai', 'breakdown', '--json']
    );
    const breakdown = parseJson('marginnote-cli ai breakdown', breakdownResult.stdout);
    report.commands.push(summarizeCommand(breakdownResult, breakdown));
    ensure(report, 'marginnote-cli ai breakdown ok', breakdown.ok === true, { kind: breakdown.kind });
    ensure(report, 'marginnote-cli breakdown present', breakdown.present === true, { present: breakdown.present });

    const doctorResult = runCommand(
      'mn-obsidian-bridge doctor',
      bridgeCli,
      [
        '--vault-path',
        report.roots.vaultPath,
        '--export-root',
        report.roots.exportRoot,
        'doctor',
        '--json',
      ]
    );
    const bridgeDoctor = parseJson('mn-obsidian-bridge doctor', doctorResult.stdout);
    report.commands.push(summarizeCommand(doctorResult, bridgeDoctor));
    ensure(report, 'mn-obsidian-bridge doctor ok', bridgeDoctor.ok === true, { kind: bridgeDoctor.kind });
    ensure(report, 'mn-obsidian-bridge doctor warnings empty', Array.isArray(bridgeDoctor.warnings) && bridgeDoctor.warnings.length === 0, {
      warnings: bridgeDoctor.warnings,
    });
    const bridgeDoctorCompactResult = runCommand(
      'mn-obsidian-bridge doctor --compact',
      bridgeCli,
      [
        '--vault-path',
        report.roots.vaultPath,
        '--export-root',
        report.roots.exportRoot,
        'doctor',
        '--compact',
      ]
    );
    ensure(
      report,
      'mn-obsidian-bridge doctor compact next hint exposed',
      /next=mn-obsidian-bridge ob settings export \.\/ob-settings\.snapshot\.json --snapshot/.test(bridgeDoctorCompactResult.stdout || ''),
      { stdout: bridgeDoctorCompactResult.stdout || '' }
    );
    ensure(
      report,
      'mn-obsidian-bridge doctor restore commands exposed',
      Array.isArray(bridgeDoctor.recommendedCommands) &&
        bridgeDoctor.recommendedCommands.some((command) => command.includes('ob settings export ./ob-settings.snapshot.json --snapshot')) &&
        bridgeDoctor.recommendedCommands.some((command) => command.includes('ob settings restore ./ob-settings.snapshot.json --dry-run')),
      { recommendedCommands: bridgeDoctor.recommendedCommands || null }
    );
    ensure(
      report,
      'mn-obsidian-bridge doctor settings summary exposed',
      Object.prototype.hasOwnProperty.call(bridgeDoctor, 'settingsSummary'),
      { settingsSummary: bridgeDoctor.settingsSummary || null }
    );
    report.doctorSettings = summarizeBridgeSettings(bridgeDoctor);
    ensure(
      report,
      'mn-obsidian-bridge doctor settings summary readable',
      report.doctorSettings && typeof report.doctorSettings.summary === 'string',
      { doctorSettings: report.doctorSettings }
    );
    ensure(
      report,
      'mn-obsidian-bridge doctor settings path recorded',
      typeof bridgeDoctor.settingsPath === 'string' && bridgeDoctor.settingsPath.length > 0,
      { settingsPath: bridgeDoctor.settingsPath || null }
    );
    ensure(report, 'mn inventory evidence visible', bridgeDoctor.mn && bridgeDoctor.mn.summary, {
      mn: bridgeDoctor.mn ? bridgeDoctor.mn.summary : null,
    });
    ensure(report, 'ob inventory evidence visible', bridgeDoctor.ob && bridgeDoctor.ob.summary, {
      ob: bridgeDoctor.ob ? bridgeDoctor.ob.summary : null,
    });

    const mnInventoryResult = runCommand(
      'mn-obsidian-bridge mn inventory',
      bridgeCli,
      [
        '--vault-path',
        report.roots.vaultPath,
        '--export-root',
        report.roots.exportRoot,
        'mn',
        'inventory',
        '--json',
      ]
    );
    const mnInventory = parseJson('mn-obsidian-bridge mn inventory', mnInventoryResult.stdout);
    report.commands.push(summarizeCommand(mnInventoryResult, mnInventory));
    ensure(report, 'mn-obsidian-bridge mn inventory ok', mnInventory.ok === true, { kind: mnInventory.kind });
    ensure(
      report,
      'mn-obsidian-bridge export root visible',
      Array.isArray(mnInventory.paths && mnInventory.paths.exportRoots) &&
        mnInventory.paths.exportRoots.some((entry) => entry && entry.exists === true),
      { exportRoots: mnInventory.paths ? mnInventory.paths.exportRoots : null }
    );

    const obInventoryResult = runCommand(
      'mn-obsidian-bridge ob inventory',
      bridgeCli,
      [
        '--vault-path',
        report.roots.vaultPath,
        '--export-root',
        report.roots.exportRoot,
        'ob',
        'inventory',
        '--json',
      ]
    );
    const obInventory = parseJson('mn-obsidian-bridge ob inventory', obInventoryResult.stdout);
    report.commands.push(summarizeCommand(obInventoryResult, obInventory));
    ensure(report, 'mn-obsidian-bridge ob inventory ok', obInventory.ok === true, { kind: obInventory.kind });
    ensure(report, 'mn-obsidian-bridge vault visible', obInventory.paths && obInventory.paths.vault && obInventory.paths.vault.exists === true, {
      vault: obInventory.paths ? obInventory.paths.vault : null,
    });
    ensure(report, 'mn-obsidian-bridge settings path recorded', obInventory.paths && obInventory.paths.settingsPath && Object.prototype.hasOwnProperty.call(obInventory.paths.settingsPath, 'exists'), {
      settingsPath: obInventory.paths ? obInventory.paths.settingsPath : null,
    });
    ensure(
      report,
      'mn-obsidian-bridge settings summary exposed',
      Object.prototype.hasOwnProperty.call(obInventory, 'settingsSummary'),
      { settingsSummary: obInventory.settingsSummary || null }
    );
    report.bridgeSettings = summarizeBridgeSettings(obInventory);
    ensure(
      report,
      'mn-obsidian-bridge settings summary readable',
      report.bridgeSettings && typeof report.bridgeSettings.summary === 'string',
      { bridgeSettings: report.bridgeSettings }
    );

    const obStatusResult = runCommand(
      'mn-obsidian-bridge ob status',
      bridgeCli,
      [
        '--vault-path',
        report.roots.vaultPath,
        '--export-root',
        report.roots.exportRoot,
        'ob',
        'status',
        '--json',
      ]
    );
    const obStatus = parseJson('mn-obsidian-bridge ob status', obStatusResult.stdout);
    report.commands.push(summarizeCommand(obStatusResult, obStatus));
    ensure(report, 'mn-obsidian-bridge ob status ok', obStatus.ok === true, { kind: obStatus.kind });
    ensure(
      report,
      'mn-obsidian-bridge ob status restore commands exposed',
      Array.isArray(obStatus.recommendedCommands) &&
        obStatus.recommendedCommands.some((command) => command.includes('ob settings export ./ob-settings.snapshot.json --snapshot')) &&
        obStatus.recommendedCommands.some((command) => command.includes('ob settings restore ./ob-settings.snapshot.json --dry-run')),
      { recommendedCommands: obStatus.recommendedCommands || null }
    );
    const obStatusCompactResult = runCommand(
      'mn-obsidian-bridge ob status --compact',
      bridgeCli,
      [
        '--vault-path',
        report.roots.vaultPath,
        '--export-root',
        report.roots.exportRoot,
        'ob',
        'status',
        '--compact',
      ]
    );
    ensure(
      report,
      'mn-obsidian-bridge ob status compact next hint exposed',
      /next=mn-obsidian-bridge ob settings export \.\/ob-settings\.snapshot\.json --snapshot/.test(obStatusCompactResult.stdout || ''),
      { stdout: obStatusCompactResult.stdout || '' }
    );

    const bridgeDoctorScript = path.join(ROOT_DIR, 'scripts', 'bridge-doctor.js');
    const rootBridgeDoctorResult = runCommand(
      'bridge doctor script',
      bridgeDoctorScript,
      [],
      {
        MN_AGENT_REPORTS_DIR: temporaryBreakdownArtifacts.reportsDir,
        MN_AGENT_REQUESTS_DIR: temporaryBreakdownArtifacts.requestsDir,
      }
    );
    const rootBridgeDoctor = parseJson('bridge doctor script', rootBridgeDoctorResult.stdout);
    report.commands.push(summarizeCommand(rootBridgeDoctorResult, rootBridgeDoctor));
    ensure(report, 'bridge doctor script ok', !!rootBridgeDoctor.bridgeStatus, { bridgeStatus: rootBridgeDoctor.bridgeStatus || null });
    ensure(
      report,
      'bridge doctor script latest follow-up apply exposed',
      rootBridgeDoctor.latestFollowupApply &&
        rootBridgeDoctor.latestFollowupApply.summary &&
        rootBridgeDoctor.latestFollowupApply.summary.appliedCount === 1,
      { latestFollowupApply: rootBridgeDoctor.latestFollowupApply || null }
    );
    ensure(
      report,
      'bridge doctor script follow-up apply summary exposed',
      typeof rootBridgeDoctor.summary === 'string' &&
        /follow-up apply/.test(rootBridgeDoctor.summary) &&
        /present/.test(rootBridgeDoctor.summary) &&
        /mnaipro-5000000000001-333333-followup/.test(rootBridgeDoctor.summary),
      { summary: rootBridgeDoctor.summary || null }
    );
    ensure(
      report,
      'bridge doctor script restore commands exposed',
      Array.isArray(rootBridgeDoctor.recommendedCommands) &&
        rootBridgeDoctor.recommendedCommands.some((command) => command.includes('ob settings export ./ob-settings.snapshot.json --snapshot')) &&
        rootBridgeDoctor.recommendedCommands.some((command) => command.includes('ob settings restore ./ob-settings.snapshot.json --dry-run')),
      { recommendedCommands: rootBridgeDoctor.recommendedCommands || null }
    );
    ensure(
      report,
      'bridge doctor script obsidian settings exposed',
      rootBridgeDoctor.obsidianSyncSettings && typeof rootBridgeDoctor.obsidianSyncSettings.summary === 'string',
      { obsidianSyncSettings: rootBridgeDoctor.obsidianSyncSettings || null }
    );
    ensure(
      report,
      'bridge doctor script obsidian settings path recorded',
      rootBridgeDoctor.obsidianSyncSettings &&
        typeof rootBridgeDoctor.obsidianSyncSettings.settingsPath === 'string' &&
        rootBridgeDoctor.obsidianSyncSettings.settingsPath.length > 0,
      { obsidianSyncSettings: rootBridgeDoctor.obsidianSyncSettings || null }
    );

    const bridgeOverviewResult = runCommand(
      'mn-obsidian-bridge overview',
      bridgeCli,
      [
        '--vault-path',
        report.roots.vaultPath,
        '--export-root',
        report.roots.exportRoot,
        'overview',
        '--json',
      ]
    );
    const bridgeOverview = parseJson('mn-obsidian-bridge overview', bridgeOverviewResult.stdout);
    report.commands.push(summarizeCommand(bridgeOverviewResult, bridgeOverview));
    ensure(report, 'mn-obsidian-bridge overview ok', bridgeOverview.ok === true, { kind: bridgeOverview.kind });
    ensure(
      report,
      'mn-obsidian-bridge overview surfaces exposed',
      Array.isArray(bridgeOverview.surfaces) && bridgeOverview.surfaces.length > 0,
      { surfaces: bridgeOverview.surfaces || null }
    );
    ensure(
      report,
      'mn-obsidian-bridge overview surface counts exposed',
      bridgeOverview.surfaceCounts && typeof bridgeOverview.surfaceCounts.visible === 'number' && typeof bridgeOverview.surfaceCounts.total === 'number',
      { surfaceCounts: bridgeOverview.surfaceCounts || null }
    );
    ensure(
      report,
      'mn-obsidian-bridge overview recommended commands exposed',
      Array.isArray(bridgeOverview.recommendedCommands) &&
        bridgeOverview.recommendedCommands.some((command) => command.includes('ob settings export ./ob-settings.snapshot.json --snapshot')) &&
        bridgeOverview.recommendedCommands.some((command) => command.includes('ob settings restore ./ob-settings.snapshot.json --dry-run')),
      { recommendedCommands: bridgeOverview.recommendedCommands || null }
    );

    const bridgeCapabilitiesResult = runCommand(
      'bridge capabilities',
      bridgeCli,
      ['capabilities', '--json']
    );
    const bridgeCapabilities = parseJson('bridge capabilities', bridgeCapabilitiesResult.stdout);
    report.commands.push(summarizeCommand(bridgeCapabilitiesResult, bridgeCapabilities));
    ensure(report, 'mn-obsidian-bridge capabilities ok', bridgeCapabilities.ok === true, { kind: bridgeCapabilities.kind });
    ensure(
      report,
      'mn-obsidian-bridge capabilities registry exposed',
      Array.isArray(bridgeCapabilities.registry) && bridgeCapabilities.registry.length > 0,
      { commandCount: bridgeCapabilities.commandCount || 0 }
    );
    ensure(
      report,
      'mn-obsidian-bridge capabilities groups exposed',
      Array.isArray(bridgeCapabilities.groups) && bridgeCapabilities.groups.length > 0,
      { groupCount: bridgeCapabilities.groupCount || 0 }
    );
    ensure(report, 'mn-obsidian-bridge capabilities command count', bridgeCapabilities.commandCount === 18, {
      commandCount: bridgeCapabilities.commandCount || 0,
    });
    ensure(
      report,
      'mn-obsidian-bridge capabilities surface docs exposed',
      bridgeCapabilities.surfaceDocs &&
        Array.isArray(bridgeCapabilities.surfaceDocs.sections) &&
        bridgeCapabilities.surfaceDocs.sections.length >= 4 &&
        bridgeCapabilities.surfaceDocs.discovery &&
        typeof bridgeCapabilities.surfaceDocs.discovery.command === 'string' &&
        Array.isArray(bridgeCapabilities.surfaceDocs.commonFlows) &&
        bridgeCapabilities.surfaceDocs.commonFlows.length >= 4,
      { surfaceDocs: bridgeCapabilities.surfaceDocs || null }
    );

    const obSettingsResult = runCommand(
      'mn-obsidian-bridge ob settings',
      bridgeCli,
      [
        '--vault-path',
        report.roots.vaultPath,
        '--export-root',
        report.roots.exportRoot,
        'ob',
        'settings',
        '--json',
      ]
    );
    const obSettings = parseJson('mn-obsidian-bridge ob settings', obSettingsResult.stdout);
    report.commands.push(summarizeCommand(obSettingsResult, obSettings));
    ensure(report, 'mn-obsidian-bridge ob settings ok', obSettings.ok === true, { kind: obSettings.kind });
    ensure(
      report,
      'mn-obsidian-bridge ob settings schema version exposed',
      obSettings.schemaVersion === 1,
      { schemaVersion: obSettings.schemaVersion }
    );
    ensure(
      report,
      'mn-obsidian-bridge ob settings summary exposed',
      obSettings.settingsSummary && typeof obSettings.settingsSummary.summary === 'string',
      { settingsSummary: obSettings.settingsSummary || null }
    );
    ensure(
      report,
      'mn-obsidian-bridge ob settings resolved export root recorded',
      Object.prototype.hasOwnProperty.call(obSettings, 'resolvedExportRoot'),
      { resolvedExportRoot: obSettings.resolvedExportRoot || null }
    );
    ensure(
      report,
      'mn-obsidian-bridge ob settings export scan exposed',
      Object.prototype.hasOwnProperty.call(obSettings, 'exportScan'),
      { exportScan: obSettings.exportScan || null }
    );
    ensure(
      report,
      'mn-obsidian-bridge ob settings export resolution exposed',
      obSettings.exportResolution && typeof obSettings.exportResolution.status === 'string',
      { exportResolution: obSettings.exportResolution || null }
    );
    ensure(
      report,
      'mn-obsidian-bridge ob settings resolution reason readable',
      obSettings.exportResolution && typeof obSettings.exportResolution.reason === 'string' && obSettings.exportResolution.reason.length > 0,
      { exportResolution: obSettings.exportResolution || null }
    );
    ensure(
      report,
      'mn-obsidian-bridge ob settings diagnostic tree exposed',
      obSettings.diagnosticTree && typeof obSettings.diagnosticTree.nextCheckPath === 'string',
      { diagnosticTree: obSettings.diagnosticTree || null }
    );
    ensure(
      report,
      'mn-obsidian-bridge ob settings stable envelope exposed',
      obSettings.stable && obSettings.stable.version === 1 && obSettings.stable.paths && obSettings.stable.diagnosticTree,
      { stable: obSettings.stable || null }
    );
    ensure(
      report,
      'mn-obsidian-bridge ob settings stable settings path recorded',
      obSettings.stable && obSettings.stable.paths && obSettings.stable.paths.settings && typeof obSettings.stable.paths.settings.path === 'string',
      { stablePaths: obSettings.stable ? obSettings.stable.paths : null }
    );
    ensure(
      report,
      'mn-obsidian-bridge ob settings next action readable',
      obSettings.diagnosticTree && typeof obSettings.diagnosticTree.nextAction === 'string' && obSettings.diagnosticTree.nextAction.length > 0,
      { diagnosticTree: obSettings.diagnosticTree || null }
    );

    ensure(
      report,
      'mn-obsidian-bridge ob settings write surface exposed',
      obSettings.writeSurface && obSettings.writeSurface.available === true,
      { writeSurface: obSettings.writeSurface || null }
    );
    ensure(
      report,
      'mn-obsidian-bridge ob settings writable rows exposed',
      Array.isArray(obSettings.writableRows) && obSettings.writableRows.length > 0,
      { writableRows: obSettings.writableRows || null }
    );

    const obSettingsExportPath = path.join(temporaryWorkspace, 'obsidian-settings-export.snapshot.json');
    const obSettingsExportResult = runCommand(
      'mn-obsidian-bridge ob settings export',
      bridgeCli,
      [
        '--vault-path',
        report.roots.vaultPath,
        '--export-root',
        report.roots.exportRoot,
        'ob',
        'settings',
        'export',
        obSettingsExportPath,
        '--snapshot',
        '--json',
      ]
    );
    const obSettingsExport = parseJson('mn-obsidian-bridge ob settings export', obSettingsExportResult.stdout);
    report.commands.push(summarizeCommand(obSettingsExportResult, obSettingsExport));
    ensure(report, 'mn-obsidian-bridge ob settings export ok', obSettingsExport.ok === true, { kind: obSettingsExport.kind });
    ensure(report, 'mn-obsidian-bridge ob settings export wrote file', obSettingsExport.wroteFile === true, {
      wroteFile: obSettingsExport.wroteFile,
    });
    ensure(
      report,
      'mn-obsidian-bridge ob settings export supported key count exposed',
      obSettingsExport.totalSupportedKeys === 5,
      { totalSupportedKeys: obSettingsExport.totalSupportedKeys || 0 }
    );
    ensure(
      report,
      'mn-obsidian-bridge ob settings export file exists',
      fs.existsSync(obSettingsExportPath),
      { outputPath: obSettingsExportPath }
    );
    const obSettingsExportFile = parseJson(
      'mn-obsidian-bridge ob settings export file',
      fs.readFileSync(obSettingsExportPath, 'utf8')
    );
    ensure(
      report,
      'mn-obsidian-bridge ob settings export snapshot shape',
      obSettingsExportFile && obSettingsExportFile.kind === 'ob_settings_snapshot' && obSettingsExportFile.patch && typeof obSettingsExportFile.patch === 'object',
      { snapshotKind: obSettingsExportFile ? obSettingsExportFile.kind : null }
    );
    ensure(
      report,
      'mn-obsidian-bridge ob settings export snapshot keys align',
      obSettingsExportFile && Object.keys(obSettingsExportFile.patch || {}).length === (obSettingsExport.fieldCount || 0),
      { fileKeys: obSettingsExportFile ? Object.keys(obSettingsExportFile.patch || {}).length : null, fieldCount: obSettingsExport.fieldCount || 0 }
    );

    const obSettingsRestorePath = writeTempJsonFile(temporaryWorkspace, 'ob-settings-restore.json', {
      version: 1,
      kind: 'ob_settings_snapshot',
      patch: {
        autoLinkPdfsOnScan: false,
        canvasFolderName: 'MarginNote Canvases restored',
      },
      missingKeys: ['pdfVaultFolder'],
    });
    const obSettingsRestoreResult = runCommand(
      'mn-obsidian-bridge ob settings restore',
      bridgeCli,
      [
        '--vault-path',
        report.roots.vaultPath,
        '--export-root',
        report.roots.exportRoot,
        'ob',
        'settings',
        'restore',
        obSettingsRestorePath,
        '--dry-run',
        '--json',
      ]
    );
    const obSettingsRestore = parseJson('mn-obsidian-bridge ob settings restore', obSettingsRestoreResult.stdout);
    report.commands.push(summarizeCommand(obSettingsRestoreResult, obSettingsRestore));
    ensure(report, 'mn-obsidian-bridge ob settings restore ok', obSettingsRestore.ok === true, { kind: obSettingsRestore.kind });
    ensure(report, 'mn-obsidian-bridge ob settings restore dry-run', obSettingsRestore.dryRun === true, {
      dryRun: obSettingsRestore.dryRun,
    });
    ensure(report, 'mn-obsidian-bridge ob settings restore mode', obSettingsRestore.mode === 'dry_run', {
      mode: obSettingsRestore.mode,
    });
    ensure(report, 'mn-obsidian-bridge ob settings restore operation', obSettingsRestore.operation === 'restore', {
      operation: obSettingsRestore.operation,
    });
    ensure(report, 'mn-obsidian-bridge ob settings restore format', obSettingsRestore.restoreFormat === 'snapshot', {
      restoreFormat: obSettingsRestore.restoreFormat || null,
    });
    ensure(report, 'mn-obsidian-bridge ob settings restore change count', obSettingsRestore.changeCount === 3, {
      changeCount: obSettingsRestore.changeCount || 0,
    });

    const obSettingsSetResult = runCommand(
      'mn-obsidian-bridge ob settings set',
      bridgeCli,
      [
        '--vault-path',
        report.roots.vaultPath,
        '--export-root',
        report.roots.exportRoot,
        'ob',
        'settings',
        'set',
        'autoLinkPdfsOnScan',
        'false',
        '--dry-run',
        '--json',
      ]
    );
    const obSettingsSet = parseJson('mn-obsidian-bridge ob settings set', obSettingsSetResult.stdout);
    report.commands.push(summarizeCommand(obSettingsSetResult, obSettingsSet));
    ensure(report, 'mn-obsidian-bridge ob settings set ok', obSettingsSet.ok === true, { kind: obSettingsSet.kind });
    ensure(report, 'mn-obsidian-bridge ob settings set dry-run', obSettingsSet.dryRun === true, {
      dryRun: obSettingsSet.dryRun,
    });
    ensure(report, 'mn-obsidian-bridge ob settings set mode', obSettingsSet.mode === 'dry_run', {
      mode: obSettingsSet.mode,
    });
    ensure(report, 'mn-obsidian-bridge ob settings set change count', obSettingsSet.changeCount === 1, {
      changeCount: obSettingsSet.changeCount || 0,
    });
    ensure(
      report,
      'mn-obsidian-bridge ob settings set write surface exposed',
      obSettingsSet.writeSurface && obSettingsSet.writeSurface.available === true,
      { writeSurface: obSettingsSet.writeSurface || null }
    );

    const obSettingsPatchPath = writeTempJsonFile(temporaryWorkspace, 'ob-settings.json', {
      autoLinkPdfsOnScan: false,
      canvasFolderName: 'MarginNote Canvases v2',
    });
    const obSettingsPatchResult = runCommand(
      'mn-obsidian-bridge ob settings patch',
      bridgeCli,
      [
        '--vault-path',
        report.roots.vaultPath,
        '--export-root',
        report.roots.exportRoot,
        'ob',
        'settings',
        'patch',
        obSettingsPatchPath,
        '--dry-run',
        '--json',
      ]
    );
    const obSettingsPatch = parseJson('mn-obsidian-bridge ob settings patch', obSettingsPatchResult.stdout);
    report.commands.push(summarizeCommand(obSettingsPatchResult, obSettingsPatch));
    ensure(report, 'mn-obsidian-bridge ob settings patch ok', obSettingsPatch.ok === true, { kind: obSettingsPatch.kind });
    ensure(report, 'mn-obsidian-bridge ob settings patch dry-run', obSettingsPatch.dryRun === true, {
      dryRun: obSettingsPatch.dryRun,
    });
    ensure(report, 'mn-obsidian-bridge ob settings patch mode', obSettingsPatch.mode === 'dry_run', {
      mode: obSettingsPatch.mode,
    });
    ensure(report, 'mn-obsidian-bridge ob settings patch change count', obSettingsPatch.changeCount === 2, {
      changeCount: obSettingsPatch.changeCount || 0,
    });
    ensure(
      report,
      'mn-obsidian-bridge ob settings patch changes exposed',
      Array.isArray(obSettingsPatch.changes) && obSettingsPatch.changes.length === 2,
      { changes: obSettingsPatch.changes || null }
    );

    const obSettingsResetResult = runCommand(
      'mn-obsidian-bridge ob settings reset',
      bridgeCli,
      [
        '--vault-path',
        report.roots.vaultPath,
        '--export-root',
        report.roots.exportRoot,
        'ob',
        'settings',
        'reset',
        '--all',
        '--dry-run',
        '--json',
      ]
    );
    const obSettingsReset = parseJson('mn-obsidian-bridge ob settings reset', obSettingsResetResult.stdout);
    report.commands.push(summarizeCommand(obSettingsResetResult, obSettingsReset));
    ensure(report, 'mn-obsidian-bridge ob settings reset ok', obSettingsReset.ok === true, { kind: obSettingsReset.kind });
    ensure(report, 'mn-obsidian-bridge ob settings reset dry-run', obSettingsReset.dryRun === true, {
      dryRun: obSettingsReset.dryRun,
    });
    ensure(report, 'mn-obsidian-bridge ob settings reset mode', obSettingsReset.mode === 'dry_run', {
      mode: obSettingsReset.mode,
    });
    ensure(report, 'mn-obsidian-bridge ob settings reset operation', obSettingsReset.operation === 'reset', {
      operation: obSettingsReset.operation,
    });
    ensure(report, 'mn-obsidian-bridge ob settings reset change count', obSettingsReset.changeCount === 5, {
      changeCount: obSettingsReset.changeCount || 0,
    });
    ensure(
      report,
      'mn-obsidian-bridge ob settings reset write surface exposed',
      obSettingsReset.writeSurface && obSettingsReset.writeSurface.available === true,
      { writeSurface: obSettingsReset.writeSurface || null }
    );

    const obSettingsApplyResult = runCommand(
      'mn-obsidian-bridge ob settings set apply',
      bridgeCli,
      [
        '--vault-path',
        temporaryBridgeVaults.set.vaultPath,
        '--export-root',
        report.roots.exportRoot,
        'ob',
        'settings',
        'set',
        'autoLinkPdfsOnScan',
        'false',
        '--json',
      ]
    );
    const obSettingsApply = parseJson('mn-obsidian-bridge ob settings set apply', obSettingsApplyResult.stdout);
    report.commands.push(summarizeCommand(obSettingsApplyResult, obSettingsApply));
    ensure(report, 'mn-obsidian-bridge ob settings set apply ok', obSettingsApply.ok === true, {
      kind: obSettingsApply.kind,
    });
    ensure(report, 'mn-obsidian-bridge ob settings set apply mode', obSettingsApply.mode === 'apply', {
      mode: obSettingsApply.mode,
    });
    ensure(report, 'mn-obsidian-bridge ob settings set apply changed count', obSettingsApply.changedCount === 1, {
      changedCount: obSettingsApply.changedCount || 0,
    });
    ensure(
      report,
      'mn-obsidian-bridge ob settings set apply after value persisted',
      obSettingsApply.after &&
        obSettingsApply.after.settingsSummary &&
        obSettingsApply.after.settingsSummary.values &&
        obSettingsApply.after.settingsSummary.values.autoLinkPdfsOnScan === false,
      { after: obSettingsApply.after || null }
    );

    const obSettingsReadbackResult = runCommand(
      'mn-obsidian-bridge ob settings readback',
      bridgeCli,
      [
        '--vault-path',
        temporaryBridgeVaults.set.vaultPath,
        '--export-root',
        report.roots.exportRoot,
        'ob',
        'settings',
        '--json',
      ]
    );
    const obSettingsReadback = parseJson('mn-obsidian-bridge ob settings readback', obSettingsReadbackResult.stdout);
    report.commands.push(summarizeCommand(obSettingsReadbackResult, obSettingsReadback));
    ensure(report, 'mn-obsidian-bridge ob settings readback ok', obSettingsReadback.ok === true, {
      kind: obSettingsReadback.kind,
    });
    ensure(
      report,
      'mn-obsidian-bridge ob settings readback sees applied value',
      obSettingsReadback.settingsSummary &&
        obSettingsReadback.settingsSummary.values &&
        obSettingsReadback.settingsSummary.values.autoLinkPdfsOnScan === false,
      { settingsSummary: obSettingsReadback.settingsSummary || null }
    );

    const obSettingsPatchApplyResult = runCommand(
      'mn-obsidian-bridge ob settings patch apply',
      bridgeCli,
      [
        '--vault-path',
        temporaryBridgeVaults.patch.vaultPath,
        '--export-root',
        report.roots.exportRoot,
        'ob',
        'settings',
        'patch',
        obSettingsPatchPath,
        '--json',
      ]
    );
    const obSettingsPatchApply = parseJson('mn-obsidian-bridge ob settings patch apply', obSettingsPatchApplyResult.stdout);
    report.commands.push(summarizeCommand(obSettingsPatchApplyResult, obSettingsPatchApply));
    ensure(report, 'mn-obsidian-bridge ob settings patch apply ok', obSettingsPatchApply.ok === true, {
      kind: obSettingsPatchApply.kind,
    });
    ensure(report, 'mn-obsidian-bridge ob settings patch apply mode', obSettingsPatchApply.mode === 'apply', {
      mode: obSettingsPatchApply.mode,
    });
    ensure(report, 'mn-obsidian-bridge ob settings patch apply changed count', obSettingsPatchApply.changedCount === 2, {
      changedCount: obSettingsPatchApply.changedCount || 0,
    });
    ensure(
      report,
      'mn-obsidian-bridge ob settings patch apply values persisted',
      obSettingsPatchApply.after &&
        obSettingsPatchApply.after.settingsSummary &&
        obSettingsPatchApply.after.settingsSummary.values &&
        obSettingsPatchApply.after.settingsSummary.values.autoLinkPdfsOnScan === false &&
        obSettingsPatchApply.after.settingsSummary.values.canvasFolderName === 'MarginNote Canvases v2',
      { after: obSettingsPatchApply.after || null }
    );

    const obSettingsPatchReadbackResult = runCommand(
      'mn-obsidian-bridge ob settings patch readback',
      bridgeCli,
      [
        '--vault-path',
        temporaryBridgeVaults.patch.vaultPath,
        '--export-root',
        report.roots.exportRoot,
        'ob',
        'settings',
        '--json',
      ]
    );
    const obSettingsPatchReadback = parseJson('mn-obsidian-bridge ob settings patch readback', obSettingsPatchReadbackResult.stdout);
    report.commands.push(summarizeCommand(obSettingsPatchReadbackResult, obSettingsPatchReadback));
    ensure(report, 'mn-obsidian-bridge ob settings patch readback ok', obSettingsPatchReadback.ok === true, {
      kind: obSettingsPatchReadback.kind,
    });
    ensure(
      report,
      'mn-obsidian-bridge ob settings patch readback sees applied values',
      obSettingsPatchReadback.settingsSummary &&
        obSettingsPatchReadback.settingsSummary.values &&
        obSettingsPatchReadback.settingsSummary.values.autoLinkPdfsOnScan === false &&
        obSettingsPatchReadback.settingsSummary.values.canvasFolderName === 'MarginNote Canvases v2',
      { settingsSummary: obSettingsPatchReadback.settingsSummary || null }
    );

    const obSettingsResetApplyResult = runCommand(
      'mn-obsidian-bridge ob settings reset apply',
      bridgeCli,
      [
        '--vault-path',
        temporaryBridgeVaults.reset.vaultPath,
        '--export-root',
        report.roots.exportRoot,
        'ob',
        'settings',
        'reset',
        'autoLinkPdfsOnScan',
        'canvasFolderName',
        '--json',
      ]
    );
    const obSettingsResetApply = parseJson('mn-obsidian-bridge ob settings reset apply', obSettingsResetApplyResult.stdout);
    report.commands.push(summarizeCommand(obSettingsResetApplyResult, obSettingsResetApply));
    ensure(report, 'mn-obsidian-bridge ob settings reset apply ok', obSettingsResetApply.ok === true, {
      kind: obSettingsResetApply.kind,
    });
    ensure(report, 'mn-obsidian-bridge ob settings reset apply mode', obSettingsResetApply.mode === 'apply', {
      mode: obSettingsResetApply.mode,
    });
    ensure(report, 'mn-obsidian-bridge ob settings reset apply change count', obSettingsResetApply.changeCount === 2, {
      changeCount: obSettingsResetApply.changeCount || 0,
    });
    ensure(
      report,
      'mn-obsidian-bridge ob settings reset apply cleared seeded values',
      obSettingsResetApply.after &&
        obSettingsResetApply.after.settingsSummary &&
        obSettingsResetApply.after.settingsSummary.values &&
        obSettingsResetApply.after.settingsSummary.values.autoLinkPdfsOnScan === null &&
        obSettingsResetApply.after.settingsSummary.values.canvasFolderName === null,
      { after: obSettingsResetApply.after || null }
    );

    const obSettingsResetReadbackResult = runCommand(
      'mn-obsidian-bridge ob settings reset readback',
      bridgeCli,
      [
        '--vault-path',
        temporaryBridgeVaults.reset.vaultPath,
        '--export-root',
        report.roots.exportRoot,
        'ob',
        'settings',
        '--json',
      ]
    );
    const obSettingsResetReadback = parseJson('mn-obsidian-bridge ob settings reset readback', obSettingsResetReadbackResult.stdout);
    report.commands.push(summarizeCommand(obSettingsResetReadbackResult, obSettingsResetReadback));
    ensure(report, 'mn-obsidian-bridge ob settings reset readback ok', obSettingsResetReadback.ok === true, {
      kind: obSettingsResetReadback.kind,
    });
    ensure(
      report,
      'mn-obsidian-bridge ob settings reset readback sees cleared values',
      obSettingsResetReadback.settingsSummary &&
        obSettingsResetReadback.settingsSummary.values &&
        obSettingsResetReadback.settingsSummary.values.autoLinkPdfsOnScan === null &&
        obSettingsResetReadback.settingsSummary.values.canvasFolderName === null,
      { settingsSummary: obSettingsResetReadback.settingsSummary || null }
    );

    const obSettingsRestoreApplyResult = runCommand(
      'mn-obsidian-bridge ob settings restore apply',
      bridgeCli,
      [
        '--vault-path',
        temporaryBridgeVaults.restore.vaultPath,
        '--export-root',
        report.roots.exportRoot,
        'ob',
        'settings',
        'restore',
        obSettingsRestorePath,
        '--json',
      ]
    );
    const obSettingsRestoreApply = parseJson('mn-obsidian-bridge ob settings restore apply', obSettingsRestoreApplyResult.stdout);
    report.commands.push(summarizeCommand(obSettingsRestoreApplyResult, obSettingsRestoreApply));
    ensure(report, 'mn-obsidian-bridge ob settings restore apply ok', obSettingsRestoreApply.ok === true, {
      kind: obSettingsRestoreApply.kind,
    });
    ensure(report, 'mn-obsidian-bridge ob settings restore apply mode', obSettingsRestoreApply.mode === 'apply', {
      mode: obSettingsRestoreApply.mode,
    });
    ensure(report, 'mn-obsidian-bridge ob settings restore apply change count', obSettingsRestoreApply.changeCount === 3, {
      changeCount: obSettingsRestoreApply.changeCount || 0,
    });
    ensure(
      report,
      'mn-obsidian-bridge ob settings restore apply values persisted',
      obSettingsRestoreApply.after &&
        obSettingsRestoreApply.after.settingsSummary &&
        obSettingsRestoreApply.after.settingsSummary.values &&
        obSettingsRestoreApply.after.settingsSummary.values.autoLinkPdfsOnScan === false &&
        obSettingsRestoreApply.after.settingsSummary.values.canvasFolderName === 'MarginNote Canvases restored' &&
        obSettingsRestoreApply.after.settingsSummary.values.pdfVaultFolder === null,
      { after: obSettingsRestoreApply.after || null }
    );

    const obSettingsRestoreReadbackResult = runCommand(
      'mn-obsidian-bridge ob settings restore readback',
      bridgeCli,
      [
        '--vault-path',
        temporaryBridgeVaults.restore.vaultPath,
        '--export-root',
        report.roots.exportRoot,
        'ob',
        'settings',
        '--json',
      ]
    );
    const obSettingsRestoreReadback = parseJson('mn-obsidian-bridge ob settings restore readback', obSettingsRestoreReadbackResult.stdout);
    report.commands.push(summarizeCommand(obSettingsRestoreReadbackResult, obSettingsRestoreReadback));
    ensure(report, 'mn-obsidian-bridge ob settings restore readback ok', obSettingsRestoreReadback.ok === true, {
      kind: obSettingsRestoreReadback.kind,
    });
    ensure(
      report,
      'mn-obsidian-bridge ob settings restore readback sees restored values',
      obSettingsRestoreReadback.settingsSummary &&
        obSettingsRestoreReadback.settingsSummary.values &&
        obSettingsRestoreReadback.settingsSummary.values.autoLinkPdfsOnScan === false &&
        obSettingsRestoreReadback.settingsSummary.values.canvasFolderName === 'MarginNote Canvases restored' &&
        obSettingsRestoreReadback.settingsSummary.values.pdfVaultFolder === null,
      { settingsSummary: obSettingsRestoreReadback.settingsSummary || null }
    );

    const readResult = runCommand(
      'mn-obsidian-bridge read .obsidian',
      bridgeCli,
      [
        '--vault-path',
        report.roots.vaultPath,
        '--export-root',
        report.roots.exportRoot,
        'read',
        path.join(report.roots.vaultPath, '.obsidian'),
        '--json',
      ]
    );
    const readReport = parseJson('mn-obsidian-bridge read', readResult.stdout);
    report.commands.push(summarizeCommand(readResult, readReport));
    ensure(report, 'mn-obsidian-bridge read ok', readReport.ok === true, { kind: readReport.kind });
    ensure(report, 'mn-obsidian-bridge read directory', readReport.type === 'directory', { type: readReport.type });

    report.ok = true;
    if (options.output === 'json') {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      return;
    }
    if (options.output === 'compact') {
      process.stdout.write(`${renderCompact(report)}\n`);
      return;
    }
    process.stdout.write(`${renderText(report)}\n`);
  } catch (error) {
    report.error = error && error.message ? error.message : String(error);
    if (options.output === 'json') {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    } else if (options.output === 'compact') {
      process.stdout.write(`${renderCompact(report)}\n`);
    } else {
      process.stdout.write(`${renderText(report)}\n`);
    }
    process.exitCode = 1;
  } finally {
    await stopBridgeServer(temporaryBridge);
    for (const domain of Object.values(temporaryPreferenceDomains)) {
      deleteDefaultsDomain(domain);
    }
    try {
      fs.rmSync(temporaryWorkspace, { recursive: true, force: true });
    } catch {
      // Ignore cleanup failures for temp smoke files.
    }
  }
}

main().catch((error) => {
  process.stderr.write(`${error && error.message ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
