-- 0018_fix_rating_trigger_rls.sql
-- Fase 8 blocker found while testing the return leg: reviewing someone
-- ELSE never actually updated their profiles.average_rating/
-- total_reviews, because update_profile_rating(), refresh_owner_rating()
-- and on_item_review_change() were plain SECURITY INVOKER functions.
-- profiles_update_own only allows `auth.uid() = id`, so when a real
-- (non-service-role) user's review fired the trigger, the UPDATE
-- targeting the REVIEWEE's row matched zero rows under RLS — no error,
-- just silently never applied. Only a service-role write (e.g. manual
-- seeding) ever actually recomputed a rating.

create or replace function public.refresh_owner_rating(target_owner uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    average_rating = coalesce((
      select round(avg(rating)::numeric, 2) from (
        select rating from public.reviews where reviewee_id = target_owner
        union all
        select ir.rating
        from public.item_reviews ir
        join public.items i on i.id = ir.item_id
        where i.owner_id = target_owner
      ) combined
    ), 0),
    total_reviews = (
      select count(*) from (
        select 1 from public.reviews where reviewee_id = target_owner
        union all
        select 1
        from public.item_reviews ir
        join public.items i on i.id = ir.item_id
        where i.owner_id = target_owner
      ) combined
    )
  where id = target_owner;
end;
$$;

create or replace function public.update_profile_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_owner_rating(new.reviewee_id);
  return new;
end;
$$;

create or replace function public.on_item_review_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_owner uuid;
begin
  select owner_id into target_owner
  from public.items
  where id = coalesce(new.item_id, old.item_id);

  if target_owner is not null then
    perform public.refresh_owner_rating(target_owner);
  end if;

  return coalesce(new, old);
end;
$$;

-- Backfill: recompute every profile's rating now that the trigger
-- actually works, in case any pre-existing reviews were silently
-- dropped from the aggregate.
do $$
declare
  r record;
begin
  for r in select distinct reviewee_id as id from public.reviews
    union select distinct i.owner_id from public.item_reviews ir join public.items i on i.id = ir.item_id
  loop
    perform public.refresh_owner_rating(r.id);
  end loop;
end;
$$;
