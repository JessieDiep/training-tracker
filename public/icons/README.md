# PWA Icons

This folder needs the following PNG files for full PWA support (especially iOS Safari):

| File                    | Size      | Purpose                             |
|-------------------------|-----------|-------------------------------------|
| `icon-192.png`          | 192×192   | Android home screen icon            |
| `icon-512.png`          | 512×512   | Android splash / maskable icon      |
| `apple-touch-icon.png`  | 180×180   | iOS Safari "Add to Home Screen"     |

## Quick generation

If you have Node + Sharp installed:
```bash
npm install -g sharp-cli
sharp -i icon.svg -o icon-192.png resize 192
sharp -i icon.svg -o icon-512.png resize 512
sharp -i icon.svg -o apple-touch-icon.png resize 180
```

Or use any SVG→PNG converter (Inkscape, Figma export, etc.) with the `icon.svg`
file in this folder as the source.

Until real PNGs are added, the app will still work — Safari just won't show a
custom icon on the home screen.
