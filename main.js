const { app, BrowserWindow, ipcMain, dialog, shell, clipboard, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const https = require('https');
const http = require('http');
const unzipper = require('unzipper');

let mainWindow;
let cachedGamePath = null;

function gtaExecutableExists(dir) {
  try {
    const exePath = path.join(dir, 'GTA5.exe');
    return fs.existsSync(exePath);
  } catch {
    return false;
  }
}

async function autoDetectGamePath() {
  if (cachedGamePath && gtaExecutableExists(cachedGamePath)) {
    return cachedGamePath;
  }

  const candidates = [
    'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Grand Theft Auto V',
    'D:\\SteamLibrary\\steamapps\\common\\Grand Theft Auto V',
    'C:\\Program Files\\Epic Games\\Grand Theft Auto V',
    'D:\\Epic Games\\Grand Theft Auto V',
    'C:\\Program Files\\Rockstar Games\\Grand Theft Auto V',
    'D:\\Rockstar Games\\Grand Theft Auto V',
  ];

  for (const candidate of candidates) {
    if (gtaExecutableExists(candidate)) {
      cachedGamePath = candidate;
      return cachedGamePath;
    }
  }

  return null;
}

async function promptForGamePath() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select GTA V installation folder',
    properties: ['openDirectory'],
  });

  if (result.canceled || !result.filePaths || !result.filePaths[0]) {
    return null;
  }

  const chosen = result.filePaths[0];
  if (!gtaExecutableExists(chosen)) {
    return null;
  }

  cachedGamePath = chosen;
  return cachedGamePath;
}

function getGameStatus() {
  const gamePath = cachedGamePath;
  if (!gamePath) {
    return {
      gamePath: null,
      modsFolderExists: false,
      scriptHookInstalled: false,
      asiLoaderInstalled: false,
      firstTimeSetupComplete: false,
    };
  }

  const modsFolder = path.join(gamePath, 'mods');
  const modsFolderExists = fs.existsSync(modsFolder);

  const scriptHookInstalled = fs.existsSync(path.join(gamePath, 'ScriptHookV.dll'));
  const asiLoaderInstalled =
    fs.existsSync(path.join(gamePath, 'dinput8.dll')) || fs.existsSync(path.join(gamePath, 'dsound.dll'));

  return {
    gamePath,
    modsFolderExists,
    scriptHookInstalled,
    asiLoaderInstalled,
    firstTimeSetupComplete: modsFolderExists && scriptHookInstalled && asiLoaderInstalled,
  };
}

function createWindow() {
  const iconPath = path.join(__dirname, 'assets', 'GMA.ico');
  console.log('Icon path:', iconPath);
  console.log('Icon exists:', fs.existsSync(iconPath));
  
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    icon: iconPath,
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
    title: 'GTA V Mod Manager',
  });

  // Create menu with zoom controls
  const template = [
    {
      label: 'View',
      submenu: [
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+Plus',
          click: () => {
            mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() + 1);
          }
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() - 1);
          }
        },
                { type: 'separator' },
        {
          label: 'Toggle Fullscreen',
          accelerator: 'F11',
          click: () => {
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About GTA V Mod Manager',
              message: 'GTA V Mod Manager',
              detail: 'A simple and efficient mod management solution for GTA V.\n\nVersion: 1.0.0\n\n⚠️ This project is FREE! If you paid for it, you were SCAMMED!'
            });
          }
        }
      ]
    }
  ];

  // Hide menu bar
  Menu.setApplicationMenu(null);
  
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  loadInstalledModsList(); // Load existing installed mods

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC placeholder handlers for first-time setup
ipcMain.handle('modmanager:getStatus', async () => {
  console.log(`getStatus called. Current cachedGamePath: ${cachedGamePath}`);
  
  // TODO: implement more detailed status (mods folder, scripts)
  if (!cachedGamePath) {
    console.log('No cached game path, attempting auto-detection...');
    await autoDetectGamePath();
    console.log(`After auto-detection, cachedGamePath: ${cachedGamePath}`);
  }

  const status = getGameStatus();
  console.log('Returning status:', status);
  return status;
});

