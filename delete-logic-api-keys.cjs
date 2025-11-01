const fs = require('fs');
const path = require('path');

const logicsDir = 'C:/Users/sim/AppData/Roaming/Electron/logics';

if (fs.existsSync(logicsDir)) {
  const files = fs.readdirSync(logicsDir);

  files.forEach(file => {
    if (!file.endsWith('.json')) return;

    const filePath = path.join(logicsDir, file);

    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      if (content.apiKeys) {
        delete content.apiKeys;
        fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
        console.log('API 키 삭제됨:', file);
      } else {
        console.log('API 키 없음:', file);
      }
    } catch(e) {
      console.log('에러:', file, e.message);
    }
  });

  console.log('\n모든 전략의 API 키 확인/삭제 완료');
} else {
  console.log('logics 폴더가 없습니다.');
}
