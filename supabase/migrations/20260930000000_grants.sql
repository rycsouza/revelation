-- Permissões explícitas: só o servidor (service_role) acessa as tabelas.
-- Necessário quando o projeto é criado com "Automatically expose new tables" desligado,
-- e reforça a segurança nos outros casos (a chave pública não enxerga nada).
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;

revoke all on all tables in schema public from anon, authenticated;