ipcMain.handle('modmanager:runFirstTimeSetup', async () => {
  // TODO: implement real first-time setup logic (mods folder, backups, ScriptHookV, ASI loader)
  if (!cachedGamePath) {
    await autoDetectGamePath();
  }

  if (!cachedGamePath) {
    const chosen = await promptForGamePath();
    if (!chosen) {
      return {
        success: false,
        message: 'GTA V folder not found. Please select a valid GTA V installation folder.',
      };
    }
  }

  return {
    success: true,
    message: `First-time setup placeholder executed. Using GTA V folder: ${cachedGamePath}`,
  };
});

ipcMain.handle('modmanager:installScriptHook', async () => {
  if (!cachedGamePath) {
    await autoDetectGamePath();
  }

  if (!cachedGamePath) {
    const chosen = await promptForGamePath();
    if (!chosen) {
      return {
        success: false,
        message: 'Please select your GTA V folder before installing ScriptHookV.',
      };
    }
  }

  const status = getGameStatus();
  if (status.scriptHookInstalled) {
    return {
      success: true,
      message: 'ScriptHookV already installed.',
    };
  }

  return {
    success: false,
    message:
      'Automatic ScriptHookV install is not implemented yet. Download it from the official site and place the files in your GTA V folder.',
  };
});

ipcMain.handle('modmanager:installAsiLoader', async () => {
  if (!cachedGamePath) {
    await autoDetectGamePath();
  }

  if (!cachedGamePath) {
    const chosen = await promptForGamePath();
    if (!chosen) {
      return {
        success: false,
        message: 'Please select your GTA V folder before installing the ASI loader.',
      };
    }
  }

  const status = getGameStatus();
  if (status.asiLoaderInstalled) {
    return {
      success: true,
      message: 'ASI loader already installed.',
    };
  }

  return {
    success: false,
    message:
      'Automatic ASI loader install is not implemented yet. Install an ASI loader (like dinput8.dll) into your GTA V folder.',
  };
});

