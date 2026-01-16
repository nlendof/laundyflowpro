-- MIGRACIÓN 1A: Agregar rol owner al enum (debe ejecutarse primero)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'owner';