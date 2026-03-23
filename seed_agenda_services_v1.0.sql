-- SCRIPT DE MIGRACIÓN Y SEMBRADO (ZEUS AGENDA v1.2)
-- Este script arregla la estructura y carga lo que falta.

-- 1. ASEGURAR COLUMNAS FALTANTES
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='zeus_services' AND column_name='price') THEN
        ALTER TABLE public.zeus_services ADD COLUMN price INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='zeus_services' AND column_name='status') THEN
        ALTER TABLE public.zeus_services ADD COLUMN status TEXT DEFAULT 'active';
    END IF;
END $$;

-- 2. AMPLIAR LA RESTRICCIÓN DE TIPO (Añadir 'empresas')
-- Primero quitamos la vieja si existe y ponemos la nueva
DO $$ 
BEGIN 
    ALTER TABLE public.zeus_services DROP CONSTRAINT IF EXISTS zeus_services_type_check;
    ALTER TABLE public.zeus_services ADD CONSTRAINT zeus_services_type_check 
    CHECK (type IN ('asesoria', 'tecnico', 'digitales', 'biblioteca', 'empresas'));
END $$;

-- 3. LIMPIAR DATOS DE AGENDA PARA EVITAR DUPLICADOS
DELETE FROM public.zeus_services WHERE type IN ('asesoria', 'tecnico', 'empresas');

-- 4. INSERTAR LOS 3 SERVICIOS APROBADOS
INSERT INTO public.zeus_services (type, title, description, price_label, price, icon, accent_color, sort_order, status)
VALUES 
('asesoria', 'Asesoría Online (1h)', 'Sesión estratégica personalizada de 1 hora vía Meet.', 'Desde $29.900', 29900, '💡', '#0EA5E9', 1, 'active'),
('tecnico', 'Diagnóstico Técnico', 'Evaluación profunda de requerimientos y viabilidad técnica.', 'Desde $15.000', 15000, '🔧', '#00D4FF', 2, 'active'),
('empresas', 'Consultoría Empresas', 'Soluciones corporativas de alta escala y transformación digital.', 'Desde $95.000', 95000, '🏢', '#6366F1', 3, 'active');

-- Fin del script.
