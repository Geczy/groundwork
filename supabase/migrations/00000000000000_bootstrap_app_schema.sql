do $$
begin
  raise exception 'Run bun run supabase:configure -- <schema> before applying migrations.';
end;
$$;
