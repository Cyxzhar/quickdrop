import { clipboard, Notification } from 'electron'
import { uploadImage } from './uploader'
// @ts-ignore
import clipboardEx from 'electron-clipboard-extended'

export function setupClipboardWatcher(onSuccess: (link: string) => void): void {
  console.log('Starting clipboard watcher...')

  clipboardEx.on('image-changed', async () => {
    const image = clipboard.readImage()
    if (image.isEmpty()) return

    console.log('New image detected in clipboard.')

    try {
      const buffer = image.toPNG()
      
      // Upload
      const link = await uploadImage(buffer)

      // Replace clipboard content with link
      clipboard.writeText(link)

      // Notify success
      new Notification({ title: 'QuickDrop', body: 'Link copied!' }).show()
      
      // Callback
      onSuccess(link)

      console.log(`Replaced image with link: ${link}`)
    } catch (error) {
      console.error('Upload failed:', error)
      new Notification({ title: 'QuickDrop', body: 'Upload failed' }).show()
    }
  })

  clipboardEx.startWatching()
}

export function stopClipboardWatcher(): void {
  clipboardEx.stopWatching()
}
