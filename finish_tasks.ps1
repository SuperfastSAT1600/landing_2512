while ($true) {
    $running = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'generate_missing_analysis.mjs' }
    if (-not $running) {
        break
    }
    Write-Host "Waiting for generate_missing_analysis.mjs to finish..."
    Start-Sleep -Seconds 10
}

Write-Host "generate_missing_analysis.mjs finished. Replacing v2 database..."
Copy-Item "master_sat_ontology_v3_temp.jsonl" "master_sat_ontology_v2.jsonl" -Force

Write-Host "Running python scripts..."
python scripts/ontology/normalize_pdf_extractions.py
python scripts/ontology/enrich_knowledge_graph.py
python scripts/ontology/merge_corpus.py

Write-Host "All tasks completed!"
