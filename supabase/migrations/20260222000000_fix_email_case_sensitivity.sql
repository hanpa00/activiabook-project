-- Fix email case-sensitivity in reactivation RPC functions
begin;

-- 1. Update get_user_reactivation_status to use case-insensitive comparison
create or replace function public.get_user_reactivation_status(email_to_check text)
returns table (
    user_exists boolean,
    is_closed boolean,
    can_reactivate boolean,
    reactivation_deadline timestamp with time zone
)
language plpgsql
security definer set search_path = auth, public
as $$
declare
    v_user_id uuid;
    v_deleted_at timestamp with time zone;
    v_period integer := 30;
begin
    -- 1. Find user in auth.users (case-insensitive)
    select id into v_user_id from auth.users where lower(email) = lower(email_to_check);
    
    if v_user_id is null then
        return query select false, false, false, null::timestamp with time zone;
        return;
    end if;

    -- 2. Get profile and quota info (Use LEFT JOIN to avoid failure if missing)
    select p.deleted_at, coalesce(q.reactivation_period_days, 30)
    into v_deleted_at, v_period
    from public.profiles p
    left join public.user_quotas q on q.user_id = p.id
    where p.id = v_user_id;

    -- If profile is missing, it's a weird state but we'll treat as active (exists=true, is_closed=false)
    if v_user_id is not null and v_deleted_at is null then
        return query select true, false, false, null::timestamp with time zone;
    elsif v_deleted_at is not null then
        -- Check if unlimited (-1) or within reactivation period
        if v_period = -1 or now() < v_deleted_at + (v_period || ' days')::interval then
            return query select true, true, true, 
                case when v_period = -1 then null else v_deleted_at + (v_period || ' days')::interval end;
        else
            return query select true, true, false, v_deleted_at + (v_period || ' days')::interval;
        end if;
    else
        -- Fallback: user exists but no profile or deleted_at is null
        return query select true, false, false, null::timestamp with time zone;
    end if;
end;
$$;

-- 2. Update reactivate_user_account to use case-insensitive comparison
create or replace function public.reactivate_user_account(email_to_reactivate text)
returns boolean
language plpgsql
security definer set search_path = auth, public
as $$
declare
    v_user_id uuid;
    v_deleted_at timestamp with time zone;
    v_period integer;
begin
    -- 1. Find user in auth.users (case-insensitive)
    select id into v_user_id from auth.users where lower(email) = lower(email_to_reactivate);
    
    if v_user_id is null then
        return false;
    end if;

    -- 2. Check if account is actually closed and within period
    select p.deleted_at, q.reactivation_period_days 
    into v_deleted_at, v_period
    from public.profiles p
    join public.user_quotas q on q.user_id = p.id
    where p.id = v_user_id;

    if v_deleted_at is null then
        return true; -- Already active
    end if;

    if v_period = -1 or now() < v_deleted_at + (v_period || ' days')::interval then
        -- Reactivate
        update public.profiles 
        set deleted_at = null 
        where id = v_user_id;
        
        return true;
    else
        return false; -- Too late
    end if;
end;
$$;

-- 3. Update reactivate_user_account_v2 to use case-insensitive comparison
create or replace function public.reactivate_user_account_v2(
    email_to_reactivate text,
    reset_data boolean default false
)
returns boolean
language plpgsql
security definer set search_path = auth, public
as $$
declare
    v_user_id uuid;
    v_deleted_at timestamp with time zone;
    v_period integer;
begin
    -- 1. Find user in auth.users (case-insensitive)
    select id into v_user_id from auth.users where lower(email) = lower(email_to_reactivate);
    
    if v_user_id is null then
        return false;
    end if;

    -- 2. Get profile and quota info
    select p.deleted_at, q.reactivation_period_days 
    into v_deleted_at, v_period
    from public.profiles p
    join public.user_quotas q on q.user_id = p.id
    where p.id = v_user_id;

    -- 3. Check if reactivation is possible
    if v_deleted_at is not null then
        if not (v_period = -1 or now() < v_deleted_at + (v_period || ' days')::interval) then
            -- Exceeded grace period. 
            perform public.reset_user_data(v_user_id);
            update public.profiles set deleted_at = null where id = v_user_id;
            return true;
        end if;
    end if;

    -- 4. Handle reset if requested
    if reset_data then
        perform public.reset_user_data(v_user_id);
    end if;

    -- 5. Reactivate
    update public.profiles 
    set deleted_at = null 
    where id = v_user_id;
    
    return true;
end;
$$;

-- 4. Update reactivate_user_account_v3 to use case-insensitive comparison
create or replace function public.reactivate_user_account_v3(
    email_to_reactivate text,
    reset_data boolean default false,
    p_first_name text default null,
    p_last_name text default null,
    p_company_name text default null,
    p_address_line text default null,
    p_city text default null,
    p_state text default null,
    p_zip_code text default null,
    p_country text default null,
    p_line_phone text default null,
    p_cell_phone text default null
)
returns boolean
language plpgsql
security definer set search_path = auth, public
as $$
declare
    v_user_id uuid;
    v_deleted_at timestamp with time zone;
    v_period integer;
begin
    -- 1. Find user in auth.users (case-insensitive)
    select id into v_user_id from auth.users where lower(email) = lower(email_to_reactivate);
    
    if v_user_id is null then
        return false;
    end if;

    -- 2. Get profile and quota info
    select p.deleted_at, q.reactivation_period_days 
    into v_deleted_at, v_period
    from public.profiles p
    join public.user_quotas q on q.user_id = p.id
    where p.id = v_user_id;

    -- 3. Check if reactivation is possible
    if v_deleted_at is not null then
        if not (v_period = -1 or now() < v_deleted_at + (v_period || ' days')::interval) then
            -- Exceeded grace period. 
            perform public.reset_user_data(v_user_id);
            update public.profiles set deleted_at = null where id = v_user_id;
        end if;
    end if;

    -- 4. Handle reset if requested
    if reset_data then
        perform public.reset_user_data(v_user_id);
    end if;

    -- 5. Reactivate and Update Profile
    update public.profiles 
    set 
        deleted_at = null,
        first_name = coalesce(p_first_name, first_name),
        last_name = coalesce(p_last_name, last_name),
        company_name = coalesce(p_company_name, company_name),
        address_line = coalesce(p_address_line, address_line),
        city = coalesce(p_city, city),
        state = coalesce(p_state, state),
        zip_code = coalesce(p_zip_code, zip_code),
        country = coalesce(p_country, country),
        line_phone = coalesce(p_line_phone, line_phone),
        cell_phone = coalesce(p_cell_phone, cell_phone)
    where id = v_user_id;
    
    return true;
end;
$$;

commit;
