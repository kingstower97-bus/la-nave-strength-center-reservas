-- ============================================================
-- LA NAVE STRENGTH CENTER — Schema Completo
-- ============================================================
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- Copiar TODO y ejecutar de una vez
-- ============================================================

-- ════════════════════════════════════════════════════════════════
-- 1. PROFILES (se crea automáticamente al registrarse un usuario)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  plan TEXT DEFAULT 'Sin plan',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-crear perfil cuando alguien se registra
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ════════════════════════════════════════════════════════════════
-- 2. TIPOS DE CLASE
-- ════════════════════════════════════════════════════════════════
CREATE TABLE class_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🔥',
  color TEXT NOT NULL DEFAULT '#2563EB',
  description TEXT,
  max_spots INTEGER NOT NULL DEFAULT 16,
  duration_min INTEGER NOT NULL DEFAULT 60,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- ════════════════════════════════════════════════════════════════
-- 3. COACHES
-- ════════════════════════════════════════════════════════════════
CREATE TABLE coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '💪',
  active BOOLEAN NOT NULL DEFAULT true
);

-- ════════════════════════════════════════════════════════════════
-- 4. HORARIO (clases programadas)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_type_id TEXT NOT NULL REFERENCES class_types(id),
  coach_id UUID REFERENCES coaches(id),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=domingo
  start_time TIME NOT NULL,
  max_spots_override INTEGER, -- null = usa el de class_types
  active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(class_type_id, day_of_week, start_time)
);

-- ════════════════════════════════════════════════════════════════
-- 5. CLASES GENERADAS (instancias concretas por día)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE class_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES schedule(id),
  class_date DATE NOT NULL,
  class_type_id TEXT NOT NULL REFERENCES class_types(id),
  coach_id UUID REFERENCES coaches(id),
  start_time TIME NOT NULL,
  max_spots INTEGER NOT NULL,
  cancelled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(schedule_id, class_date)
);

-- ════════════════════════════════════════════════════════════════
-- 6. RESERVAS
-- ════════════════════════════════════════════════════════════════
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_instance_id UUID NOT NULL REFERENCES class_instances(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'attended', 'no_show')),
  booked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  booked_by UUID REFERENCES profiles(id), -- null = self, UUID = admin lo añadió
  is_template BOOLEAN NOT NULL DEFAULT false, -- viene de plantilla automática
  UNIQUE(class_instance_id, user_id, status) -- evita duplicados activos
);

-- Índices para rendimiento
CREATE INDEX idx_bookings_instance ON bookings(class_instance_id) WHERE status = 'confirmed';
CREATE INDEX idx_bookings_user ON bookings(user_id) WHERE status = 'confirmed';
CREATE INDEX idx_class_instances_date ON class_instances(class_date);

-- ════════════════════════════════════════════════════════════════
-- 7. PLANTILLAS (miembros fijos en clases recurrentes)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE class_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES schedule(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(schedule_id, user_id)
);

-- ════════════════════════════════════════════════════════════════
-- 8. FUNCIONES
-- ════════════════════════════════════════════════════════════════