ipcMain.handle('modmanager:installRequirements', async () => {
  console.log(`installRequirements called. Current cachedGamePath: ${cachedGamePath}`);
  
  if (!cachedGamePath) {
    console.log('No cached game path, attempting auto-detection...');
    await autoDetectGamePath();
    console.log(`After auto-detection, cachedGamePath: ${cachedGamePath}`);
  }

  if (!cachedGamePath) {
    console.log('Still no game path, prompting user...');
    const chosen = await promptForGamePath();
    if (!chosen) {
      return {
        success: false,
        steps: ['⚠️ GTA V folder not selected. Installation cancelled.'],
        message: '⚠️ Please select your GTA V folder to continue.',
      };
    }
  }
  
  console.log(`Using game path: ${cachedGamePath}`);

  const steps = [];
  const status = getGameStatus();

  // Create mods folder
  const modsFolder = path.join(cachedGamePath, 'mods');
  if (!status.modsFolderExists) {
    try {
      fs.mkdirSync(modsFolder, { recursive: true });
      steps.push('📁 Created mods folder in GTA V directory');
    } catch (err) {
      return {
        success: false,
        steps: ['⚠️ Failed to create mods folder'],
        message: `⚠️ Could not create mods folder: ${err.message}`,
      };
    }
  } else {
    steps.push('📁 Mods folder already exists');
  }

  // Use direct ScriptHookV download link
  const scriptHookUrl = 'https://mirror.alloc8or.re/dev-c.com/ScriptHookV_3586.0_889.22.zip';

  steps.push('📦 Downloading ScriptHookV...');

  try {
    // Download and extract ScriptHookV directly
    await new Promise((resolve, reject) => {
      https.get(scriptHookUrl, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Download failed with status ${res.statusCode}`));
          return;
        }

        res
          .pipe(unzipper.Parse())
          .on('entry', (entry) => {
            const fileName = entry.path;
            const lower = fileName.toLowerCase();

            // Extract essential files
            const shouldExtract =
              lower.endsWith('scripthookv.dll') ||
              lower.endsWith('dinput8.dll') ||
              lower.endsWith('dsound.dll') ||
              lower.endsWith('readme.txt');

            if (shouldExtract) {
              const destPath = path.join(cachedGamePath, path.basename(fileName));
              steps.push(`📄 Extracted ${path.basename(fileName)}`);
              entry.pipe(fs.createWriteStream(destPath));
            } else {
              entry.autodrain();
            }
          })
          .on('close', () => resolve({ success: true }))
          .on('error', reject);
      }).on('error', reject);
    });

  } catch (err) {
    console.error('ScriptHookV installation error:', err);
    return {
      success: false,
      steps: ['⚠️ Failed to download ScriptHookV'],
      message: `⚠️ Could not install ScriptHookV: ${err.message}. Please install it manually from https://www.gta5-mods.com/tools/script-hook-v`,
    };
  }

  // Verify installation
  const finalStatus = getGameStatus();
  if (finalStatus.scriptHookInstalled) {
    steps.push('✅ ScriptHookV installed successfully');
    steps.push('🎮 Ready for modding!');
  } else {
    steps.push('⚠️ ScriptHookV installation may have failed');
  }

  return {
    success: finalStatus.scriptHookInstalled,
    steps,
    message: finalStatus.scriptHookInstalled ? 
      '✅ Requirements installed successfully! Your game is ready for modding.' :
      '⚠️ Installation incomplete. Please check the logs above.',
  };
});

ipcMain.handle('modmanager:openExternal', async (event, url) => {
  console.log('openExternal called with url:', url);
  shell.openExternal(url);
});

ipcMain.handle('modmanager:writeText', async (event, text) => {
  clipboard.writeText(text);
});

// Update checking functionality
const GITHUB_REPO = 'Femfus/GMM';
const CURRENT_VERSION = '0.0.1';

async function getLatestRelease() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_REPO}/releases/latest`,
      headers: {
        'User-Agent': 'GTA-Mod-Manager'
      }
    };

    console.log(`Fetching latest release from ${GITHUB_REPO}...`);

    https.get(options, (res) => {
      console.log(`GitHub API response status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            console.error(`GitHub API returned status ${res.statusCode}: ${data}`);
            reject(new Error(`GitHub API returned status ${res.statusCode}`));
            return;
          }
          
          const release = JSON.parse(data);
          console.log('Successfully parsed GitHub response');
          resolve(release);
        } catch (err) {
          console.error('Failed to parse GitHub response:', err);
          console.error('Raw response data:', data);
          reject(err);
        }
      });
    }).on('error', (err) => {
      console.error('GitHub API request failed:', err);
      reject(err);
    });
  });
}

async function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (res) => {
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', reject);
  });
}

async function performUpdate() {
  try {
    const release = await getLatestRelease();
    
    if (!release || !release.tag_name) {
      return { 
        success: false, 
        message: 'Invalid release data from GitHub. Repository may not exist or be private.' 
      };
    }
    
    const latestVersion = release.tag_name.replace('v', '');
    
    if (latestVersion <= CURRENT_VERSION) {
      return { success: true, message: 'Already up to date', needsUpdate: false };
    }

    // Find the first asset that's a zip file
    const asset = release.assets && release.assets.find(a => a.name.endsWith('.zip'));
    if (!asset) {
      return { success: false, message: 'No update package found' };
    }

    // Download update
    const updatePath = path.join(__dirname, 'update.zip');
    await downloadFile(asset.browser_download_url, updatePath);

    // Extract and replace files (this is a simplified version)
    // In production, you'd want more sophisticated handling
    return { 
      success: true, 
      message: `Update downloaded: v${latestVersion}`,
      needsUpdate: true,
      version: latestVersion
    };
  } catch (err) {
    console.error('Perform update error:', err);
    return { success: false, message: `Update failed: ${err.message}` };
  }
}

