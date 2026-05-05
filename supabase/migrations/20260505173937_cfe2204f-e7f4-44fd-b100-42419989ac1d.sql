
create type public.chat_type as enum ('private','group');
create type public.member_role as enum ('admin','member');
create type public.message_type as enum ('text','image','audio','file');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  about text default 'Hey there! I am using Capitalize Chat.',
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles viewable by authenticated" on public.profiles for select to authenticated using (true);
create policy "users update own profile" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "users insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);

create table public.chats (
  id uuid primary key default gen_random_uuid(),
  type public.chat_type not null,
  name text,
  avatar_url text,
  description text,
  invite_code text unique,
  created_by uuid references auth.users(id) on delete set null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.chats enable row level security;

create table public.chat_members (
  chat_id uuid not null references public.chats(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (chat_id, user_id)
);
alter table public.chat_members enable row level security;

create or replace function public.is_chat_member(_chat_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.chat_members where chat_id = _chat_id and user_id = _user_id);
$$;

create or replace function public.is_chat_admin(_chat_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.chat_members where chat_id = _chat_id and user_id = _user_id and role = 'admin');
$$;

create policy "members view chats" on public.chats for select to authenticated using (public.is_chat_member(id, auth.uid()));
create policy "any auth can create chats" on public.chats for insert to authenticated with check (auth.uid() = created_by);
create policy "admins update chats" on public.chats for update to authenticated using (public.is_chat_admin(id, auth.uid()));

create policy "members view chat members" on public.chat_members for select to authenticated using (public.is_chat_member(chat_id, auth.uid()));
create policy "users join via insert" on public.chat_members for insert to authenticated with check (auth.uid() = user_id);
create policy "users leave own membership" on public.chat_members for delete to authenticated using (auth.uid() = user_id or public.is_chat_admin(chat_id, auth.uid()));

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  type public.message_type not null default 'text',
  content text,
  attachment_url text,
  edited boolean not null default false,
  deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.messages enable row level security;
create index messages_chat_idx on public.messages(chat_id, created_at);
create policy "members view messages" on public.messages for select to authenticated using (public.is_chat_member(chat_id, auth.uid()));
create policy "members insert messages" on public.messages for insert to authenticated with check (auth.uid() = sender_id and public.is_chat_member(chat_id, auth.uid()));
create policy "sender update own messages" on public.messages for update to authenticated using (auth.uid() = sender_id);
create policy "sender delete own messages" on public.messages for delete to authenticated using (auth.uid() = sender_id);

insert into public.chats (id, type, name, description, invite_code, is_default)
values ('11111111-1111-1111-1111-111111111111','group','Capitalize','Default group for everyone on Capitalize Chat','capitalize', true);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  insert into public.chat_members (chat_id, user_id, role)
  values ('11111111-1111-1111-1111-111111111111', new.id, 'member')
  on conflict do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger messages_updated before update on public.messages for each row execute function public.set_updated_at();

alter table public.messages replica identity full;
alter table public.chats replica identity full;
alter table public.chat_members replica identity full;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.chats;
alter publication supabase_realtime add table public.chat_members;
alter publication supabase_realtime add table public.profiles;

insert into storage.buckets (id, name, public) values
  ('avatars','avatars',true),
  ('attachments','attachments',true)
on conflict (id) do nothing;

create policy "avatar public read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatar auth upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "avatar auth update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "attach public read" on storage.objects for select using (bucket_id = 'attachments');
create policy "attach auth upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments' and auth.uid()::text = (storage.foldername(name))[1]);
