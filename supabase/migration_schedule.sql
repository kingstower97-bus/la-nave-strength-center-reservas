-- Ejecutar en Supabase SQL Editor
-- Permite crear clases puntuales sin horario base

-- 1. Hacer schedule_id nullable en class_instances
ALTER TABLE class_instances ALTER COLUMN schedule_id DROP NOT NULL;

-- 2. Quitar constraint unique que incluye schedule_id (para puntuales)
ALTER TABLE class_instances DROP CONSTRAINT IF EXISTS class_instances_schedule_id_class_date_key;

-- 3. Dar acceso de escritura al admin en schedule y class_instances
CREATE POLICY "schedule_admin_insert" ON schedule FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "schedule_admin_update" ON schedule FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "instances_admin_insert" ON class_instances FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "instances_admin_update" ON class_instances FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 4. Acceso lectura coaches para el formulario
CREATE POLICY IF NOT EXISTS "coaches_read" ON coaches FOR SELECT USING (true);
