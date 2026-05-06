const fs = require('fs');
const path = require('path');

const cssVarsMap = {
  'var(--primary)': 'hsl(var(--primary))',
  'var(--success)': 'hsl(var(--success))',
  'var(--danger)': 'hsl(var(--destructive))',
  'var(--warning)': 'hsl(var(--warning))',
  'var(--info)': 'hsl(var(--info))',
  'var(--text)': 'hsl(var(--foreground))',
  'var(--text-secondary)': 'hsl(var(--muted-foreground))',
  'var(--text-muted)': 'hsl(var(--muted-foreground))',
  'var(--border)': 'hsl(var(--border))',
  'var(--card-bg)': 'hsl(var(--surface))',
  '#10b981': 'hsl(var(--success))',
  '#ef4444': 'hsl(var(--destructive))',
  '#f59e0b': 'hsl(var(--warning))',
  '#3b82f6': 'hsl(var(--info))',
  '#06b6d4': 'hsl(var(--info))',
  '#a855f7': 'hsl(var(--accent))',
  '#8b5cf6': 'hsl(var(--primary))',
  '#1a1a2e': 'hsl(var(--primary-foreground))',
  '#d4af37': 'hsl(var(--primary))',
  '#111111': 'hsl(var(--background))',
  '#1a1a1a': 'hsl(var(--input))',
  '#333': 'hsl(var(--secondary))',
};

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  
  files.forEach(file => {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      let newContent = content;
      // Replace keys
      for (const [key, value] of Object.entries(cssVarsMap)) {
        // use regex to replace with word boundaries or quotes to avoid double replacement if possible, but actually split/join is safe if ordered well
        newContent = newContent.split(key).join(value);
      }

      // Fix `hsl(var(--...))15`
      newContent = newContent.replace(/hsl\(var\((--[a-z-]+)\)\)([0-9a-fA-F]{2})(?![\w\-\(])/g, (match, varName, hexAlpha) => {
          const alpha = parseInt(hexAlpha, 16) / 255;
          return `hsl(var(${varName})/${alpha.toFixed(2)})`;
      });
      
      // Fix background: `${col.color}18` to background: `hsl(var(--success)/0.15)` etc by just finding `${col.color}HEX`
      newContent = newContent.replace(/\$\{([^}]+)\}([0-9a-fA-F]{2})(?![\w\-\(])/g, (match, varName, hexAlpha) => {
          const alpha = parseInt(hexAlpha, 16) / 255;
          // We can't easily replace dynamic color alpha if it's evaluated, so we wrap it if it's a known string, but wait, if it's col.color it will just be `hsl(...)` 
          // Actually, if we just use hsl-color string, appending hex to it in js won't work in CSS anymore.
          // e.g. `${item.color}18` where item.color is `hsl(var(--primary))` becomes `hsl(var(--primary))18`. That's invalid css.
          // Better regex:
          return `\${${varName}.replace(')', '/${alpha.toFixed(2)})')}`;
      });

      // Special cases
      newContent = newContent.split('linear-gradient(135deg, hsl(var(--primary)), #b49050)').join('var(--gradient-primary)');
      newContent = newContent.split('rgba(255,255,255,0.05)').join('hsl(var(--surface-hover))');
      newContent = newContent.split('rgba(255, 255, 255, 0.05)').join('hsl(var(--surface-hover))');
      newContent = newContent.split('rgba(255,255,255,0.03)').join('hsl(var(--surface-elevated))');
      newContent = newContent.split('rgba(255, 255, 255, 0.03)').join('hsl(var(--surface-elevated))');
      newContent = newContent.split('rgba(255,255,255,0.02)').join('hsl(var(--surface))');
      newContent = newContent.split('rgba(255, 255, 255, 0.02)').join('hsl(var(--surface))');
      newContent = newContent.split('rgba(255,255,255,0.1)').join('hsl(var(--border))');
      newContent = newContent.split('rgba(255, 255, 255, 0.1)').join('hsl(var(--border))');

      newContent = newContent.replace(/rgba\(239,68,68,0\.06\)/g, 'hsl(var(--destructive)/0.06)');
      newContent = newContent.replace(/rgba\(239,68,68,0\.15\)/g, 'hsl(var(--destructive)/0.15)');

      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
      }
    }
  });
}

processDirectory(path.join(process.cwd(), 'src', 'pages'));
processDirectory(path.join(process.cwd(), 'src', 'components'));
