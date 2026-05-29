import sharp from 'sharp';

const jobs = [
  ['public/desktop.png', 'public/desktop.webp', 1280],
  ['public/mobile.png', 'public/mobile.webp', 900],
  ['public/carter.png', 'public/carter.webp', 900],
  ['src/assets/blog.png', 'src/assets/blog.webp', 1280],
  ['src/assets/contact.png', 'src/assets/contact.webp', 1280]
];

await Promise.all(
  jobs.map(([input, output, width]) =>
    sharp(input)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 76 })
      .toFile(output)
  )
);

console.log(`Optimized ${jobs.length} images.`);