ipcMain.handle('modmanager:checkForUpdates', async () => {
  console.log('checkForUpdates handler called');
  try {
    const release = await getLatestRelease();
    console.log('GitHub API response:', release);
    
    if (!release || !release.tag_name) {
      console.error('Invalid release data:', release);
      return { 
        success: false, 
        message: 'Invalid release data from GitHub. Repository may not exist or be private.' 
      };
    }
    
    const latestVersion = release.tag_name.replace('v', '');
    const needsUpdate = latestVersion > CURRENT_VERSION;
    
    console.log(`Update check complete. Current: ${CURRENT_VERSION}, Latest: ${latestVersion}, Needs update: ${needsUpdate}`);
    
    return {
      success: true,
      currentVersion: CURRENT_VERSION,
      latestVersion: latestVersion,
      needsUpdate: needsUpdate,
      releaseNotes: release.body || 'No release notes available.'
    };
  } catch (err) {
    console.error('Update check error:', err);
    if (err.message.includes('404')) {
      return { 
        success: false, 
        message: `Repository '${GITHUB_REPO}' not found or has no releases. Create a GitHub repository and publish a release to enable updates.`,
        isRepoMissing: true
      };
    }
    return { success: false, message: `Failed to check updates: ${err.message}` };
  }
});

// Mod fetching functionality - using local database
async function fetchModsFromAPI(category = 'all', search = '') {
  try {
    console.log(`Fetching mods - Category: ${category}, Search: ${search}`);
    
    // Load mods from local database
    const modsDatabase = require('./mods-database/mods.js');
    let filteredMods = [...modsDatabase];
    
    // Filter by search term
    if (search && search.trim()) {
      const searchTerm = search.toLowerCase();
      filteredMods = filteredMods.filter(mod => 
        mod.name.toLowerCase().includes(searchTerm) ||
        mod.description.toLowerCase().includes(searchTerm) ||
        mod.author.toLowerCase().includes(searchTerm) ||
        mod.tags.some(tag => tag.includes(searchTerm))
      );
    }
    
    // Filter by category
    if (category && category.toLowerCase() !== 'all') {
      filteredMods = filteredMods.filter(mod => 
        mod.category.toLowerCase() === category.toLowerCase()
      );
    }
    
    // Sort by downloads (popularity)
    filteredMods.sort((a, b) => b.downloads - a.downloads);
    
    // Limit to 30 results
    const limitedMods = filteredMods.slice(0, 30);
    
    console.log(`Found ${limitedMods.length} mods from local database`);
    
    const mods = limitedMods.map(mod => ({
      name: mod.name,
      description: mod.description || 'No description available',
      author: mod.author || 'Unknown',
      stars: mod.likes || 0,
      url: mod.url,
      downloadUrl: mod.downloadUrl,
      category: mod.category || 'Other',
      version: mod.version || 'latest',
      downloads: mod.downloads || 0,
      image: mod.image || null
    }));
    
    console.log(`Fetched ${mods.length} legitimate mods`);
    return { success: true, mods };
  } catch (err) {
    console.error('Failed to load local mods database:', err);
    // Fallback to curated mods if database fails
    const fallbackMods = getFallbackMods();
    console.log(`Using fallback mods: ${fallbackMods.length} items`);
    return { success: true, mods: fallbackMods };
  }
}

