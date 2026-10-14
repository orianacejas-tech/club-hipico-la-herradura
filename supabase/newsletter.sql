-- =============================================================================
-- newsletter.sql · Base de datos de la newsletter del Club Hípico La Herradura
-- -----------------------------------------------------------------------------
-- CÓMO SE USA: en Supabase, abre «SQL Editor», pega TODO este archivo y pulsa
-- «Run». Se puede ejecutar varias veces sin romper nada ni borrar suscriptores.
--
-- QUÉ CREA:
--   1. La tabla «suscriptores»: la lista de personas apuntadas a la newsletter.
--   2. La función «suscribirse»: la usa el formulario de la web para apuntarse.
--   3. La función «darse_de_baja»: borra un email de la lista.
--
-- SEGURIDAD: la web se conecta con la clave pública (publishable). Con esa
-- clave NO se puede leer, cambiar ni borrar la tabla: solo se pueden llamar
-- las dos funciones de abajo. La lista completa solo se ve dentro de Supabase,
-- en «Table Editor» → suscriptores.
-- =============================================================================


-- 1. TABLA DE SUSCRIPTORES ----------------------------------------------------

create table if not exists public.suscriptores (
  id             bigint generated always as identity primary key,
  email          text not null unique
                 check (char_length(email) <= 254
                        and email = lower(email)
                        and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  nombre         text check (char_length(nombre) <= 80),
  intereses      text[] not null default '{}' check (cardinality(intereses) <= 10),
  creado_en      timestamptz not null default now(),  -- cuándo se apuntó y aceptó la privacidad
  actualizado_en timestamptz not null default now()   -- última vez que cambió sus datos
);

comment on table public.suscriptores is 'Lista de la newsletter del Club Hípico La Herradura';

-- Row Level Security activado y SIN ninguna política = con la clave pública
-- nadie puede tocar la tabla directamente. Además se quitan los permisos.
alter table public.suscriptores enable row level security;
revoke all on table public.suscriptores from anon, authenticated;


-- 2. FUNCIÓN «suscribirse» ----------------------------------------------------
-- Apunta un email a la lista. Si ya estaba apuntado, actualiza su nombre y sus
-- temas. Siempre responde lo mismo ('ok'), para que nadie pueda averiguar con
-- el formulario quién está suscrito y quién no.

create or replace function public.suscribirse(
  p_email             text,
  p_nombre            text    default null,
  p_intereses         text[]  default '{}',
  p_acepta_privacidad boolean default false
)
returns text
language plpgsql
security definer      -- se ejecuta con los permisos del dueño de la tabla...
set search_path = ''  -- ...y sin atajos de nombres (recomendación de seguridad de Supabase)
as $$
declare
  v_email     text := lower(trim(coalesce(p_email, '')));
  v_nombre    text := left(nullif(trim(coalesce(p_nombre, '')), ''), 80);
  v_intereses text[];
begin
  if p_acepta_privacidad is not true then
    raise exception 'Hay que aceptar la política de privacidad' using errcode = '22023';
  end if;

  if char_length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'El email no es válido' using errcode = '22023';
  end if;

  -- Temas: solo palabras sencillas (clases, pupilaje, rutas…), sin repetir y como mucho 10
  select coalesce(array_agg(distinct t.tema order by t.tema), '{}'::text[])
    into v_intereses
    from unnest(coalesce(p_intereses, '{}'::text[])) as t(tema)
   where t.tema ~ '^[a-z-]{1,30}$';
  v_intereses := v_intereses[1:10];

  -- Freno contra robots: como mucho 30 altas nuevas por minuto en total
  if (select count(*) from public.suscriptores
       where creado_en > now() - interval '1 minute') >= 30 then
    raise exception 'Demasiadas suscripciones seguidas' using errcode = '54000';
  end if;

  insert into public.suscriptores as s (email, nombre, intereses)
  values (v_email, v_nombre, v_intereses)
  on conflict (email) do update
     set nombre         = coalesce(excluded.nombre, s.nombre),
         intereses      = excluded.intereses,
         actualizado_en = now();

  return 'ok';
end;
$$;

revoke execute on function public.suscribirse(text, text, text[], boolean) from public;
grant execute on function public.suscribirse(text, text, text[], boolean) to anon, authenticated;


-- 3. FUNCIÓN «darse_de_baja» --------------------------------------------------
-- Borra el email de la lista (no se guarda nada de esa persona). También
-- responde siempre 'ok', esté o no el email en la lista.

create or replace function public.darse_de_baja(p_email text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.suscriptores
   where email = lower(trim(coalesce(p_email, '')));
  return 'ok';
end;
$$;

revoke execute on function public.darse_de_baja(text) from public;
grant execute on function public.darse_de_baja(text) to anon, authenticated;


-- 4. Avisa a la API de Supabase de que hay funciones nuevas -------------------
notify pgrst, 'reload schema';
