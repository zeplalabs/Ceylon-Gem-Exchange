import certImage1 from '../assets/certificates/cert-1.png'
import certImage2 from '../assets/certificates/cert-2.jpg'
import certImage3 from '../assets/certificates/cert-3.webp'
import certReport1 from '../assets/certificates/cert-report-1.pdf'
import certReport2 from '../assets/certificates/cert-report-2.pdf'

export interface CertificateItem {
  kind: 'image' | 'pdf'
  /** Static import of a bundled asset — a Metro asset id (see the
   * `*.jpg`/`*.pdf` ambient declarations in `types/media.d.ts`). Passed
   * straight to `expo-image`'s `source` prop for `kind: 'image'`, or
   * resolved to a real file URI via `expo-asset`'s `Asset.fromModule()`
   * for `kind: 'pdf'` (`react-native-webview` needs an actual URI, not
   * an asset id). */
  source: number
}

// Real bundled demo certificates (not placeholders) — same approach as the
// Gallery Viewer's one demo video: there's no real seller-uploaded
// certificate yet (no upload pipeline), so a fixed, shared demo set
// stands in for every listing's certificate row.
export const CERTIFICATES: CertificateItem[] = [
  { kind: 'image', source: certImage1 },
  { kind: 'image', source: certImage2 },
  { kind: 'image', source: certImage3 },
  { kind: 'pdf', source: certReport1 },
  { kind: 'pdf', source: certReport2 },
]
