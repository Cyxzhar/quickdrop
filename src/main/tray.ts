import { Tray, Menu, app, BrowserWindow } from 'electron'
import trayIcon from '../../resources/tray.png?asset'

let tray: Tray | null = null

export function initTray(getWindow: () => BrowserWindow | null): void {
  if (tray) return // Prevent multiple trays

  tray = new Tray(trayIcon)

  const contextMenu = Menu.buildFromTemplate([
    { label: 'QuickDrop: Ready', enabled: false },
    { type: 'separator' },
    { label: 'Show App', click: () => getWindow()?.show() },
    { label: 'Quit', click: () => app.quit() }
  ])

  tray.setToolTip('QuickDrop')
  tray.setContextMenu(contextMenu)
}
