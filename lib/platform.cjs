/**
 * Platform detection utilities
 */

const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

/**
 * Get OS version string
 */
function getOsVersion() {
  const platform = os.platform();

  try {
    if (platform === 'darwin') {
      // macOS: use sw_vers
      const version = execSync('sw_vers -productVersion', { stdio: 'pipe', encoding: 'utf8' }).trim();
      return version; // e.g., "14.2.1"
    } else if (platform === 'linux') {
      // Linux: try lsb_release first, then /etc/os-release
      try {
        const version = execSync('lsb_release -rs', { stdio: 'pipe', encoding: 'utf8' }).trim();
        return version; // e.g., "22.04"
      } catch {
        // Fallback to /etc/os-release
        if (fs.existsSync('/etc/os-release')) {
          const content = fs.readFileSync('/etc/os-release', 'utf8');
          const match = content.match(/VERSION_ID="?([^"\n]+)"?/);
          if (match) return match[1];
        }
        return 'unknown';
      }
    } else if (platform === 'win32') {
      // Windows: use wmic or ver
      try {
        const version = execSync('wmic os get Version /value', { stdio: 'pipe', encoding: 'utf8' });
        const match = version.match(/Version=(\d+\.\d+)/);
        if (match) return match[1]; // e.g., "10.0"
      } catch {
        // Fallback to os.release()
        return os.release().split('.').slice(0, 2).join('.');
      }
    }
  } catch {
    return 'unknown';
  }

  return 'unknown';
}

/**
 * Get Linux distribution name
 */
function getLinuxDistro() {
  try {
    if (fs.existsSync('/etc/os-release')) {
      const content = fs.readFileSync('/etc/os-release', 'utf8');
      const match = content.match(/^ID=["']?(\w+)["']?/m);
      if (match) return match[1].toLowerCase(); // e.g., "ubuntu", "debian", "alpine"
    }
    // Fallback to lsb_release
    const distro = execSync('lsb_release -is', { stdio: 'pipe', encoding: 'utf8' }).trim();
    return distro.toLowerCase();
  } catch {
    return 'unknown';
  }
}

/**
 * Get system RAM in GB
 */
function getSystemRamGB() {
  const totalBytes = os.totalmem();
  return Math.round(totalBytes / (1024 * 1024 * 1024));
}

/**
 * Check if running in WSL
 */
function isRunningInWSL() {
  if (process.platform !== 'linux') return false;

  try {
    // Check for WSL-specific markers
    if (fs.existsSync('/proc/version')) {
      const version = fs.readFileSync('/proc/version', 'utf8');
      return version.toLowerCase().includes('microsoft') || version.toLowerCase().includes('wsl');
    }
    // Alternative: check for WSL environment variable
    return !!process.env.WSL_DISTRO_NAME;
  } catch {
    return false;
  }
}

/**
 * Get comprehensive platform information
 */
function getPlatformInfo() {
  const platform = os.platform();
  const arch = os.arch();
  const osVersion = getOsVersion();
  const ramGB = getSystemRamGB();

  const info = {
    platform,
    arch,
    osVersion,
    ramGB,
    isWindows: platform === 'win32',
    isMac: platform === 'darwin',
    isLinux: platform === 'linux',
    isWSL: isRunningInWSL(),
    displayName: platform === 'win32' ? 'Windows' : platform === 'darwin' ? 'macOS' : 'Linux',
  };

  // Add Linux distro info
  if (info.isLinux) {
    info.linuxDistro = getLinuxDistro();
    info.isAlpine = info.linuxDistro === 'alpine';
    info.isDebian = ['debian', 'ubuntu', 'linuxmint', 'pop'].includes(info.linuxDistro);
    info.isRHEL = ['rhel', 'centos', 'fedora', 'rocky', 'almalinux'].includes(info.linuxDistro);
  }

  return info;
}

module.exports = {
  getOsVersion,
  getLinuxDistro,
  getSystemRamGB,
  isRunningInWSL,
  getPlatformInfo,
};
