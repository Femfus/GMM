const statusBadge = document.getElementById('statusBadge');
const gamePathEl = document.getElementById('gamePath');
const filePathStatusEl = document.getElementById('filePathStatus');
const modsStatusEl = document.getElementById('modsStatus');
const scriptHookStatusEl = document.getElementById('scriptHookStatus');
const asiStatusEl = document.getElementById('asiStatus');
const refreshBtn = document.getElementById('refreshBtn');
const installRequirementsBtn = document.getElementById('installRequirementsBtn');
const browseModsBtn = document.getElementById('browseModsBtn');
const discordBtn = document.getElementById('discordBtn');
const copyDiscordBtn = document.getElementById('copyDiscordBtn');
const openGithubBtn = document.getElementById('openGithubBtn');
const logEl = document.getElementById('log');

const sidebarItems = document.querySelectorAll('.sidebar-item');
const setupTab = document.getElementById('tab-setup');
const modsTab = document.getElementById('tab-mods');
const aboutTab = document.getElementById('tab-about');

function log(message) {
  const ts = new Date().toLocaleTimeString();
  logEl.textContent += `[${ts}] ${message}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}

function setStatusBadge(text, ok) {
  statusBadge.textContent = text;
  statusBadge.style.color = ok ? '#4ade80' : '#fbbf24';
}

function renderStatus(status) {
  const hasPath = !!status.gamePath;
  gamePathEl.textContent = hasPath ? status.gamePath : 'Not set';
  if (filePathStatusEl) {
    filePathStatusEl.innerHTML = hasPath
      ? '<img src="../assets/checkmark.svg" alt="OK" />'
      : '<img src="../assets/error.svg" alt="Missing" />';
  }

  if (modsStatusEl) {
    modsStatusEl.innerHTML = status.modsFolderExists
      ? '<img src="../assets/checkmark.svg" alt="OK" />'
      : '<img src="../assets/error.svg" alt="Missing" />';
  }
  if (scriptHookStatusEl) {
    scriptHookStatusEl.innerHTML = status.scriptHookInstalled
      ? '<img src="../assets/checkmark.svg" alt="OK" />'
      : '<img src="../assets/error.svg" alt="Missing" />';
  }
  if (asiStatusEl) {
    asiStatusEl.innerHTML = status.asiLoaderInstalled
      ? '<img src="../assets/checkmark.svg" alt="OK" />'
      : '<img src="../assets/error.svg" alt="Missing" />';
  }

  if (hasPath) {
    if (status.firstTimeSetupComplete) {
      setStatusBadge('Ready for modding', true);
    } else {
      setStatusBadge('GTA V folder found, setup not finished', false);
    }
  } else {
    setStatusBadge('GTA V folder not set', false);
  }
}

async function refreshStatus() {
  try {
    setStatusBadge('Checking...', false);
    const status = await window.modManager.getStatus();
    renderStatus(status);
    log('Status refreshed.');
  } catch (err) {
    console.error(err);
    log('Failed to get status: ' + err.message);
    setStatusBadge('Error reading status', false);
  }
}

refreshBtn.addEventListener('click', () => {
  refreshStatus();
});

installRequirementsBtn.addEventListener('click', async () => {
  try {
    installRequirementsBtn.disabled = true;
    log('[+] installation started');
    const result = await window.modManager.installRequirements();
    if (result && Array.isArray(result.steps)) {
      result.steps.forEach((step) => log(step));
    }
    log(result?.message || '[✓] Finished!');
    await refreshStatus();
  } catch (err) {
    console.error(err);
    log('[!] installation error: ' + err.message);
  } finally {
    installRequirementsBtn.disabled = false;
  }
});

function setActiveTab(tabName) {
  sidebarItems.forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
  });
  setupTab.classList.toggle('active', tabName === 'setup');
  modsTab.classList.toggle('active', tabName === 'mods');
  aboutTab.classList.toggle('active', tabName === 'about');

  if (tabName === 'setup') {
    refreshStatus();
  }
}

sidebarItems.forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = btn.getAttribute('data-tab');
    setActiveTab(target);
  });
});

browseModsBtn.addEventListener('click', () => {
  const modSiteUrl = 'https://www.gta5-mods.com/';
  window.open(modSiteUrl, '_blank');
});

discordBtn.addEventListener('click', () => {
  console.log('Discord button clicked in renderer');
  const discordUrl = 'https://discord.gg/RHmsJMcxhb';
  navigator.clipboard.writeText(discordUrl).then(() => {
    log('[i] Discord invite copied to clipboard.');
  }).catch(err => {
    console.error('Failed to copy Discord invite:', err);
    log('[!] Failed to copy Discord invite.');
  });
});

copyDiscordBtn.addEventListener('click', () => {
  const discordUrl = 'https://discord.gg/RHmsJMcxhb';
  navigator.clipboard.writeText(discordUrl).then(() => {
    log('[i] Discord invite copied to clipboard.');
  }).catch(err => {
    console.error('Failed to copy Discord invite:', err);
    log('[!] Failed to copy Discord invite.');
  });
});

openGithubBtn.addEventListener('click', () => {
  const githubUrl = 'https://github.com/Femfus/GMM';
  window.modManager.openExternal(githubUrl);
});

document.querySelectorAll('.install-mod-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const modName = e.target.closest('.mod-item').querySelector('.mod-name').textContent;
    log(`[i] Install clicked for: ${modName} (not implemented yet)`);
  });
});

window.addEventListener('DOMContentLoaded', async () => {
  setActiveTab('setup');
  await refreshStatus();
});