-- Función helper: ¿es admin?
CREATE OR REPLACE FUNCTION is_admin(uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = uid AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Generar instancias de clase para un rango de fechas
CREATE OR REPLACE FUNCTION generate_class_instances(days_ahead INTEGER DEFAULT 14)
RETURNS INTEGER AS $$
DECLARE
  d DATE;
  s RECORD;
  cnt INTEGER := 0;
BEGIN
  FOR d IN SELECT generate_series(CURRENT_DATE, CURRENT_DATE + days_ahead, '1 day'::interval)::date
  LOOP
    FOR s IN
      SELECT sc.*, ct.max_spots AS type_max_spots
      FROM schedule sc
      JOIN class_types ct ON ct.id = sc.class_type_id
      WHERE sc.active = true
        AND sc.day_of_week = EXTRACT(DOW FROM d)
    LOOP
      INSERT INTO class_instances (schedule_id, class_date, class_type_id, coach_id, start_time, max_spots)
      VALUES (
        s.id, d, s.class_type_id, s.coach_id, s.start_time,
        COALESCE(s.max_spots_override, s.type_max_spots)
      )
      ON CONFLICT (schedule_id, class_date) DO NOTHING;
      cnt := cnt + 1;
    END LOOP;
  END LOOP;
  RETURN cnt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar plantillas: auto-reservar miembros fijos en clases generadas
CREATE OR REPLACE FUNCTION apply_templates_for_date(target_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
DECLARE
  t RECORD;
  cnt INTEGER := 0;
BEGIN
  FOR t IN
    SELECT ct.user_id, ci.id AS class_instance_id
    FROM class_templates ct
    JOIN schedule sc ON sc.id = ct.schedule_id
    JOIN class_instances ci ON ci.schedule_id = sc.id AND ci.class_date = target_date
    WHERE ci.cancelled = false
  LOOP
    -- Solo añadir si no está ya reservado y hay plazas
    INSERT INTO bookings (class_instance_id, user_id, status, is_template)
    SELECT t.class_instance_id, t.user_id, 'confirmed', true
    WHERE NOT EXISTS (
      SELECT 1 FROM bookings
      WHERE class_instance_id = t.class_instance_id
        AND user_id = t.user_id
        AND status = 'confirmed'
    )
    AND (
      SELECT COUNT(*) FROM bookings
      WHERE class_instance_id = t.class_instance_id AND status = 'confirmed'
    ) < (
      SELECT max_spots FROM class_instances WHERE id = t.class_instance_id
    );
    IF FOUND THEN cnt := cnt + 1; END IF;
  END LOOP;
  RETURN cnt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reservar plaza (para clientes)
CREATE OR REPLACE FUNCTION book_class(instance_id UUID)
RETURNS JSON AS $$
DECLARE
  ci RECORD;
  current_count INTEGER;
BEGIN
  SELECT * INTO ci FROM class_instances WHERE id = instance_id FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('ok', false, 'error', 'Clase no encontrada'); END IF;
  IF ci.cancelled THEN RETURN json_build_object('ok', false, 'error', 'Clase cancelada'); END IF;
  IF ci.class_date < CURRENT_DATE OR (ci.class_date = CURRENT_DATE AND ci.start_time < CURRENT_TIME) THEN
    RETURN json_build_object('ok', false, 'error', 'Clase ya pasada');
  END IF;

  SELECT COUNT(*) INTO current_count FROM bookings WHERE class_instance_id = instance_id AND status = 'confirmed';
  IF current_count >= ci.max_spots THEN RETURN json_build_object('ok', false, 'error', 'Clase llena'); END IF;

  IF EXISTS (SELECT 1 FROM bookings WHERE class_instance_id = instance_id AND user_id = auth.uid() AND status = 'confirmed') THEN
    RETURN json_build_object('ok', false, 'error', 'Ya estás apuntado');
  END IF;

  INSERT INTO bookings (class_instance_id, user_id) VALUES (instance_id, auth.uid());
  RETURN json_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cancelar reserva (para clientes, con regla de 2h)
CREATE OR REPLACE FUNCTION cancel_booking(booking_id UUID)
RETURNS JSON AS $$
DECLARE
  b RECORD;
  ci RECORD;
BEGIN
  SELECT * INTO b FROM bookings WHERE id = booking_id AND user_id = auth.uid() AND status = 'confirmed';
  IF NOT FOUND THEN RETURN json_build_object('ok', false, 'error', 'Reserva no encontrada'); END IF;

  SELECT * INTO ci FROM class_instances WHERE id = b.class_instance_id;
  IF (ci.class_date + ci.start_time) - INTERVAL '2 hours' < NOW() THEN
    RETURN json_build_object('ok', false, 'error', 'No puedes cancelar con menos de 2h de antelación');
  END IF;

  UPDATE bookings SET status = 'cancelled', cancelled_at = NOW() WHERE id = booking_id;
  RETURN json_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin: añadir miembro a clase
CREATE OR REPLACE FUNCTION admin_add_to_class(instance_id UUID, member_id UUID)
RETURNS JSON AS $$
DECLARE
  ci RECORD;
  current_count INTEGER;
BEGIN
  IF NOT is_admin() THEN RETURN json_build_object('ok', false, 'error', 'No autorizado'); END IF;

  SELECT * INTO ci FROM class_instances WHERE id = instance_id FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('ok', false, 'error', 'Clase no encontrada'); END IF;

  SELECT COUNT(*) INTO current_count FROM bookings WHERE class_instance_id = instance_id AND status = 'confirmed';
  IF current_count >= ci.max_spots THEN RETURN json_build_object('ok', false, 'error', 'Clase llena'); END IF;

  IF EXISTS (SELECT 1 FROM bookings WHERE class_instance_id = instance_id AND user_id = member_id AND status = 'confirmed') THEN
    RETURN json_build_object('ok', false, 'error', 'Ya está apuntado');
  END IF;

  INSERT INTO bookings (class_instance_id, user_id, booked_by) VALUES (instance_id, member_id, auth.uid());
  RETURN json_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin: quitar miembro de clase
CREATE OR REPLACE FUNCTION admin_remove_from_class(instance_id UUID, member_id UUID)
RETURNS JSON AS $$
BEGIN
  IF NOT is_admin() THEN RETURN json_build_object('ok', false, 'error', 'No autorizado'); END IF;

  UPDATE bookings SET status = 'cancelled', cancelled_at = NOW()
  WHERE class_instance_id = instance_id AND user_id = member_id AND status = 'confirmed';

  IF NOT FOUND THEN RETURN json_build_object('ok', false, 'error', 'Reserva no encontrada'); END IF;
  RETURN json_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin: mover miembro entre clases
CREATE OR REPLACE FUNCTION admin_move_member(from_instance UUID, to_instance UUID, member_id UUID)
RETURNS JSON AS $$
DECLARE
  ci RECORD;
  current_count INTEGER;
  result JSON;
BEGIN
  IF NOT is_admin() THEN RETURN json_build_object('ok', false, 'error', 'No autorizado'); END IF;

  -- Verificar destino
  SELECT * INTO ci FROM class_instances WHERE id = to_instance FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('ok', false, 'error', 'Clase destino no encontrada'); END IF;

  SELECT COUNT(*) INTO current_count FROM bookings WHERE class_instance_id = to_instance AND status = 'confirmed';
  IF current_count >= ci.max_spots THEN RETURN json_build_object('ok', false, 'error', 'Clase destino llena'); END IF;

  IF EXISTS (SELECT 1 FROM bookings WHERE class_instance_id = to_instance AND user_id = member_id AND status = 'confirmed') THEN
    RETURN json_build_object('ok', false, 'error', 'Ya está en la clase destino');
  END IF;

  -- Cancelar origen
  UPDATE bookings SET status = 'cancelled', cancelled_at = NOW()
  WHERE class_instance_id = from_instance AND user_id = member_id AND status = 'confirmed';

  -- Reservar destino
  INSERT INTO bookings (class_instance_id, user_id, booked_by) VALUES (to_instance, member_id, auth.uid());

  RETURN json_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin: cambiar rol de usuario
CREATE OR REPLACE FUNCTION set_user_role(target_user UUID, new_role TEXT)
RETURNS JSON AS $$
BEGIN
  IF NOT is_admin() THEN RETURN json_build_object('ok', false, 'error', 'No autorizado'); END IF;
  IF new_role NOT IN ('admin', 'member') THEN RETURN json_build_object('ok', false, 'error', 'Rol inválido'); END IF;

  UPDATE profiles SET role = new_role, updated_at = NOW() WHERE id = target_user;
  IF NOT FOUND THEN RETURN json_build_object('ok', false, 'error', 'Usuario no encontrado'); END IF;

  RETURN json_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vista: clases del día con info completa
CREATE OR REPLACE VIEW daily_classes AS
SELECT
  ci.id,
  ci.class_date,
  ci.start_time,
  ci.max_spots,
  ci.cancelled,
  ci.schedule_id,
  ct.id AS class_type_id,
  ct.name AS class_name,
  ct.icon AS class_icon,
  ct.color AS class_color,
  ct.duration_min,
  c.name AS coach_name,
  c.emoji AS coach_emoji,
  (SELECT COUNT(*) FROM bookings b WHERE b.class_instance_id = ci.id AND b.status = 'confirmed') AS booked_count
FROM class_instances ci
JOIN class_types ct ON ct.id = ci.class_type_id
LEFT JOIN coaches c ON c.id = ci.coach_id
WHERE ci.cancelled = false
ORDER BY ci.class_date, ci.start_time;

-- ════════════════════════════════════════════════════════════════
-- 9. ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════════
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_templates ENABLE ROW LEVEL SECURITY;

-- Profiles: ver todos (para lista de miembros en admin), editar solo el tuyo
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_self" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE USING (is_admin());

-- Class types, coaches, schedule: todos pueden leer
CREATE POLICY "class_types_read" ON class_types FOR SELECT USING (true);
CREATE POLICY "coaches_read" ON coaches FOR SELECT USING (true);
CREATE POLICY "schedule_read" ON schedule FOR SELECT USING (true);

-- Class instances: todos pueden leer
CREATE POLICY "instances_read" ON class_instances FOR SELECT USING (true);
CREATE POLICY "instances_insert" ON class_instances FOR INSERT WITH CHECK (is_admin());

-- Bookings: ver las tuyas + admin ve todas
CREATE POLICY "bookings_select_own" ON bookings FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "bookings_insert" ON bookings FOR INSERT WITH CHECK (user_id = auth.uid() OR is_admin());
CREATE POLICY "bookings_update" ON bookings FOR UPDATE USING (user_id = auth.uid() OR is_admin());

-- Templates: solo admin
CREATE POLICY "templates_read" ON class_templates FOR SELECT USING (true);
CREATE POLICY "templates_admin" ON class_templates FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "templates_delete" ON class_templates FOR DELETE USING (is_admin());

-- ════════════════════════════════════════════════════════════════
-- 10. SEED DATA
-- ════════════════════════════════════════════════════════════════

-- Tipos de clase
INSERT INTO class_types (id, name, icon, color, description, max_spots, duration_min, sort_order) VALUES
  ('crossfit',      'CrossFit',              '🔥', '#EF4444', 'WOD de alta intensidad',           16, 60, 1),
  ('halterofilia',  'Técnica Halterofilia',  '🏋️', '#F59E0B', 'Snatch, Clean & Jerk',            10, 75, 2),
  ('powerlifting',  'Powerlifting',          '💪', '#3B82F6', 'Squat, Bench, Deadlift',           12, 90, 3),
  ('openbox',       'Open Box',              '🏗️', '#10B981', 'Entreno libre con supervisión',    20, 60, 4),
  ('movilidad',     'Movilidad & Recovery',  '🧘', '#8B5CF6', 'Estiramientos y recuperación',     14, 45, 5),
  ('strongman',     'Strongman',             '⚡', '#F97316', 'Yoke, Atlas Stones, Log Press',     8, 60, 6);

-- Coaches
INSERT INTO coaches (id, name, emoji) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Carlos M.', '💪'),
  ('00000000-0000-0000-0000-000000000002', 'Ana R.',    '🔥'),
  ('00000000-0000-0000-0000-000000000003', 'David P.',  '⚡'),
  ('00000000-0000-0000-0000-000000000004', 'Laura G.',  '🧘');

-- Horario semanal (Lunes a Viernes)
-- Lunes a viernes (day_of_week 1-5)
DO $$
DECLARE
  d INTEGER;
BEGIN
  FOR d IN 1..5 LOOP
    INSERT INTO schedule (class_type_id, coach_id, day_of_week, start_time) VALUES
      ('crossfit',     '00000000-0000-0000-0000-000000000001', d, '07:00'),
      ('halterofilia', '00000000-0000-0000-0000-000000000002', d, '08:15'),
      ('powerlifting', '00000000-0000-0000-0000-000000000003', d, '09:30'),
      ('openbox',      '00000000-0000-0000-0000-000000000001', d, '11:00'),
      ('crossfit',     '00000000-0000-0000-0000-000000000004', d, '13:00'),
      ('movilidad',    '00000000-0000-0000-0000-000000000002', d, '16:00'),
      ('halterofilia', '00000000-0000-0000-0000-000000000003', d, '17:00'),
      ('crossfit',     '00000000-0000-0000-0000-000000000001', d, '18:30'),
      ('powerlifting', '00000000-0000-0000-0000-000000000004', d, '19:45'),
      ('strongman',    '00000000-0000-0000-0000-000000000003', d, '21:00');
  END LOOP;
END $$;

-- Sábado (day_of_week 6)
INSERT INTO schedule (class_type_id, coach_id, day_of_week, start_time) VALUES
  ('crossfit',     '00000000-0000-0000-0000-000000000001', 6, '09:00'),
  ('halterofilia', '00000000-0000-0000-0000-000000000002', 6, '10:30'),
  ('openbox',      '00000000-0000-0000-0000-000000000001', 6, '12:00'),
  ('movilidad',    '00000000-0000-0000-0000-000000000004', 6, '13:30');

-- Domingo (day_of_week 0)
INSERT INTO schedule (class_type_id, coach_id, day_of_week, start_time) VALUES
  ('openbox',   '00000000-0000-0000-0000-000000000001', 0, '09:00'),
  ('crossfit',  '00000000-0000-0000-0000-000000000002', 0, '10:30'),
  ('movilidad', '00000000-0000-0000-0000-000000000004', 0, '12:00');

-- Generar clases para los próximos 14 días
SELECT generate_class_instances(14);

-- ════════════════════════════════════════════════════════════════
-- 11. HACER ADMIN AL PRIMER USUARIO QUE SE REGISTRE
-- ════════════════════════════════════════════════════════════════
-- Ejecuta esto DESPUÉS de registrar la cuenta del dueño:
-- UPDATE profiles SET role = 'admin' WHERE id = 'UUID-DEL-USUARIO';
-- O usa la función:
-- SELECT set_user_role('UUID-DEL-USUARIO', 'admin');
--
-- TIP: Para encontrar tu UUID después de registrarte:
-- SELECT id, full_name, role FROM profiles;
