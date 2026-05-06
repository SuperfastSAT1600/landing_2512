const fs = require('fs');
const p = require('path');
const d = 'ontology';
const files = fs.readdirSync(d);
for(const f of files) {
  if (f.endsWith('.jsonl') && !['master_unified.jsonl', 'transitions.jsonl', 'wic.jsonl', 'master_sat_ontology_v2.jsonl'].includes(f)) {
    let t = fs.readFileSync(p.join(d, f), 'utf-8');
    if (t.includes('}\\n{"metadata":')) {
      t = t.split('}\\n{"metadata":').join('}\n{"metadata":');
      t = t.replace(/\}\\n$/, '}\n');
      t = t.replace(/\}\\n\r\n$/, '}\n');
      t = t.replace(/\}\\n\n$/, '}\n');
      fs.writeFileSync(p.join(d, f), t);
      console.log('Fixed ' + f);
    } else {
      console.log('Skipped ' + f);
    }
  }
}