function isCheat(repo) {
  const name = repo.name.toLowerCase();
  const description = (repo.description || '').toLowerCase();
  const topics = repo.topics.join(' ').toLowerCase();
  
  // List of cheat-related keywords to filter out
  const cheatKeywords = [
    'dma', 'cheat', 'hack', 'trainer', 'mod menu', 'menu', 'injector',
    'esp', 'aimbot', 'wallhack', 'godmode', 'god mode', 'unlimited',
    'money', 'rp', 'level', 'unlock', 'bypass', 'anticheat', 'eac',
    'battleeye', 'rage', 'five', 'redengine', 'external', 'internal',
    // Specific trainer names
    'simple trainer', 'menyoo', 'menyoo pc', 'menyoo 2.0', 'rampage trainer',
    'absolute trainer', 'native trainer', 'enhanced native trainer'
  ];
  
  // Check if any cheat keywords are present
  const hasCheatKeyword = cheatKeywords.some(keyword => 
    name.includes(keyword) || 
    description.includes(keyword) || 
    topics.includes(keyword)
  );
  
  // Also filter out repositories with suspicious patterns
  const suspiciousPatterns = [
    /\bmenu\b/i,
    /\btrainer\b/i,
    /\bcheat\b/i,
    /\bdma\b/i,
    /\bhack\b/i,
    /\bmenyoo\b/i,
    /\bsimple trainer\b/i,
    /\brampage trainer\b/i
  ];
  
  const hasSuspiciousPattern = suspiciousPatterns.some(pattern => 
    pattern.test(name) || pattern.test(description)
  );
  
  // Log what we're filtering for debugging
  if (hasCheatKeyword || hasSuspiciousPattern) {
    console.log(`🚫 Filtering out potential cheat: ${repo.name} - ${repo.description}`);
  }
  
  return hasCheatKeyword || hasSuspiciousPattern;
}

// Mod management functions
const installedMods = new Map(); // Track installed mods

// Get proper installation path based on mod category
function getModInstallPath(mod, gamePath) {
  if (!gamePath) {
    // Fallback to local directory if no game path
    return path.join(__dirname, 'installed_mods');
  }
  
  // Scripts go to scripts folder, everything else goes to mods folder
  if (mod.category === 'Scripts') {
    return path.join(gamePath, 'scripts');
  } else {
    return path.join(gamePath, 'mods');
  }
}


async function installModFromGitHub(mod) {
  try {
    // Get current game path
    const gamePath = cachedGamePath;
    const installPath = getModInstallPath(mod, gamePath);
    
    console.log(`Installing ${mod.name} (${mod.category}) to: ${installPath}`);
    console.log(`Game path: ${gamePath}`);
    
    // Ensure the target directory exists
    await fsPromises.mkdir(installPath, { recursive: true });
    
    // Create a safe folder name for the mod
    const safeModName = mod.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const modFolder = path.join(installPath, safeModName);
    
    // Create mod-specific folder
    await fsPromises.mkdir(modFolder, { recursive: true });
    
    // Download the mod (simplified version)
    const downloadUrl = mod.downloadUrl;
    const zipPath = path.join(modFolder, 'mod.zip');
    
    console.log(`Downloading ${mod.name} to ${zipPath}`);
    await downloadFile(downloadUrl, zipPath);
    
    // Track the installation
    const installInfo = {
      ...mod,
      installedAt: new Date().toISOString(),
      installPath: modFolder,
      files: [] // Will be populated after extraction
    };
    
    installedMods.set(mod.name, installInfo);
    await saveInstalledModsList();
    
    return { 
      success: true, 
      message: `Successfully installed ${mod.name} to ${modFolder}`,
      installPath: modFolder
    };
  } catch (err) {
    console.error('Failed to install mod:', err);
    return { success: false, message: `Failed to install mod: ${err.message}` };
  }
}

async function uninstallMod(modName) {
  try {
    const modInfo = installedMods.get(modName);
    if (!modInfo) {
      return { success: false, message: 'Mod not found in installed list' };
    }
    
    // Remove mod folder
    if (fs.existsSync(modInfo.installPath)) {
      await fsPromises.rm(modInfo.installPath, { recursive: true, force: true });
    }
    
    // Remove from tracking
    installedMods.delete(modName);
    await saveInstalledModsList();
    
    return { 
      success: true, 
      message: `Successfully uninstalled ${modName}` 
    };
  } catch (err) {
    console.error('Failed to uninstall mod:', err);
    return { success: false, message: `Failed to uninstall mod: ${err.message}` };
  }
}

async function saveInstalledModsList() {
  try {
    const modsArray = Array.from(installedMods.values());
    // Save to app directory for tracking, not game folder
    const trackingPath = path.join(__dirname, 'installed_mods');
    await fsPromises.mkdir(trackingPath, { recursive: true });
    await fsPromises.writeFile(
      path.join(trackingPath, 'installed_mods.json'),
      JSON.stringify(modsArray, null, 2)
    );
  } catch (err) {
    console.error('Failed to save installed mods list:', err);
  }
}

