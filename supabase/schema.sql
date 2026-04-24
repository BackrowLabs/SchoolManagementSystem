-- ============================================================
-- SchoolMS Full Schema — run in Supabase SQL Editor
-- ============================================================

-- ── Students ─────────────────────────────────────────────────
create table if not exists public.students (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  name             text not null,
  roll_number      text not null unique,
  class            text not null,
  section          text not null default 'A',
  date_of_birth    date,
  gender           text not null default 'male',
  phone            text,
  email            text,
  address          text,
  guardian_name    text,
  guardian_phone   text,
  status           text not null default 'active'  check (status in ('active', 'inactive')),
  admission_status text not null default 'pending' check (admission_status in ('pending', 'approved', 'rejected')),
  submitted_by     uuid references auth.users(id)
);

-- ── Fee Structures ────────────────────────────────────────────
create table if not exists public.fee_structures (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  name         text not null,
  class        text not null,
  amount       numeric(10, 2) not null,
  frequency    text not null default 'monthly'
               check (frequency in ('monthly', 'quarterly', 'annually', 'one-time')),
  description  text,
  is_published boolean not null default false,
  published_at timestamptz
);

-- ── Fee Payments ──────────────────────────────────────────────
create table if not exists public.fee_payments (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  student_id        uuid not null references public.students(id) on delete cascade,
  fee_structure_id  uuid not null references public.fee_structures(id) on delete restrict,
  amount_paid       numeric(10, 2) not null,
  payment_date      date not null default current_date,
  payment_method    text not null default 'cash' check (payment_method in ('cash', 'online', 'cheque')),
  receipt_number    text not null unique,
  status            text not null default 'pending' check (status in ('paid', 'partial', 'pending')),
  approval_status   text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected')),
  approved_by       uuid references auth.users(id),
  approved_at       timestamptz,
  submitted_by      uuid references auth.users(id),
  remarks           text
);

-- ── User Profiles (roles) ─────────────────────────────────────
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

-- ── Enable RLS ────────────────────────────────────────────────
alter table public.students       enable row level security;
alter table public.fee_structures enable row level security;
alter table public.fee_payments   enable row level security;
alter table public.user_profiles  enable row level security;
alter table public.attendance     enable row level security;
alter table public.grades         enable row level security;

-- ── Policies: all authenticated users can read/write ─────────
do $$ begin
  if not exists (select 1 from pg_policies where tablename='students' and policyname='auth_all_students') then
    create policy auth_all_students on public.students for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='fee_structures' and policyname='auth_all_fee_structures') then
    create policy auth_all_fee_structures on public.fee_structures for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='fee_payments' and policyname='auth_all_fee_payments') then
    create policy auth_all_fee_payments on public.fee_payments for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='user_profiles' and policyname='auth_all_user_profiles') then
    create policy auth_all_user_profiles on public.user_profiles for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='attendance' and policyname='auth_all_attendance') then
    create policy auth_all_attendance on public.attendance for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='grades' and policyname='auth_all_grades') then
    create policy auth_all_grades on public.grades for all to authenticated using (true) with check (true);
  end if;
end $$;

-- ── Indexes ───────────────────────────────────────────────────
create index if not exists idx_students_status          on public.students(status);
create index if not exists idx_students_admission       on public.students(admission_status);
create index if not exists idx_students_class           on public.students(class);
create index if not exists idx_payments_student         on public.fee_payments(student_id);
create index if not exists idx_payments_approval        on public.fee_payments(approval_status);
create index if not exists idx_payments_date            on public.fee_payments(payment_date);
create index if not exists idx_attendance_student       on public.attendance(student_id);
create index if not exists idx_attendance_date          on public.attendance(date);
create index if not exists idx_attendance_class         on public.attendance(class, section);
create index if not exists idx_grades_student           on public.grades(student_id);

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
