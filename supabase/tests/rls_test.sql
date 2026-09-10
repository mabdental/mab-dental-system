begin;

select plan(8);

select throws_ok(
  $$ select * from public.appointments $$,
  '42501',
  'anonymous users cannot read appointments'
);

select throws_ok(
  $$ select * from public.patients $$,
  '42501',
  'anonymous users cannot read patients'
);

select has_table_privilege('anon', 'public.branches', 'select');
select has_table_privilege('anon', 'public.services', 'select');
select has_table_privilege('anon', 'public.appointments', 'select') is false;
select has_table_privilege('anon', 'public.payments', 'select') is false;
select has_table_privilege('anon', 'public.inventory_items', 'select') is false;
select has_table_privilege('anon', 'public.staff_profiles', 'select') is false;

select * from finish();
rollback;
