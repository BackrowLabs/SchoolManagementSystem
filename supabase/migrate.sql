-- ============================================================
-- SchoolMS Migration — run this if you already ran schema.sql
-- Adds new columns to existing tables + creates new tables
-- ============================================================

-- ── Add new columns to students (if they don't exist) ────────
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='students' and column_name='admission_status') then
    alter table public.students add column admission_status text not null default 'approved'
      check (admission_status in ('pending', 'approved', 'rejected'));
  end if;
  if not exists (select 1 from information_schema.columns where table_name='students' and column_name='submitted_by') then
    alter table public.students add column submitted_by uuid references auth.users(id);
  end if;
end $$;

-- ── Add new columns to fee_payments (if they don't exist) ────
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='fee_payments' and column_name='approval_status') then
    alter table public.fee_payments add column approval_status text not null default 'pending'
      check (approval_status in ('pending', 'approved', 'rejected'));
  end if;
  if not exists (select 1 from information_schema.columns where table_name='fee_payments' and column_name='approved_by') then
    alter table public.fee_payments add column approved_by uuid references auth.users(id);
  end if;
  if not exists (select 1 from information_schema.columns where table_name='fee_payments' and column_name='approved_at') then
    alter table public.fee_payments add column approved_at timestamptz;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='fee_payments' and column_name='submitted_by') then
    alter table public.fee_payments add column submitted_by uuid references auth.users(id);
  end if;
end $$;

-- ── Add new columns to fee_structures (if they don't exist) ──
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='fee_structures' and column_name='is_published') then
    alter table public.fee_structures add column is_published boolean not null default false;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='fee_structures' and column_name='published_at') then
    alter table public.fee_structures add column published_at timestamptz;
  end if;
end $$;

-- ── User Profiles ─────────────────────────────────────────────
create table if not exists public.user_profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  name       text not null,
  role       text not null default 'office_staff'
             check (role in ('admin', 'office_staff', 'teacher')),
  is_active  boolean not null default true
);

-- ── Attendance ────────────────────────────────────────────────
create table if not exists public.attendance (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  student_id  uuid not null references public.students(id) on delete cascade,
  class       text not null,
  section     text not null,
  date        date not null default current_date,
  status      text not null default 'present' check (status in ('present', 'absent', 'late')),
  marked_by   uuid references auth.users(id),
  unique (student_id, date)
);

-- ── Grades ────────────────────────────────────────────────────
create table if not exists public.grades (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  student_id  uuid not null references public.students(id) on delete cascade,
  class       text not null,
  subject     text not null,
  exam_type   text not null default 'unit_test' check (exam_type in ('unit_test', 'midterm', 'final', 'assignment')),
  marks       numeric(5, 2) not null,
  max_marks   numeric(5, 2) not null default 100,
  grade       text,
  teacher_id  uuid references auth.users(id),
  unique (student_id, subject, exam_type)
);

-- ── Enable RLS on new tables ──────────────────────────────────
alter table public.user_profiles  enable row level security;
alter table public.attendance     enable row level security;
alter table public.grades         enable row level security;

-- ── RLS Policies (idempotent) ─────────────────────────────────
do $$ begin
  if not exists (select 1 from pg_policies where tablename='user_profiles' and policyname='auth_all_user_profiles') then
    create policy auth_all_user_profiles on public.user_profiles for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='attendance' and policyname='auth_all_attendance') then
    create policy auth_all_attendance on public.attendance for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='grades' and policyname='auth_all_grades') then
    create policy auth_all_grades on public.grades for all to authenticated using (true) with check (true);
  end if;
  -- Ensure existing table policies exist too
  if not exists (select 1 from pg_policies where tablename='students' and policyname='auth_all_students') then
    create policy auth_all_students on public.students for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='fee_structures' and policyname='auth_all_fee_structures') then
    create policy auth_all_fee_structures on public.fee_structures for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='fee_payments' and policyname='auth_all_fee_payments') then
    create policy auth_all_fee_payments on public.fee_payments for all to authenticated using (true) with check (true);
  end if;
end $$;

-- ── Indexes ───────────────────────────────────────────────────
create index if not exists idx_students_admission   on public.students(admission_status);
create index if not exists idx_payments_approval    on public.fee_payments(approval_status);
create index if not exists idx_attendance_student   on public.attendance(student_id);
create index if not exists idx_attendance_date      on public.attendance(date);
create index if not exists idx_attendance_class     on public.attendance(class, section);
create index if not exists idx_grades_student       on public.grades(student_id);

-- ── Auto-create user_profile on signup ───────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.user_profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'office_staff')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Create a profile for any existing auth users who lack one ─
insert into public.user_profiles (id, name, role)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  'admin'
from auth.users u
where not exists (select 1 from public.user_profiles p where p.id = u.id)
on conflict (id) do nothing;

-- ── Done ─────────────────────────────────────────────────────
select 'Migration complete ✓' as result;
