-- Migration 085: 강원 FC PIN 재초기화
DELETE FROM public.b2b_club_pins WHERE club_id = 'gangwon';
