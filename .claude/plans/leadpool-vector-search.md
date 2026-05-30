# 리드풀 벡터 검색 (pgvector)

## Goal
전체 리드풀 AI 검색을 "전체 데이터 → Claude" 구조에서
"벡터 유사도 검색 → 상위 20명 → Claude 재랭킹" 구조로 전환.

## REQ-1: DB 마이그레이션 (040)
- pgvector 확장 활성화
- students.embedding vector(1536) 컬럼 추가
- IVFFlat 인덱스 생성 (코사인 유사도)

## REQ-2: 임베딩 생성 함수
- buildEmbeddingText(student): 이름/학년/상담 전체/이탈 사유/점수 → 단일 텍스트
- OpenAI text-embedding-3-small 호출
- students.embedding 업데이트

## REQ-3: 임베딩 갱신 트리거
- PATCH /api/crm/students/[id] 에서 consultation_timeline 변경 시 백그라운드 임베딩 갱신
- POST /api/crm/students/[id]/embedding: 수동 갱신용

## REQ-4: AI 검색 API 개선
- 쿼리 → 임베딩 → pgvector 유사도 검색 → 상위 20명
- 상위 20명 전체 상담 내용 → Claude 재랭킹
- embedding NULL인 학생은 fallback(이름 텍스트 검색)으로 커버

## REQ-5: 기존 리드 일괄 임베딩 스크립트
- scripts/generate-embeddings.ts
- 100명씩 배치, rate limit 준수
