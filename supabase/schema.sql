-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- Students table
create table if not exists public.students (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  name            text not null,
  roll_number     text not null unique,
  class           text not null,
  section         text not null default 'A',
  date_of_birth   date,
  gender          text not null default 'male',
  phone           text,
  email           text,
  address         text,
  guardian_name   text,
  guardian_phone  text,
  status          text not null default 'active' check (status in ('active', 'inactive'))
);

-- Fee structures (fee types)
create table if not exists public.fee_structures (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null,
  class       text not null,
  amount      numeric(10, 2) not null,
  frequency   text not null default 'monthly'
              check (frequency in ('monthly', 'quarterly', 'annually', 'one-time')),
  description text
);

-- Fee payments
create table if not exists public.fee_payments (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  student_id         uuid not null references public.students(id) on delete cascade,
  fee_structure_id   uuid not null references public.fee_structures(id) on delete restrict,
  amount_paid        numeric(10, 2) not null,
  payment_date       date not null default current_date,
  payment_method     text not null default 'cash'
                     check (payment_method in ('cash', 'online', 'cheque')),
  receipt_number     text not null unique,
  status             text not null default 'paid'
                     check (status in ('paid', 'partial', 'pending')),
  remarks            text
);

-- Enable Row Level Security
alter table public.students enable row level security;
alter table public.fee_structures enable row level security;
alter table public.fee_payments enable row level security;

-- Policies: only authenticated users (admins) can access all data
create policy "Authenticated users can do everything on students"
  on public.students for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can do everything on fee_structures"
  on public.fee_structures for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can do everything on fee_payments"
  on public.fee_payments for all
  to authenticated
  using (true)
  with check (true);

-- Indexes for performance
create index if not exists idx_students_status on public.students(status);
create index if not exists idx_students_class  on public.students(class);
create index if not exists idx_payments_student on public.fee_payments(student_id);
create index if not exists idx_payments_date    on public.fee_payments(payment_date);
