let statusBadge, headerTitle, headerSubtitle, gamePathEl, filePathStatusEl, modsStatusEl, scriptHookStatusEl, asiStatusEl, refreshBtn, installRequirementsBtn, discordBtn, openGithubBtn, logEl;

const sidebarItems = document.querySelectorAll('.sidebar-item');
const tabs = document.querySelectorAll('.tab');
const setupTab = document.getElementById('tab-setup');
const modsTab = document.getElementById('tab-mods');
const aboutTab = document.getElementById('tab-about');

// Clean, user-friendly log messages
function log(message) {
  const ts = new Date().toLocaleTimeString();
  const cleanMessage = message
    .replace(/\[!\]/g, '⚠️')
    .replace(/\[\+\]/g, '📦')
    .replace(/\[✓\]/g, '✅')
    .replace(/\[\?\]/g, 'ℹ️')
    .replace(/installation started/gi, 'Starting installation')
    .replace(/installation finished/gi, 'Installation complete')
    .replace(/failed to install/gi, 'Could not install')
    .replace(/successfully installed/gi, 'Successfully installed')
    .replace(/scriptHookV/gi, 'ScriptHookV')
    .replace(/gta v/gi, 'GTA V')
    .replace(/mod manager/gi, 'Mod Manager');
  
  logEl.textContent += `[${ts}] ${cleanMessage}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}

// Clear and refresh logs with cleaner format
function refreshLogs() {
  const logs = logEl.textContent;
  logEl.textContent = '';
  
  // Add a header
  logEl.textContent += '=== Activity Log ===\n';
  logEl.textContent += logs;
  
  // Add footer with current status
  const footer = `\n=== Log End ===\nLast updated: ${new Date().toLocaleString()}\n`;
  logEl.textContent += footer;
  logEl.scrollTop = logEl.scrollHeight;
}

function setStatusBadge(text, ok) {
  statusBadge.textContent = text;
  statusBadge.style.color = ok ? '#4ade80' : '#fbbf24';
}

function renderStatus(status) {
  console.log('renderStatus called with:', status);
  console.log('gamePathEl exists:', !!gamePathEl);
  console.log('statusBadge exists:', !!statusBadge);
  
  const hasPath = !!status.gamePath;
  console.log('hasPath:', hasPath, 'gamePath:', status.gamePath);
  
  if (gamePathEl) {
    gamePathEl.textContent = hasPath ? status.gamePath : 'Not set';
    console.log('Set gamePathEl to:', hasPath ? status.gamePath : 'Not set');
  } else {
    console.error('gamePathEl is null!');
  }
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
    console.log('Calling window.modManager.getStatus()...');
    
    if (!window.modManager) {
      console.error('window.modManager is not defined!');
      log('[!] ModManager API not available');
      setStatusBadge('API not available', false);
      return;
    }
    
    const status = await window.modManager.getStatus();
    console.log('Frontend received status:', status);
    
    if (!status) {
      console.error('Status is null or undefined!');
      log('[!] Status response is null');
      setStatusBadge('Invalid status response', false);
      return;
    }
    
    log('Status refreshed.');
    renderStatus(status);
  } catch (err) {
    console.error('Frontend error:', err);
    log('Failed to get status: ' + err.message);
    setStatusBadge('Error reading status', false);
  }
}


// Debug function to help diagnose mod display issues
function debugModDisplay() {
  console.log('=== MOD DISPLAY DEBUG ===');
  console.log('Current mods:', currentMods.length);
  console.log('Is loading:', isLoadingMods);
  console.log('window.modManager exists:', !!window.modManager);
  
  const installerSection = document.getElementById('installerSection');
  const installedModsSection = document.getElementById('installedModsSection');
  const modList = installerSection ? installerSection.querySelector('.mod-list') : null;
  
  console.log('installerSection found:', !!installerSection);
  console.log('installedModsSection found:', !!installedModsSection);
  console.log('modList found:', !!modList);
  console.log('installerSection display:', installerSection ? installerSection.style.display : 'N/A');
  console.log('installedModsSection display:', installedModsSection ? installedModsSection.style.display : 'N/A');
  console.log('modList children:', modList ? modList.children.length : 'N/A');
  console.log('modList innerHTML length:', modList ? modList.innerHTML.length : 'N/A');
  
  // Test API
  if (window.modManager) {
    window.modManager.fetchMods('', '').then(result => {
      console.log('API test result:', result);
    }).catch(err => {
      console.error('API test error:', err);
    });
  }
  console.log('=== END DEBUG ===');
}

function setActiveTab(tabName) {
  // Add snappy transition effect
  const activeTab = document.querySelector('.tab.active');
  if (activeTab) {
    activeTab.style.opacity = '0';
    activeTab.style.transform = 'translateX(-10px)';
  }

  setTimeout(() => {
    // Update sidebar items
    sidebarItems.forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-tab') === tabName);
    });

    // Update tab visibility
    tabs.forEach(tab => {
      tab.classList.toggle('active', tab.id === `tab-${tabName}`);
    });

    // Update header
    switch (tabName) {
      case 'setup':
        headerTitle.textContent = 'Setup';
        headerSubtitle.textContent = 'Configure your GTA V installation';
        refreshStatus();
        break;
      case 'mods':
        headerTitle.textContent = 'Mod Manager';
        headerSubtitle.textContent = 'Browse and install mods for GTA V';
        // Ensure installer section is visible when switching to mods tab
        ensureInstallerVisible();
        // Load mods when switching to Mod Manager tab if not already loaded
        if (currentMods.length === 0 && !isLoadingMods) {
          // Add delayed load to ensure DOM is fully ready
          setTimeout(() => {
            if (window.modManager) {
              loadMods('', '');
            } else {
              console.error('window.modManager not available');
            }
          }, 200);
        }
        break;
      case 'about':
        headerTitle.textContent = 'About';
        headerSubtitle.textContent = 'Information about this project';
        break;
    }

    // Animate new tab
    const newActiveTab = document.querySelector('.tab.active');
    if (newActiveTab) {
      newActiveTab.style.opacity = '1';
      newActiveTab.style.transform = 'translateX(0)';
    }
  }, activeTab ? 100 : 0);
}

// Ensure installer section is visible
function ensureInstallerVisible() {
  const installerSection = document.getElementById('installerSection');
  const installedModsSection = document.getElementById('installedModsSection');
  const showInstallerBtn = document.getElementById('showInstallerBtn');
  const showInstalledBtn = document.getElementById('showInstalledBtn');
  
  if (installerSection) {
    installerSection.style.display = 'block';
  }
  if (installedModsSection) {
    installedModsSection.style.display = 'none';
  }
  if (showInstallerBtn && showInstalledBtn) {
    showInstallerBtn.style.background = '#1e40af';
    showInstallerBtn.style.color = 'white';
    showInstallerBtn.style.borderColor = '#1e40af';
    showInstalledBtn.style.background = 'transparent';
    showInstalledBtn.style.color = '#6b7280';
    showInstalledBtn.style.borderColor = '#1f1f1f';
  }
}

sidebarItems.forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = btn.getAttribute('data-tab');
    setActiveTab(target);
  });
});

if (discordBtn) {
  discordBtn.addEventListener('click', () => {
    console.log('Discord button clicked in renderer');
    const discordUrl = 'https://discord.gg/RHmsJMcxhb';
    window.modManager.openExternal(discordUrl);
  });
}


if (openGithubBtn) {
  openGithubBtn.addEventListener('click', () => {
    const githubUrl = 'https://github.com/Femfus/GMM';
    window.modManager.openExternal(githubUrl);
  });
}


// Mod API functionality
let currentMods = [];
let isLoadingMods = false;

async function loadMods(category = 'All Categories', search = '') {
  if (isLoadingMods) return;
  
  // Safety check: ensure modManager API exists
  if (!window.modManager) {
    console.error('window.modManager not available');
    return;
  }
  
  isLoadingMods = true;
  const installerSection = document.getElementById('installerSection');
  const modList = installerSection ? installerSection.querySelector('.mod-list') : null;
  
  if (!modList) {
    console.error('Could not find installer mod list element');
    isLoadingMods = false;
    return;
  }
  
  const originalContent = modList.innerHTML;
  
  try {
    // Show loading state with spinner
    modList.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #9ca3af;">
        <div style="width: 32px; height: 32px; border: 3px solid #2a2a2a; border-top: 3px solid #3b82f6; border-radius: 50%; margin: 0 auto 16px; animation: spin 1s linear infinite;"></div>
        <div style="font-size: 14px; font-weight: 500;">Loading mods from API...</div>
        <div style="font-size: 12px; margin-top: 4px; color: #71717a;">Fetching available mods...</div>
      </div>
    `;
    
    const result = await window.modManager.fetchMods(category.toLowerCase(), search);
    
    if (result.success) {
      console.log('API result:', result);
      console.log('result.mods type:', typeof result.mods);
      console.log('result.mods:', result.mods);
      
      // Ensure mods is an array
      const modsArray = Array.isArray(result.mods) ? result.mods : [];
      currentMods = modsArray;
      displayMods(modsArray, category);
    } else {
      modList.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #ef4444;">
          <div style="font-size: 24px; margin-bottom: 8px;">⚠️</div>
          <div>Failed to load mods: ${result.message}</div>
          <button onclick="loadMods('', '')" style="margin-top: 16px; padding: 8px 16px; background: #1e40af; color: white; border: none; border-radius: 6px; cursor: pointer;">Retry</button>
          <button onclick="debugModDisplay()" style="margin-top: 8px; padding: 8px 16px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer;">🐛 Debug</button>
        </div>
      `;
    }
  } catch (err) {
    console.error('Error loading mods:', err);
    modList.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #ef4444;">
        <div style="font-size: 24px; margin-bottom: 8px;">⚠️</div>
        <div>Error loading mods: ${err.message}</div>
        <button onclick="loadMods('', '')" style="margin-top: 16px; padding: 8px 16px; background: #1e40af; color: white; border: none; border-radius: 6px; cursor: pointer;">Retry</button>
        <button onclick="debugModDisplay()" style="margin-top: 8px; padding: 8px 16px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer;">🐛 Debug</button>
      </div>
    `;
  } finally {
    isLoadingMods = false;
  }
}

