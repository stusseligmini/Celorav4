-- Grant SELECT permissions på schema_migrations til authenticated rollen
GRANT SELECT ON public.schema_migrations TO authenticated;