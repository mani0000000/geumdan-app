insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('batch-cache', 'batch-cache', true, 5242880, array['application/json']::text[])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