function displayMods(mods, category = 'All Categories') {
  console.log('displayMods called with:', { mods: mods?.length, category, modsData: mods?.[0] });
  console.log('mods type:', typeof mods);
  console.log('mods is array:', Array.isArray(mods));
  
  // Ensure mods is an array
  if (!Array.isArray(mods)) {
    console.error('displayMods called with non-array mods:', mods);
    return;
  }
  
  const installerSection = document.getElementById('installerSection');
  console.log('installerSection found:', !!installerSection);
  console.log('installerSection visible:', installerSection ? installerSection.style.display : 'N/A');
  
  const modList = installerSection ? installerSection.querySelector('.mod-list') : null;
  console.log('modList found:', !!modList);
  
  if (!modList) {
    console.error('installer modList element not found!');
    return;
  }
  
  // Update the header to show mod count
  if (installerSection) {
    const h3 = installerSection.querySelector('h3');
    if (h3) {
      h3.textContent = `Featured mods (${mods.length})`;
      console.log('Header updated to:', h3.textContent);
    }
  }
  
  if (mods.length === 0) {
    modList.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #9ca3af;">
        <div style="font-size: 24px; margin-bottom: 8px;">📦</div>
        <div>No mods found</div>
        <div style="font-size: 12px; margin-top: 4px;">Try adjusting your search</div>
      </div>
    `;
    return;
  }
  
  const modsHTML = `
    <div style="display: flex; flex-direction: column; gap: 8px; padding: 8px;">
      ${mods.map(mod => {
        const isCheat = mod.__isCheat;
        const categoryColor = isCheat ? '#dc2626' : '#1e40af';
        const requiresScriptHook = mod.category === 'Scripts' || mod.category === 'Gameplay';
        
        return `
          <div class="mod-item" style="background: linear-gradient(135deg, #1a1a1a, #0f0f0f); border: 1px solid #2f2f2f; transition: all 0.2s ease; border-radius: 8px; padding: 12px; display: flex; align-items: center; gap: 16px;">
            <!-- Thumbnail -->
            <img src="${mod.image || `https://via.placeholder.com/60x60/${categoryColor.replace('#', '')}/ffffff?text=${isCheat ? '⚠️' : 'MOD'}`}" 
                 alt="Mod thumbnail" 
                 style="width: 60px; height: 60px; border-radius: 8px; object-fit: cover; flex-shrink: 0; background: ${categoryColor}22;"
                 crossorigin="anonymous"
                 onerror="console.log('Image failed to load: ${mod.name} - ${mod.image}'); this.src='https://via.placeholder.com/60x60/${categoryColor.replace('#', '')}/ffffff?text=${isCheat ? '⚠️' : 'MOD'}'; this.onerror=null;" 
                 onload="console.log('✅ Image loaded successfully: ${mod.name} - ${mod.image}')" />
            
            <!-- Main Info -->
            <div style="flex: 1; min-width: 0;">
              <div class="mod-name" style="color: ${categoryColor}; font-size: 16px; font-weight: 600; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${mod.name}
                ${isCheat ? '<span style="color: #dc2626; font-size: 11px; margin-left: 8px; padding: 2px 6px; background: rgba(220, 38, 38, 0.15); border-radius: 4px; font-weight: 500;">[CHEAT]</span>' : ''}
                ${requiresScriptHook && !isCheat ? '<span style="color: #3b82f6; font-size: 11px; margin-left: 8px; padding: 2px 6px; background: rgba(59, 130, 246, 0.15); border-radius: 4px; font-weight: 500;">[REQUIRES SCRIPTHOOKV]</span>' : ''}
              </div>
              
              <div class="mod-desc" style="color: #9ca3af; font-size: 13px; line-height: 1.3; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${mod.description || 'No description available.'}
              </div>
              
              ${isCheat ? '<div style="color: #dc2626; font-size: 11px; margin-bottom: 4px; padding: 3px 8px; background: rgba(220, 38, 38, 0.1); border-radius: 4px; display: inline-block; font-weight: 500;">⚠️ Cheat tool - blocked for safety</div>' : ''}
              ${requiresScriptHook && !isCheat ? '<div style="color: #3b82f6; font-size: 11px; margin-bottom: 4px; padding: 3px 8px; background: rgba(59, 130, 246, 0.1); border-radius: 4px; display: inline-block; font-weight: 500;">📦 ScriptHookV auto-install</div>' : ''}
            </div>
            
            <!-- Meta Info -->
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px; min-width: 120px; flex-shrink: 0;">
              <div class="mod-meta" style="display: flex; gap: 8px; align-items: center; font-size: 11px; color: #6b7280;">
                <span class="mod-version" style="background: #1f1f1f; padding: 2px 6px; border-radius: 3px; font-weight: 500;">${mod.version}</span>
                <span class="mod-category" style="color: ${categoryColor}; font-size: 11px; font-weight: 600; background: ${categoryColor}22; padding: 2px 6px; border-radius: 3px;">
                  ${mod.category}
                </span>
                <span class="mod-downloads" style="display: flex; align-items: center;">
                  ${formatNumber(mod.downloads || 0)}
                </span>
              </div>
              
              <div class="mod-author" style="color: #6b7280; font-size: 11px; opacity: 0.8; text-align: right;">
                by ${mod.author}
              </div>
            </div>
            
            <!-- Install Button -->
            <button class="install-mod-btn" data-mod='${JSON.stringify(mod).replace(/'/g, '&apos;')}' style="background: ${isCheat ? '#374151' : '#1e40af'}; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.2s ease; flex-shrink: 0; min-width: 80px;" ${isCheat ? 'disabled title="Cheat tools are blocked for safety"' : ''}>
              ${isCheat ? '🚫 Blocked' : 'Install'}
            </button>
          </div>
        `;
      }).join('')}
    </div>
  `;
  
  console.log('Setting modList HTML with', mods.length, 'mods');
  console.log('HTML length:', modsHTML.length);
  modList.innerHTML = modsHTML;
  console.log('modList.innerHTML set successfully');
  console.log('modList children count:', modList.children.length);
  
  // Add event listeners to new install buttons and hover effects
  document.querySelectorAll('.install-mod-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const modData = JSON.parse(btn.getAttribute('data-mod').replace(/&apos;/g, "'"));
      
      // Prevent installation of cheat tools
      if (modData.__isCheat) {
        log(`[!] Installation blocked: ${modData.name} is a cheat tool and cannot be installed for safety.`);
        return;
      }
      
      if (btn.getAttribute('data-installed') === 'true') {
        await uninstallMod(modData, btn);
      } else {
        await installMod(modData, btn);
      }
    });
    
    // Add hover effect for install buttons
    btn.addEventListener('mouseenter', () => {
      if (!btn.disabled) {
        btn.style.transform = 'translateY(-1px)';
        btn.style.boxShadow = '0 4px 12px rgba(30, 64, 175, 0.3)';
      }
    });
    
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translateY(0)';
      btn.style.boxShadow = 'none';
    });
  });
  
  // Add hover effects for mod rows
  document.querySelectorAll('.mod-item').forEach(row => {
    row.addEventListener('mouseenter', () => {
      row.style.transform = 'translateX(4px)';
      row.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.4)';
      row.style.borderColor = '#3b82f6';
      row.style.background = 'linear-gradient(135deg, #1f1f1f, #141414)';
    });
    
    row.addEventListener('mouseleave', () => {
      row.style.transform = 'translateX(0)';
      row.style.boxShadow = 'none';
      row.style.borderColor = '#2f2f2f';
      row.style.background = 'linear-gradient(135deg, #1a1a1a, #0f0f0f)';
    });
  });
  
  // Debug image loading
  console.log('=== IMAGE LOADING DEBUG ===');
  mods.forEach(mod => {
    console.log(`Mod: ${mod.name}`);
    console.log(`  Image URL: ${mod.image}`);
    console.log(`  Has image: ${!!mod.image}`);
  });
  console.log('=== END IMAGE DEBUG ===');
}

