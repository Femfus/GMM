const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
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
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'GTA V Mod Manager',
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

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
  // TODO: implement more detailed status (mods folder, scripts)
  if (!cachedGamePath) {
    await autoDetectGamePath();
  }

  return getGameStatus();
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
  if (!cachedGamePath) {
    await autoDetectGamePath();
  }

  if (!cachedGamePath) {
    const chosen = await promptForGamePath();
    if (!chosen) {
      return {
        success: false,
        steps: [],
        message: '[!] GTA V folder not selected. Installation cancelled.',
      };
    }
  }

  const steps = [];
  const status = getGameStatus();

  const modsFolder = path.join(cachedGamePath, 'mods');
  if (!status.modsFolderExists) {
    try {
      fs.mkdirSync(modsFolder, { recursive: true });
      steps.push('[+] Created mods folder.');
    } catch (err) {
      return {
        success: false,
        steps,
        message: `[!] Failed to create mods folder: ${err.message}`,
      };
    }
  } else {
    steps.push('[=] Mods folder already exists.');
  }

  const scriptHookUrl = 'https://ntscorp.ru/dev-c/ScriptHookV_3586.0_889.22.zip';

  steps.push('[+] Downloading ScriptHookV package...');

  try {
    await new Promise((resolve, reject) => {
      https
        .get(scriptHookUrl, (res) => {
          if (res.statusCode !== 200) {
            reject(new Error(`Download failed with status code ${res.statusCode}`));
            return;
          }

          res
            .pipe(unzipper.Parse())
            .on('entry', (entry) => {
              const fileName = entry.path;
              const lower = fileName.toLowerCase();

              const shouldExtract =
                lower.endsWith('scripthookv.dll') ||
                lower.endsWith('dinput8.dll') ||
                lower.endsWith('dsound.dll');

              if (shouldExtract) {
                const destPath = path.join(cachedGamePath, path.basename(fileName));
                steps.push(`[+] Extracting ${path.basename(fileName)}...`);
                entry.pipe(fs.createWriteStream(destPath));
              } else {
                entry.autodrain();
              }
            })
            .on('close', resolve)
            .on('error', reject);
        })
        .on('error', reject);
    });
  } catch (err) {
    return {
      success: false,
      steps,
      message: `[!] Failed to download or extract ScriptHookV: ${err.message}`,
    };
  }

  const finalStatus = getGameStatus();
  if (finalStatus.scriptHookInstalled && finalStatus.asiLoaderInstalled) {
    steps.push('[✓] ScriptHookV and ASI loader files placed in your GTA V folder.');
  } else {
    steps.push('[!] Some required files may still be missing.');
  }

  return {
    success: true,
    steps,
    message: '[✓] Installation finished. Press Refresh to update the status.',
  };
});

ipcMain.handle('modmanager:openExternal', async (event, url) => {
  console.log('openExternal called with url:', url);
  shell.openExternal(url);
});
