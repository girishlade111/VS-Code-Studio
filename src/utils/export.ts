import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export async function exportProject(html: string, css: string, js: string) {
  const zip = new JSZip();
  zip.file('index.html', html);
  zip.file('styles.css', css);
  zip.file('script.js', js);
  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, 'code-studio-project.zip');
  return 'Project exported successfully';
}