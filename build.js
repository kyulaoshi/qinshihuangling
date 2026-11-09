// 의존성 없는 빌드: src/ 의 CSS·JS를 한 장의 HTML(dist/index.html)로 합칩니다.
const fs = require('fs'), path = require('path');
const src = f => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
const order = ['util.js', 'audio.js', 'renderer.js', 'world.js', 'missions.js', 'player.js', 'action.js', 'ui.js', 'game.js'];
const js = order.map(f => `// ===== ${f} =====\n` + src(f)).join('\n');
const html = src('index.template.html').replace('/*__CSS__*/', () => src('styles.css')).replace('/*__JS__*/', () => js);
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist', 'index.html'), html);
fs.writeFileSync(path.join(__dirname, 'dist', '.nojekyll'), '');
console.log('built dist/index.html', (html.length / 1024).toFixed(1) + ' KB');
