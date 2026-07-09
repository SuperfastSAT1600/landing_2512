-- Migration 082: 강원 FC PIN 초기화 — 2-step 확인 세팅 플로우 전환
DELETE FROM public.b2b_club_pins WHERE club_id = 'gangwon';