function getCategoryColor(category) {
  const colors = {
    'Vehicles': '#3b82f6',
    'Visual': '#8b5cf6', 
    'Scripts': '#ef4444',
    'Weapons': '#f59e0b',
    'Mod Menus': '#f59e0b',
    'Gameplay': '#10b981',
    'Other': '#6b7280'
  };
  return colors[category] || '#6b7280';
}

function formatNumber(num) {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
}

async function installMod(mod, button) {
  try {
    button.disabled = true;
    button.textContent = 'Installing...';
    
    // Check if ScriptHookV is needed and not installed
    if (mod.category === 'Scripts' || mod.category === 'Gameplay') {
      const status = await window.modManager.getStatus();
      if (!status.scriptHookInstalled) {
        log(`[!] ScriptHookV is required for ${mod.name}. Installing ScriptHookV first...`);
        
        // Install ScriptHookV from our local database
        const scripthookvMod = {
          name: "ScriptHookV",
          description: "Library that makes it possible to use scripts in GTA V. Essential for most script mods.",
          author: "Alexander Blade",
          category: "Tools",
          version: "v1.0.2635.0",
          downloads: 15420,
          likes: 8920,
          url: "https://www.gta5-mods.com/tools/script-hook-v",
          downloadUrl: "https://github.com/alexblade1/ScriptHookV/releases/latest",
          image: "https://i.imgur.com/8xGQJ2Y.png",
          tags: ["tool", "scripting", "essential"],
          featured: true,
          lastUpdated: "2025-11-25"
        };
        
        const scripthookvResult = await window.modManager.installMod(scripthookvMod);
        if (scripthookvResult.success) {
          log(`[✓] ScriptHookV installed successfully`);
        } else {
          log(`[!] Failed to install ScriptHookV: ${scripthookvResult.message}`);
          button.textContent = 'Failed';
          button.style.background = '#ef4444';
          return;
        }
      }
    }
    
    const result = await window.modManager.installMod(mod);
    
    if (result.success) {
      button.textContent = 'Uninstall';
      button.style.background = '#ef4444';
      button.setAttribute('data-installed', 'true');
      log(`[✓] Installed ${mod.name} to ${result.installPath}`);
      updateInstalledModsList();
    } else {
      button.textContent = 'Failed';
      button.style.background = '#ef4444';
      log(`[!] Failed to install ${mod.name}: ${result.message}`);
    }
  } catch (err) {
    console.error('Install error:', err);
    button.textContent = 'Error';
    button.style.background = '#ef4444';
    log(`[!] Install error for ${mod.name}: ${err.message}`);
  }
}