async function loadInstalledModsList() {
  try {
    const trackingPath = path.join(__dirname, 'installed_mods');
    const modsFile = path.join(trackingPath, 'installed_mods.json');
    if (fs.existsSync(modsFile)) {
      const data = await fsPromises.readFile(modsFile, 'utf8');
      const modsArray = JSON.parse(data);
      modsArray.forEach(mod => {
        installedMods.set(mod.name, mod);
      });
    }
  } catch (err) {
    console.error('Failed to load installed mods list:', err);
  }
}

async function scanGameFolder(gamePath) {
  if (!gamePath || !fs.existsSync(gamePath)) {
    return { success: false, message: 'Game path not found' };
  }
  
  try {
    const files = [];
    
    // Scan for common mod files
    const modExtensions = ['.asi', '.dll', '.cs', '.lua', '.xml', '.ymt'];
    const foldersToScan = ['', 'scripts', 'plugins', 'lspdfr'];
    
    for (const folder of foldersToScan) {
      const scanPath = path.join(gamePath, folder);
      if (fs.existsSync(scanPath)) {
        const items = await fsPromises.readdir(scanPath, { withFileTypes: true });
        
        for (const item of items) {
          if (item.isFile() && modExtensions.some(ext => item.name.endsWith(ext))) {
            files.push({
              name: item.name,
              path: path.join(scanPath, item.name),
              folder: folder || 'root',
              size: (await fsPromises.stat(path.join(scanPath, item.name))).size,
              modified: (await fsPromises.stat(path.join(scanPath, item.name))).mtime
            });
          }
        }
      }
    }
    
    return { 
      success: true, 
      files: files,
      message: `Found ${files.length} mod-related files in game folder`
    };
  } catch (err) {
    return { success: false, message: `Failed to scan game folder: ${err.message}` };
  }
}

ipcMain.handle('modmanager:fetchMods', async (event, category, search) => {
  try {
    console.log(`Fetching mods - Category: ${category}, Search: ${search}`);
    const result = await fetchModsFromAPI(category, search);
    console.log(`Fetched ${result.mods ? result.mods.length : 0} mods`);
    return result;
  } catch (err) {
    console.error('Failed to fetch mods:', err);
    return { success: false, message: `Failed to fetch mods: ${err.message}` };
  }
});

ipcMain.handle('modmanager:installMod', async (event, mod) => {
  try {
    console.log(`Installing mod: ${mod.name}`);
    const result = await installModFromGitHub(mod);
    return result;
  } catch (err) {
    console.error('Failed to install mod:', err);
    return { success: false, message: `Failed to install mod: ${err.message}` };
  }
});

ipcMain.handle('modmanager:uninstallMod', async (event, modName) => {
  try {
    console.log(`Uninstalling mod: ${modName}`);
    const result = await uninstallMod(modName);
    return result;
  } catch (err) {
    console.error('Failed to uninstall mod:', err);
    return { success: false, message: `Failed to uninstall mod: ${err.message}` };
  }
});

ipcMain.handle('modmanager:getInstalledMods', async () => {
  try {
    const modsArray = Array.from(installedMods.values());
    return { success: true, mods: modsArray };
  } catch (err) {
    console.error('Failed to get installed mods:', err);
    return { success: false, message: `Failed to get installed mods: ${err.message}` };
  }
});

ipcMain.handle('modmanager:scanGameFolder', async (event, gamePath) => {
  try {
    console.log(`Scanning game folder: ${gamePath}`);
    const result = await scanGameFolder(gamePath);
    return result;
  } catch (err) {
    console.error('Failed to scan game folder:', err);
    return { success: false, message: `Failed to scan game folder: ${err.message}` };
  }
});

console.log('Mod fetching IPC handlers registered');

ipcMain.handle('modmanager:performUpdate', async () => {
  console.log('performUpdate handler called');
  return await performUpdate();
});

console.log('Update IPC handlers registered');
