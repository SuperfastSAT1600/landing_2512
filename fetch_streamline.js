/* eslint-disable */
import https from 'https';
const url = 'https://raw.githubusercontent.com/iconify/icon-sets/master/json/streamline.json';
https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            const icons = Object.keys(json.icons);
            console.log('Total icons:', icons.length);
            const keywords = ['video', 'camera', 'chip', 'graph', 'trend', 'question', 'book', 'chart'];
            keywords.forEach(k => {
                console.log(`\n--- ${k.toUpperCase()} ---`);
                console.log(icons.filter(i => i.includes(k)).slice(0, 5).join('\n'));
            });
        } catch (e) {
            console.log('Error parsing JSON');
        }
    });
});