async function uninstallMod(mod, button) {
  try {
    button.disabled = true;
    button.textContent = 'Uninstalling...';
    
    const result = await window.modManager.uninstallMod(mod.name);
    
    if (result.success) {
      button.textContent = 'Install';
      button.style.background = '#10b981';
      button.removeAttribute('data-installed');
      log(`[✓] Uninstalled ${mod.name}`);
      updateInstalledModsList();
    } else {
      button.textContent = 'Failed';
      button.style.background = '#ef4444';
      log(`[!] Failed to uninstall ${mod.name}: ${result.message}`);
    }
  } catch (err) {
    console.error('Uninstall error:', err);
    button.textContent = 'Error';
    button.style.background = '#ef4444';
    log(`[!] Uninstall error for ${mod.name}: ${err.message}`);
  }
}

async function updateInstalledModsList() {
  try {
    const result = await window.modManager.getInstalledMods();
    if (result.success) {
      displayInstalledMods(result.mods);
    }
  } catch (err) {
    console.error('Failed to update installed mods list:', err);
  }
}

async function displayInstalledMods() {
  const modList = document.querySelector('.mod-list');
  const installerSection = document.getElementById('installerSection');
  if (!installerSection) return;
  
  // Update header
  const h3 = installerSection.querySelector('h3');
  if (h3) {
    h3.textContent = 'Installed mods';
  }
  
  try {
    const result = await window.modManager.getInstalledMods();
    if (result.success) {
      const mods = result.mods;
      
      if (mods.length === 0) {
        modList.innerHTML = `
          <div style="text-align: center; padding: 40px; color: #9ca3af;">
            <div style="font-size: 24px; margin-bottom: 8px;">📦</div>
            <div>No mods installed yet</div>
            <div style="font-size: 12px; margin-top: 4px;">Browse and install mods from the catalog</div>
          </div>
        `;
        return;
      }
      
      modList.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; padding: 8px;">
          ${mods.map(mod => {
            return `
              <div class="mod-item" style="background: linear-gradient(135deg, #1a1a1a, #0f0f0f); border: 1px solid #2f2f2f; transition: all 0.2s ease; border-radius: 8px; padding: 16px; display: flex; flex-direction: column;">
                <div style="display: flex; align-items: center; margin-bottom: 12px;">
                  <img src="https://via.placeholder.com/48x48/1e40af/ffffff?text=${mod.name.substring(0, 2).toUpperCase()}" alt="Mod thumbnail" style="background: #1e40af; width: 48px; height: 48px; border-radius: 6px; object-fit: cover; margin-right: 12px;" />
                  <div style="flex: 1; min-width: 0;">
                    <div class="mod-name" style="color: #1e40af; font-size: 14px; font-weight: 600; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      ${mod.name}
                    </div>
                    <div class="mod-meta" style="display: flex; gap: 8px; align-items: center;">
                      <span class="mod-version" style="color: #6b7280; font-size: 10px; background: #1f1f1f; padding: 2px 4px; border-radius: 3px;">${mod.version}</span>
                      <span style="color: #6b7280; font-size: 10px;">✓ Installed</span>
                    </div>
                  </div>
                </div>
                
                <div class="mod-desc" style="color: #9ca3af; font-size: 12px; line-height: 1.3; margin-bottom: 12px; flex: 1; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                  ${mod.description || 'No description available.'}
                </div>
                
                <div style="color: #6b7280; font-size: 10px; margin-bottom: 8px; padding: 4px 6px; background: rgba(107, 114, 128, 0.1); border-radius: 4px;">
                  Installed: ${new Date(mod.installedAt).toLocaleDateString()}
                </div>
                
                <button class="uninstall-installed-mod-btn" data-mod-name="${mod.name}" style="background: #dc2626; color: white; border: none; padding: 8px 12px; border-radius: 6px; font-weight: 600; font-size: 12px; cursor: pointer; transition: all 0.2s ease; width: 100%;">
                  Uninstall
                </button>
              </div>
            `;
          }).join('')}
        </div>
      `;
      
      // Add event listeners to uninstall buttons
      document.querySelectorAll('.uninstall-installed-mod-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const modName = e.target.getAttribute('data-mod-name');
          const mod = mods.find(m => m.name === modName);
          if (mod) {
            await uninstallMod(mod, e.target);
          }
        });
      });
    }
  } catch (err) {
    console.error('Failed to load installed mods:', err);
    modList.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #ef4444;">
        <div style="font-size: 24px; margin-bottom: 8px;">⚠️</div>
        <div>Failed to load installed mods</div>
      </div>
    `;
  }
}

async function scanGameFolder() {
  try {
    const status = await window.modManager.getStatus();
    if (!status || !status.gamePath) {
      log('[!] Game path not found. Please set up GTA V installation first.');
      return;
    }
    
    log('[*] Scanning game folder for mod files...');
    const result = await window.modManager.scanGameFolder(status.gamePath);
    
    if (result.success && result.files.length > 0) {
      log(`[✓] Found ${result.files.length} mod-related files:`);
      result.files.forEach(file => {
        log(`  - ${file.name} (${file.folder}) - ${file.size} bytes`);
      });
    } else {
      log('[*] No mod files found in game folder');
    }
  } catch (err) {
    log(`[!] Failed to scan game folder: ${err.message}`);
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  // Simple zoom prevention
  const preventZoom = () => {
    document.body.style.zoom = '1';
    document.documentElement.style.zoom = '1';
  };

  // Prevent zoom events
  document.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      preventZoom();
    }
  }, { passive: false });
  
  // Prevent keyboard zoom
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '0')) {
      e.preventDefault();
      preventZoom();
    }
  });

  // Enforce zoom every 500ms (less aggressive)
  setInterval(preventZoom, 500);

  // Hide loading screen after a short delay
  setTimeout(() => {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
      loadingScreen.classList.add('fade-out');
      setTimeout(() => {
        loadingScreen.style.display = 'none';
      }, 500);
    }
  }, 1500);

  // Initialize DOM elements
  statusBadge = document.getElementById('statusBadge');
  headerTitle = document.getElementById('headerTitle');
  headerSubtitle = document.getElementById('headerSubtitle');
  gamePathEl = document.getElementById('gamePath');
  filePathStatusEl = document.getElementById('filePathStatus');
  modsStatusEl = document.getElementById('modsStatus');
  scriptHookStatusEl = document.getElementById('scriptHookStatus');
  asiStatusEl = document.getElementById('asiStatus');
  refreshBtn = document.getElementById('refreshBtn');
  installRequirementsBtn = document.getElementById('installRequirementsBtn');
  discordBtn = document.getElementById('discordBtn');
  openGithubBtn = document.getElementById('openGithubBtn');
  logEl = document.getElementById('log');
  
  console.log('DOM elements initialized:', {
    statusBadge: !!statusBadge,
    gamePathEl: !!gamePathEl,
    logEl: !!logEl
  });

  // Add event listeners after DOM is ready
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      refreshStatus();
    });
  }

  if (installRequirementsBtn) {
    installRequirementsBtn.addEventListener('click', async () => {
      try {
        installRequirementsBtn.disabled = true;
        log('📦 Starting installation...');
        const result = await window.modManager.installRequirements();
        if (result && Array.isArray(result.steps)) {
          result.steps.forEach((step) => log(step));
        }
        log(result?.message || '✅ Installation complete!');
        await refreshStatus();
      } catch (err) {
        console.error(err);
        log('⚠️ Installation error: ' + err.message);
      } finally {
        installRequirementsBtn.disabled = false;
      }
    });
  }

  // Clear log functionality
  const clearLogBtn = document.getElementById('clearLogBtn');
  if (clearLogBtn) {
    clearLogBtn.addEventListener('click', () => {
      logEl.textContent = '';
      log('🧹 Log cleared');
      log('ℹ️ Ready for new activity');
    });
  }
  
  setActiveTab('setup');
  await refreshStatus();
  
    
  // Add event listener for search
  const searchInput = document.querySelector('input[type="text"]');
  
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      if (searchInput.value.trim() === '') {
        // Load full mod list when search is cleared - don't add "all" to query
        loadMods('', '');
      } else {
        // Search only when there's actual text
        loadMods('', searchInput.value);
      }
    });
  }
  
  // Load initial mods when Mod Manager tab is first opened
  // We'll load them when the user switches to the Mod Manager tab
  
  // Add scan button to Setup tab
  const setupCard = document.querySelector('#tab-setup .card');
  if (setupCard) {
    const scanButton = document.createElement('button');
    scanButton.textContent = 'Scan Game Folder';
    scanButton.className = 'secondary';
    scanButton.style.marginTop = '8px';
    scanButton.addEventListener('click', scanGameFolder);
    
    // Insert after the install requirements button
    const installBtn = document.getElementById('installRequirementsBtn');
    if (installBtn && installBtn.parentNode) {
      installBtn.parentNode.insertBefore(scanButton, installBtn.nextSibling);
    }
  }
  
  // Initialize installed mods list
  updateInstalledModsList();

    
  // Add toggle functionality for installer/installed mods
  const showInstallerBtn = document.getElementById('showInstallerBtn');
  const showInstalledBtn = document.getElementById('showInstalledBtn');
  const installerSection = document.getElementById('installerSection');
  const installedModsSection = document.getElementById('installedModsSection');
  
  console.log('Toggle elements found:', {
    showInstallerBtn: !!showInstallerBtn,
    showInstalledBtn: !!showInstalledBtn,
    installerSection: !!installerSection,
    installedModsSection: !!installedModsSection
  });
  
  // Set initial state - show installer section, hide installed mods section
  if (installerSection) {
    installerSection.style.display = 'block';
  }
  if (installedModsSection) {
    installedModsSection.style.display = 'none';
  }
  
  if (showInstallerBtn && showInstalledBtn) {
    console.log('Adding event listeners to toggle buttons');
    
    showInstallerBtn.addEventListener('click', () => {
      console.log('Mod Installer button clicked!');
      showInstallerBtn.style.background = '#1e40af';
      showInstallerBtn.style.color = 'white';
      showInstallerBtn.style.borderColor = '#1e40af';
      showInstalledBtn.style.background = 'transparent';
      showInstalledBtn.style.color = '#6b7280';
      showInstalledBtn.style.borderColor = '#1f1f1f';
      
      // Show available mods section
      if (installerSection) {
        installerSection.style.display = 'block';
        console.log('Showing installer section');
      }
      if (installedModsSection) {
        installedModsSection.style.display = 'none';
        console.log('Hiding installed mods section');
      }
      
      // Load available mods
      console.log('Loading available mods...');
      loadMods('', '');
    });
    
    showInstalledBtn.addEventListener('click', () => {
      console.log('Installed Mods button clicked!');
      showInstalledBtn.style.background = '#1e40af';
      showInstalledBtn.style.color = 'white';
      showInstalledBtn.style.borderColor = '#1e40af';
      showInstallerBtn.style.background = 'transparent';
      showInstallerBtn.style.color = '#6b7280';
      showInstallerBtn.style.borderColor = '#1f1f1f';
      
      // Show installed mods section
      if (installerSection) {
        installerSection.style.display = 'none';
        console.log('Hiding installer section');
      }
      if (installedModsSection) {
        installedModsSection.style.display = 'block';
        console.log('Showing installed mods section');
      }
      
      // Show installed mods
      console.log('Displaying installed mods...');
      displayInstalledMods();
    });
  }
});
