-- Migration: Add is_favorite column to screenshots table
-- Run this in your Supabase SQL Editor

ALTER TABLE screenshots
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false;
