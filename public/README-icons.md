# PWA Icons Setup

To complete the PWA setup, you need to generate PNG icons from the SVG file.

## Option 1: Use the Icon Generator (Recommended)

1. Open `generate-icons.html` in your browser
2. Click "Generate Icons" button
3. Download the generated `icon-192.png` and `icon-512.png` files
4. Place them in the `public` folder

## Option 2: Use Online Tools

1. Use an online SVG to PNG converter (like https://convertio.co/svg-png/)
2. Convert `icon.svg` to PNG format
3. Create two sizes: 192x192 and 512x512 pixels
4. Save as `icon-192.png` and `icon-512.png` in the `public` folder

## Option 3: Use ImageMagick (Command Line)

```bash
# Install ImageMagick first, then:
convert -background none -resize 192x192 icon.svg icon-192.png
convert -background none -resize 512x512 icon.svg icon-512.png
```

## Option 4: Manual Creation

Create PNG images with:
- Size: 192x192 pixels (icon-192.png)
- Size: 512x512 pixels (icon-512.png)
- Background: #1a1a1a (dark gray)
- Design: Colorful circles representing the game balls

Once the PNG files are in the `public` folder, the PWA will be fully functional!

