/* eslint-disable */
import https from 'https';

const url = 'https://raw.githubusercontent.com/iconify/icon-sets/master/json/streamline-color.json';

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            const icons = Object.keys(json.icons);

            const keywords = ['video', 'camera', 'cpu', 'chip', 'trend', 'graph', 'growth', 'question', 'help', 'book', 'chart', 'bar'];

            const matches = {};
            keywords.forEach(k => matches[k] = []);

            icons.forEach(icon => {
                keywords.forEach(k => {
                    if (icon.includes(k)) {
                        matches[k].push(icon);
                    }
                });
            });

            console.log('--- FOUND ICONS ---');
            Object.keys(matches).forEach(k => {
                console.log(`\nKEYWORD: ${k}`);
                // Print top 10 matches for each keyword
                console.log(matches[k].slice(0, 10).join('\n'));
            });

        } catch (e) {
            console.error('Error parsing JSON:', e);
        }
    });
}).on('error', (e) => {
    console.error('Error fetching data:', e);
});
